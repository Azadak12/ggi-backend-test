import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from './user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  /**
   * Null for regular users created via the picker (no password, by design).
   * Set for the seeded admin account so switching into it in the picker
   * requires a password instead of a single click.
   */
  @Column({ type: 'text', nullable: true })
  passwordHash: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
