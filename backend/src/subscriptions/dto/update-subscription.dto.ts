import { IsBoolean } from 'class-validator';

export class ToggleAutoRenewDto {
  @IsBoolean()
  autoRenew: boolean;
}
