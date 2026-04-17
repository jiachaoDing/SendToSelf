import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { DevicesService } from '../devices/devices.service';
import { MessagesService } from '../messages/messages.service';

class TimelineQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  after?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  before?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

const DEFAULT_TIMELINE_PAGE_SIZE = 50;

@UseGuards(SessionAuthGuard)
@Controller('timeline')
export class SyncController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly devicesService: DevicesService,
  ) {}

  @Get()
  async getTimeline(
    @Req() request: AuthenticatedRequest,
    @Query() query: TimelineQueryDto,
  ) {
    if (query.after !== undefined && query.before !== undefined) {
      throw new BadRequestException('after and before cannot be used together');
    }

    await this.devicesService.touch(request.auth.deviceId);
    const shouldPaginateHistory =
      query.before !== undefined || query.after === undefined;
    const limit =
      query.limit ??
      (shouldPaginateHistory ? DEFAULT_TIMELINE_PAGE_SIZE : undefined);
    const { items, hasMore } = await this.messagesService.listTimeline({
      after: query.after,
      before: query.before,
      limit,
    });

    return {
      items,
      nextCursor: items.length
        ? items[items.length - 1].id
        : (query.after ?? null),
      hasMore,
    };
  }
}
