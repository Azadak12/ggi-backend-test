import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { BillingCycle, BundleTier } from '../domain/subscription.enums';

export class CreateSubscriptionDto {
  @IsUUID()
  userId: string;

  @IsEnum(BundleTier)
  tier: BundleTier;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean = true;
}
