import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    private readonly subscriptionsService: SubscriptionsService,
    private readonly openAi: OpenAiMockService,
  ) {}

  async ask(
    userId: string,
    dto: AskQuestionDto,
  ): Promise<ChatMessage & { remainingFreeMessages: number }> {
    const monthKey = currentMonthKey();
    let usageRow = await this.usage.findOne({
      where: { userId, monthKey },
    });
    if (!usageRow) {
      usageRow = await this.usage.save(
        this.usage.create({
          userId,
          monthKey,
          freeMessagesUsed: 0,
        }),
      );
    }

    let source: MessageSource;
    let bundleId: string | null = null;

    if (usageRow.freeMessagesUsed < FREE_MESSAGES_PER_MONTH) {
      usageRow.freeMessagesUsed += 1;
      await this.usage.save(usageRow);
      source = MessageSource.FREE_QUOTA;
    } else {
      const bundle =
        await this.subscriptionsService.findBundleForDeduction(userId);
      if (!bundle) {
        throw new QuotaExceededException({
          freeMessagesUsed: usageRow.freeMessagesUsed,
          freeMessagesLimit: FREE_MESSAGES_PER_MONTH,
        });
      }
      await this.subscriptionsService.deductOne(bundle.id);
      source = MessageSource.SUBSCRIPTION_BUNDLE;
      bundleId = bundle.id;
    }

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
      remainingFreeMessages: Math.max(
        0,
        FREE_MESSAGES_PER_MONTH - usageRow.freeMessagesUsed,
      ),
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
