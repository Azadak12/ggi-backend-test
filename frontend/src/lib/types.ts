export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hasPassword: boolean;
  createdAt: string;
}

export interface AdminUserRow extends User {
  activeBundles: number;
  totalMessages: number;
  freeMessagesUsedThisMonth: number;
}

export interface AdminOverview {
  totalUsers: number;
  activeSubscriptions: number;
  subscriptionsByTier: Partial<Record<BundleTier, number>>;
  totalRevenue: number;
  messagesThisMonth: number;
  messagesTotal: number;
}

export type BundleTier = 'BASIC' | 'PRO' | 'ENTERPRISE';
export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type BundleStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export interface SubscriptionBundle {
  id: string;
  userId: string;
  tier: BundleTier;
  billingCycle: BillingCycle;
  autoRenew: boolean;
  maxMessages: number | null;
  remainingMessages: number | null;
  price: string;
  startDate: string;
  endDate: string;
  renewalDate: string;
  status: BundleStatus;
  cancelledAt: string | null;
  createdAt: string;
}

export type BillingEventType =
  | 'CREATED'
  | 'RENEWAL_SUCCESS'
  | 'RENEWAL_FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface BillingHistoryEntry {
  id: string;
  bundleId: string;
  userId: string;
  event: BillingEventType;
  amount: string | null;
  note: string;
  createdAt: string;
}

export type MessageSource = 'FREE_QUOTA' | 'SUBSCRIPTION_BUNDLE';

export interface ChatMessage {
  id: string;
  userId: string;
  question: string;
  answer: string;
  tokens: number;
  source: MessageSource;
  bundleId: string | null;
  createdAt: string;
  remainingFreeMessages?: number;
}

export interface UsageSummary {
  monthKey: string;
  freeMessagesUsed: number;
  freeMessagesLimit: number;
  remainingFreeMessages: number;
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  path: string;
  timestamp: string;
}
