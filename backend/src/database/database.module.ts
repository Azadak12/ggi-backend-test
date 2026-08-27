import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const url = config.get<string>('database.url');
        const base = {
          type: 'postgres' as const,
          autoLoadEntities: true,
          // Demo/take-home project: schema is kept in sync automatically
          // instead of via migrations so the app boots against a fresh
          // database with no extra setup step.
          synchronize: true,
        };

        // Hosted platforms (Render, Railway, etc.) provide a single
        // connection string; local dev uses discrete DB_* vars instead.
        if (url) {
          return { ...base, url, ssl: { rejectUnauthorized: false } };
        }

        return {
          ...base,
          host: config.get<string>('database.host'),
          port: config.get<number>('database.port'),
          username: config.get<string>('database.username'),
          password: config.get<string>('database.password'),
          database: config.get<string>('database.name'),
        };
      },
    }),
  ],
})
export class DatabaseModule {}
