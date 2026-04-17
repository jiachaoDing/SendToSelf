import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CreateLinkMessageDto } from './dto/create-link-message.dto';
import { CreateTextMessageDto } from './dto/create-text-message.dto';
import { MessagesService } from './messages.service';

@UseGuards(SessionAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('text')
  createText(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateTextMessageDto,
  ) {
    return this.messagesService.createTextMessage(
      request.auth.deviceId,
      body.text,
    );
  }

  @Post('link')
  createLink(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateLinkMessageDto,
  ) {
    return this.messagesService.createLinkMessage(
      request.auth.deviceId,
      body.url,
    );
  }
}
