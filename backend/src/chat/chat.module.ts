import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './domain/chat-message.entity';
import { MonthlyUsage } from './domain/monthly-usage.entity';
import { ChatService } from './chat.service';
import { OpenAiMockService } from './openai-mock.service';
import { ChatController } from './chat.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, MonthlyUsage]),
    SubscriptionsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, OpenAiMockService],
  exports: [ChatService],
})
export class ChatModule {}
