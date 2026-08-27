import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  // Seeds a demo admin user on boot, with a password (unlike regular
  // picker users) so switching into it requires that password.
  async onModuleInit() {
    const email = this.config.get<string>('admin.email');
    if (!email) return;

    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) return;

    const name = this.config.get<string>('admin.name') ?? 'Admin';
    const password = this.config.get<string>('admin.password');
    const passwordHash = password
      ? await bcrypt.hash(password, SALT_ROUNDS)
      : null;

    await this.usersRepository.save(
      this.usersRepository.create({
        name,
        email,
        role: UserRole.ADMIN,
        passwordHash,
      }),
    );
    this.logger.log(`Seeded admin account for ${email}`);
  }

  create(dto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create({
      ...dto,
      role: UserRole.USER,
      passwordHash: null,
    });
    return this.usersRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'ASC' } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findOneOrFail(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async requireAdmin(id: string): Promise<User> {
    const user = await this.findOneOrFail(id);
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return user;
  }

  async verifyPassword(id: string, password: string): Promise<void> {
    const user = await this.findOneOrFail(id);
    if (!user.passwordHash) {
      // No password set on this account: nothing to verify against.
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Incorrect password');
    }
  }

  count(): Promise<number> {
    return this.usersRepository.count();
  }
}
