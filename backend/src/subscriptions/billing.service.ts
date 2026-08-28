import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SubscriptionBundle } from './domain/subscription-bundle.entity';
import { BillingHistory } from './domain/billing-history.entity';
import { BillingEventType, BundleStatus } from './domain/subscription.enums';
import { addCycle, maxMessagesFor, priceFor } from './domain/pricing';

// Mocked payment gateway: renewals fail this often, purely for demo purposes.
const PAYMENT_FAILURE_RATE = 0.15;

export interface BillingRunResult {
  processed: number;
  renewed: number;
  paymentFailed: number;
  expired: number;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // Runs once a day; also exposed as a manual endpoint so the behaviour can
  // be demoed without waiting for a real billing-cycle boundary.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyBillingRun(): Promise<BillingRunResult> {
    return this.runDueBundles();
  }

  /**
   * Idempotency under concurrent/retried calls: if this endpoint is hit
   * twice within seconds (e.g. a client retries because the first response
   * was slow, or two admins click "Run billing cycle" at once), the second
   * call must NOT re-renew the same bundle — that would double-charge and
   * push `endDate` forward by two cycles instead of one.
   *
   * `SELECT ... FOR UPDATE SKIP LOCKED` handles this: each concurrent run
   * locks the due bundles it manages to grab, and any bundle a *different*
   * concurrent run already has locked is simply skipped rather than waited
   * on or double-processed. A bundle a run does process gets its `endDate`
   * pushed into the future as part of the same transaction, so even a
   * purely sequential retry (first call already committed) naturally won't
   * see it as "due" again — the SKIP LOCKED case is specifically for the
   * overlapping-in-time window.
   */
  async runDueBundles(): Promise<BillingRunResult> {
    return this.dataSource.transaction(async (manager) => {
      const bundleRepo = manager.getRepository(SubscriptionBundle);
      const historyRepo = manager.getRepository(BillingHistory);
      const now = new Date();

      const due = await bundleRepo
        .createQueryBuilder('b')
        .where('b.status = :status', { status: BundleStatus.ACTIVE })
        .andWhere('b.endDate <= :now', { now })
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();

      const result: BillingRunResult = {
        processed: 0,
        renewed: 0,
        paymentFailed: 0,
        expired: 0,
      };

      for (const bundle of due) {
        result.processed += 1;

        if (bundle.autoRenew) {
          const paymentSucceeded = Math.random() >= PAYMENT_FAILURE_RATE;

          if (paymentSucceeded) {
            bundle.startDate = bundle.endDate;
            bundle.endDate = addCycle(bundle.endDate, bundle.billingCycle);
            bundle.renewalDate = bundle.endDate;
            bundle.price = priceFor(bundle.tier, bundle.billingCycle);
            bundle.maxMessages = maxMessagesFor(bundle.tier);
            bundle.remainingMessages = bundle.maxMessages;
            bundle.status = BundleStatus.ACTIVE;
            await bundleRepo.save(bundle);

            await historyRepo.save(
              historyRepo.create({
                bundleId: bundle.id,
                userId: bundle.userId,
                event: BillingEventType.RENEWAL_SUCCESS,
                amount: bundle.price,
                note: 'Auto-renewal charge succeeded',
              }),
            );
            result.renewed += 1;
          } else {
            bundle.status = BundleStatus.INACTIVE;
            await bundleRepo.save(bundle);

            await historyRepo.save(
              historyRepo.create({
                bundleId: bundle.id,
                userId: bundle.userId,
                event: BillingEventType.RENEWAL_FAILED,
                amount: bundle.price,
                note: 'Simulated payment failure on renewal',
              }),
            );
            result.paymentFailed += 1;
          }
        } else {
          bundle.status = BundleStatus.EXPIRED;
          await bundleRepo.save(bundle);

          await historyRepo.save(
            historyRepo.create({
              bundleId: bundle.id,
              userId: bundle.userId,
              event: BillingEventType.EXPIRED,
              note: 'Billing cycle ended with auto-renew off',
            }),
          );
          result.expired += 1;
        }
      }

      if (result.processed > 0) {
        this.logger.log(
          `Billing run: ${result.processed} due, ${result.renewed} renewed, ` +
            `${result.paymentFailed} payment-failed, ${result.expired} expired`,
        );
      }

      return result;
    });
  }
}
