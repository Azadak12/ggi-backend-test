import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { SubscriptionBundle } from './domain/subscription-bundle.entity';
import { BillingHistory } from './domain/billing-history.entity';
import { BillingEventType, BundleStatus } from './domain/subscription.enums';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { addCycle, maxMessagesFor, priceFor } from './domain/pricing';
import {
  SubscriptionAlreadyCancelledException,
  SubscriptionNotFoundException,
} from './domain/subscription.errors';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionBundle)
    private readonly bundles: Repository<SubscriptionBundle>,
    @InjectRepository(BillingHistory)
    private readonly history: Repository<BillingHistory>,
  ) {}

  async create(
    userId: string,
    dto: CreateSubscriptionDto,
  ): Promise<SubscriptionBundle> {
    const now = new Date();
    const maxMessages = maxMessagesFor(dto.tier);
    const bundle = this.bundles.create({
      userId,
      tier: dto.tier,
      billingCycle: dto.billingCycle,
      autoRenew: dto.autoRenew ?? true,
      maxMessages,
      remainingMessages: maxMessages,
      price: priceFor(dto.tier, dto.billingCycle),
      startDate: now,
      endDate: addCycle(now, dto.billingCycle),
      renewalDate: addCycle(now, dto.billingCycle),
      status: BundleStatus.ACTIVE,
    });
    const saved = await this.bundles.save(bundle);

    await this.history.save(
      this.history.create({
        bundleId: saved.id,
        userId: saved.userId,
        event: BillingEventType.CREATED,
        amount: saved.price,
        note: `${dto.tier} / ${dto.billingCycle} bundle created`,
      }),
    );

    return saved;
  }

  findAllForUser(userId: string): Promise<SubscriptionBundle[]> {
    return this.bundles.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  findAll(): Promise<SubscriptionBundle[]> {
    return this.bundles.find({ order: { createdAt: 'DESC' } });
  }

  historyAll(): Promise<BillingHistory[]> {
    return this.history.find({ order: { createdAt: 'DESC' }, take: 200 });
  }

  countActive(): Promise<number> {
    return this.bundles.count({ where: { status: BundleStatus.ACTIVE } });
  }

  async activeCountsByTier(): Promise<Record<string, number>> {
    const rows = await this.bundles
      .createQueryBuilder('b')
      .select('b.tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .where('b.status = :status', { status: BundleStatus.ACTIVE })
      .groupBy('b.tier')
      .getRawMany<{ tier: string; count: string }>();
    return Object.fromEntries(rows.map((r) => [r.tier, parseInt(r.count, 10)]));
  }

  async totalRevenue(): Promise<number> {
    const { sum } = await this.history
      .createQueryBuilder('h')
      .select('COALESCE(SUM(h.amount), 0)', 'sum')
      .where('h.event IN (:...events)', {
        events: [BillingEventType.CREATED, BillingEventType.RENEWAL_SUCCESS],
      })
      .getRawOne<{ sum: string }>();
    return parseFloat(sum);
  }

  async activeBundleCountsByUser(): Promise<Map<string, number>> {
    const rows = await this.bundles
      .createQueryBuilder('b')
      .select('b.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('b.status = :status', { status: BundleStatus.ACTIVE })
      .groupBy('b.userId')
      .getRawMany<{ userId: string; count: string }>();
    return new Map(rows.map((r) => [r.userId, parseInt(r.count, 10)]));
  }

  async findOneOrFail(id: string): Promise<SubscriptionBundle> {
    const bundle = await this.bundles.findOne({ where: { id } });
    if (!bundle) {
      throw new SubscriptionNotFoundException(id);
    }
    return bundle;
  }

  historyForUser(userId: string): Promise<BillingHistory[]> {
    return this.history.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Ends the subscription's usage rights at the close of the *current*
   * billing cycle: it stays ACTIVE (and usable) until `endDate`, but
   * auto-renew is switched off so the billing job expires it instead of
   * renewing it. Usage history is never deleted.
   */
  async cancel(id: string): Promise<SubscriptionBundle> {
    const bundle = await this.findOneOrFail(id);
    if (bundle.cancelledAt) {
      throw new SubscriptionAlreadyCancelledException(id);
    }
    bundle.autoRenew = false;
    bundle.cancelledAt = new Date();
    const saved = await this.bundles.save(bundle);

    await this.history.save(
      this.history.create({
        bundleId: saved.id,
        userId: saved.userId,
        event: BillingEventType.CANCELLED,
        note: 'Cancelled by user; active until end of current cycle',
      }),
    );

    return saved;
  }

  async setAutoRenew(
    id: string,
    autoRenew: boolean,
  ): Promise<SubscriptionBundle> {
    const bundle = await this.findOneOrFail(id);
    bundle.autoRenew = autoRenew;
    if (autoRenew) {
      bundle.cancelledAt = null;
    }
    return this.bundles.save(bundle);
  }

  /**
   * Picks which of the user's active bundles to deduct a message from.
   * Interpretation of "the bundle with the latest remaining quota": the
   * bundle currently holding the *largest* remaining balance is used first
   * (unlimited/Enterprise counts as infinite), so a user is never left
   * burning through a small bundle while a roomier one sits untouched.
   */
  async findBundleForDeduction(
    userId: string,
  ): Promise<SubscriptionBundle | null> {
    const now = new Date();
    const active = await this.bundles.find({
      where: { userId, status: BundleStatus.ACTIVE, endDate: MoreThan(now) },
    });

    const withQuota = active.filter(
      (b) => b.remainingMessages === null || b.remainingMessages > 0,
    );
    if (withQuota.length === 0) return null;

    withQuota.sort((a, b) => {
      const aVal =
        a.remainingMessages === null ? Infinity : a.remainingMessages;
      const bVal =
        b.remainingMessages === null ? Infinity : b.remainingMessages;
      return bVal - aVal;
    });

    return withQuota[0];
  }

  async deductOne(bundleId: string): Promise<void> {
    const bundle = await this.findOneOrFail(bundleId);
    if (bundle.remainingMessages !== null) {
      bundle.remainingMessages -= 1;
      await this.bundles.save(bundle);
    }
  }
}
