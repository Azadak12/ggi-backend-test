import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BillingEventType } from './subscription.enums';

/**
 * Append-only ledger of everything that happened to a bundle. Kept even
 * after a bundle is cancelled/expired so usage history is preserved.
 */
@Entity('billing_history')
export class BillingHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  bundleId: string;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'enum', enum: BillingEventType })
  event: BillingEventType;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  amount: number | null;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}
