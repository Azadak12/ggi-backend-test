import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { BillingCycle, BundleStatus, BundleTier } from './subscription.enums';

@Entity('subscription_bundles')
export class SubscriptionBundle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: BundleTier })
  tier: BundleTier;

  @Column({ type: 'enum', enum: BillingCycle })
  billingCycle: BillingCycle;

  @Column({ default: true })
  autoRenew: boolean;

  @Column({ type: 'int', nullable: true })
  maxMessages: number | null;

  /** Remaining responses in the current cycle. Null means unlimited (Enterprise). */
  @Column({ type: 'int', nullable: true })
  remainingMessages: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz' })
  endDate: Date;

  @Column({ type: 'timestamptz' })
  renewalDate: Date;

  @Column({ type: 'enum', enum: BundleStatus, default: BundleStatus.ACTIVE })
  status: BundleStatus;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
