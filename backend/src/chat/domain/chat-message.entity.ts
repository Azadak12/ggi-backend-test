import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MessageSource } from './chat.enums';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'int' })
  tokens: number;

  @Column({ type: 'enum', enum: MessageSource })
  source: MessageSource;

  /** Which bundle usage was deducted from, when source is SUBSCRIPTION_BUNDLE. */
  @Column({ nullable: true })
  bundleId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
