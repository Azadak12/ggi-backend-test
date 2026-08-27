import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { BillingService } from './billing.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ToggleAutoRenewDto } from './dto/update-subscription.dto';
import { UsersService } from '../users/users.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly billingService: BillingService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(dto.userId, dto);
  }

  @Get()
  findAllForUser(@Query('userId') userId: string) {
    return this.subscriptionsService.findAllForUser(userId);
  }

  @Get('history')
  history(@Query('userId') userId: string) {
    return this.subscriptionsService.historyForUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOneOrFail(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.subscriptionsService.cancel(id);
  }

  @Patch(':id/auto-renew')
  toggleAutoRenew(@Param('id') id: string, @Body() dto: ToggleAutoRenewDto) {
    return this.subscriptionsService.setAutoRenew(id, dto.autoRenew);
  }

  // Affects every user's bundles at once, so it still requires the caller
  // to identify as an ADMIN user (checked against the DB, no session token
  // in this dev-picker model).
  @Post('billing/run')
  async runBilling(@Query('userId') userId: string) {
    await this.usersService.requireAdmin(userId);
    return this.billingService.runDueBundles();
  }
}
