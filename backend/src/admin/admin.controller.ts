import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
  ) {}

  @Get('overview')
  async overview(@Query('userId') userId: string) {
    await this.usersService.requireAdmin(userId);
    return this.adminService.overview();
  }

  @Get('users')
  async users(@Query('userId') userId: string) {
    await this.usersService.requireAdmin(userId);
    return this.adminService.users();
  }

  @Get('subscriptions')
  async subscriptions(@Query('userId') userId: string) {
    await this.usersService.requireAdmin(userId);
    return this.adminService.subscriptions();
  }

  @Get('billing-history')
  async billingHistory(@Query('userId') userId: string) {
    await this.usersService.requireAdmin(userId);
    return this.adminService.billingHistory();
  }
}
