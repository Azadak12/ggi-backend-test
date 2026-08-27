import { IsNotEmpty } from 'class-validator';

export class VerifyPasswordDto {
  @IsNotEmpty()
  password: string;
}
