import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { toPublicUser } from '../users/user.mapper';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly chatService: ChatService,
  ) {}

  async overview() {
    const [
      totalUsers,
      activeSubscriptions,
      subscriptionsByTier,
      totalRevenue,
      messagesThisMonth,
      messagesTotal,
    ] = await Promise.all([
      this.usersService.count(),
      this.subscriptionsService.countActive(),
      this.subscriptionsService.activeCountsByTier(),
      this.subscriptionsService.totalRevenue(),
      this.chatService.messageCountThisMonth(),
      this.chatService.totalMessageCount(),
    ]);

    return {
      totalUsers,
      activeSubscriptions,
      subscriptionsByTier,
      totalRevenue,
      messagesThisMonth,
      messagesTotal,
    };
  }

  async users() {
    const [users, activeBundleCounts, messageCounts, freeUsageThisMonth] =
      await Promise.all([
        this.usersService.findAll(),
        this.subscriptionsService.activeBundleCountsByUser(),
        this.chatService.messageCountsByUser(),
        this.chatService.freeUsageThisMonthByUser(),
      ]);

    return users.map((user) => ({
      ...toPublicUser(user),
      activeBundles: activeBundleCounts.get(user.id) ?? 0,
      totalMessages: messageCounts.get(user.id) ?? 0,
      freeMessagesUsedThisMonth: freeUsageThisMonth.get(user.id) ?? 0,
    }));
  }

  subscriptions() {
    return this.subscriptionsService.findAll();
  }

  billingHistory() {
    return this.subscriptionsService.historyAll();
  }
}
