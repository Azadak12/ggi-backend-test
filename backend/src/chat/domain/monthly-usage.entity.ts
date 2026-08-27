import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * One row per (user, calendar month). Free-quota "reset on the 1st" falls
 * out naturally: a new month means a new `monthKey`, so there is nothing to
 * reset — a fresh row with `freeMessagesUsed = 0` is created on demand.
 */
@Entity('monthly_usage')
@Unique(['userId', 'monthKey'])
export class MonthlyUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  /** Format: YYYY-MM, e.g. "2026-08". */
  @Column()
  monthKey: string;

  @Column({ type: 'int', default: 0 })
  freeMessagesUsed: number;
}
