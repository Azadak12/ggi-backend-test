import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { AskQuestionDto } from './dto/ask-question.dto';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  ask(@Body() dto: AskQuestionDto) {
    return this.chatService.ask(dto.userId, dto);
  }

  @Get('history')
  history(@Query('userId') userId: string) {
    return this.chatService.history(userId);
  }

  @Get('usage')
  usage(@Query('userId') userId: string) {
    return this.chatService.usageSummary(userId);
  }
}
