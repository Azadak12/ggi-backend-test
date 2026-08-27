import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionBundle } from './domain/subscription-bundle.entity';
import { BillingHistory } from './domain/billing-history.entity';
import { SubscriptionsService } from './subscriptions.service';
import { BillingService } from './billing.service';
import { SubscriptionsController } from './subscriptions.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionBundle, BillingHistory]),
    UsersModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, BillingService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
