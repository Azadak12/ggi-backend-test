import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [UsersModule, SubscriptionsModule, ChatModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
