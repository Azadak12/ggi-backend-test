import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { toPublicUser } from './user.mapper';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return toPublicUser(user);
  }

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map(toPublicUser);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOneOrFail(id);
    return toPublicUser(user);
  }

  // Gates switching into a password-protected account (currently just the
  // seeded admin) from the picker. Accounts without a password always pass.
  @HttpCode(200)
  @Post(':id/verify-password')
  async verifyPassword(
    @Param('id') id: string,
    @Body() dto: VerifyPasswordDto,
  ) {
    await this.usersService.verifyPassword(id, dto.password);
    return { valid: true };
  }
}
