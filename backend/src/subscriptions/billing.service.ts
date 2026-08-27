import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
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

  constructor(
    @InjectRepository(SubscriptionBundle)
    private readonly bundles: Repository<SubscriptionBundle>,
    @InjectRepository(BillingHistory)
    private readonly history: Repository<BillingHistory>,
  ) {}

  // Runs once a day; also exposed as a manual endpoint so the behaviour can
  // be demoed without waiting for a real billing-cycle boundary.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyBillingRun(): Promise<BillingRunResult> {
    return this.runDueBundles();
  }

  async runDueBundles(): Promise<BillingRunResult> {
    const now = new Date();
    const due = await this.bundles.find({
      where: { status: BundleStatus.ACTIVE, endDate: LessThanOrEqual(now) },
    });

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
          await this.bundles.save(bundle);

          await this.history.save(
            this.history.create({
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
          await this.bundles.save(bundle);

          await this.history.save(
            this.history.create({
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
        await this.bundles.save(bundle);

        await this.history.save(
          this.history.create({
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
  }
}
