import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ChatMessage } from './domain/chat-message.entity';
import { MonthlyUsage } from './domain/monthly-usage.entity';
import { FREE_MESSAGES_PER_MONTH, MessageSource } from './domain/chat.enums';
import { QuotaExceededException } from './domain/chat.errors';
import { OpenAiMockService } from './openai-mock.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AskQuestionDto } from './dto/ask-question.dto';

function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messages: Repository<ChatMessage>,
    @InjectRepository(MonthlyUsage)
    private readonly usage: Repository<MonthlyUsage>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly openAi: OpenAiMockService,
  ) {}

  /**
   * The quota check-and-deduct step runs as its own short transaction, row
   * locked, so two concurrent requests from the same user (double-click,
   * two tabs) can't both read "quota available" before either has written —
   * a classic lost-update race that would otherwise let a user with 1 free
   * message left send 2 messages for the price of 1, or two concurrent
   * requests both land on the same bundle credit. The (slow, mocked) AI
   * call happens *after* this transaction commits, so we're not holding a
   * DB row lock for the ~300-900ms of "thinking".
   */
  async ask(
    userId: string,
    dto: AskQuestionDto,
  ): Promise<ChatMessage & { remainingFreeMessages: number }> {
    const monthKey = currentMonthKey();

    const { source, bundleId, remainingFreeMessages } =
      await this.dataSource.transaction(async (manager) => {
        const usageRepo = manager.getRepository(MonthlyUsage);

        // Ensure the row exists (no-op if a concurrent request just created
        // it), then lock it — SELECT ... FOR UPDATE blocks until any other
        // in-flight transaction for this same user+month has committed.
        await usageRepo
          .createQueryBuilder()
          .insert()
          .values({ userId, monthKey, freeMessagesUsed: 0 })
          .orIgnore()
          .execute();

        const usageRow = await usageRepo.findOneOrFail({
          where: { userId, monthKey },
          lock: { mode: 'pessimistic_write' },
        });

        if (usageRow.freeMessagesUsed < FREE_MESSAGES_PER_MONTH) {
          usageRow.freeMessagesUsed += 1;
          await usageRepo.save(usageRow);
          return {
            source: MessageSource.FREE_QUOTA,
            bundleId: null as string | null,
            remainingFreeMessages:
              FREE_MESSAGES_PER_MONTH - usageRow.freeMessagesUsed,
          };
        }

        const bundle = await this.subscriptionsService.deductForUsage(
          manager,
          userId,
        );
        if (!bundle) {
          throw new QuotaExceededException({
            freeMessagesUsed: usageRow.freeMessagesUsed,
            freeMessagesLimit: FREE_MESSAGES_PER_MONTH,
          });
        }

        return {
          source: MessageSource.SUBSCRIPTION_BUNDLE,
          bundleId: bundle.id,
          remainingFreeMessages: 0,
        };
      });

    const completion = await this.openAi.complete(dto.question);

    const saved = await this.messages.save(
      this.messages.create({
        userId,
        question: dto.question,
        answer: completion.answer,
        tokens: completion.tokens,
        source,
        bundleId,
      }),
    );

    return {
      ...saved,
      remainingFreeMessages: Math.max(0, remainingFreeMessages),
    };
  }

  history(userId: string): Promise<ChatMessage[]> {
    return this.messages.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async usageSummary(userId: string) {
    const monthKey = currentMonthKey();
    const usageRow = await this.usage.findOne({ where: { userId, monthKey } });
    const freeMessagesUsed = usageRow?.freeMessagesUsed ?? 0;

    return {
      monthKey,
      freeMessagesUsed,
      freeMessagesLimit: FREE_MESSAGES_PER_MONTH,
      remainingFreeMessages: Math.max(
        0,
        FREE_MESSAGES_PER_MONTH - freeMessagesUsed,
      ),
    };
  }

  totalMessageCount(): Promise<number> {
    return this.messages.count();
  }

  messageCountThisMonth(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return this.messages
      .createQueryBuilder('m')
      .where('m.createdAt >= :start', { start: startOfMonth })
      .getCount();
  }

  async messageCountsByUser(): Promise<Map<string, number>> {
    const rows = await this.messages
      .createQueryBuilder('m')
      .select('m.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('m.userId')
      .getRawMany<{ userId: string; count: string }>();
    return new Map(rows.map((r) => [r.userId, parseInt(r.count, 10)]));
  }

  async freeUsageThisMonthByUser(): Promise<Map<string, number>> {
    const monthKey = currentMonthKey();
    const rows = await this.usage.find({ where: { monthKey } });
    return new Map(rows.map((r) => [r.userId, r.freeMessagesUsed]));
  }
}
