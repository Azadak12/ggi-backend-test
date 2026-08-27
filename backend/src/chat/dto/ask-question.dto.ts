import { IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

export class AskQuestionDto {
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @MaxLength(4000)
  question: string;
}
