import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { NotificationsService } from './notifications.service';

type AuthRequest = Request & { user: { userId: string } };

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Query() query: PaginationDto, @Req() req: AuthRequest) {
    return this.notificationsService.list(req.user.userId, query);
  }

  @Get('unread-count')
  unreadCount(@Req() req: AuthRequest) {
    return this.notificationsService.unreadCount(req.user.userId);
  }

  @Patch('read-all')
  markAllRead(@Req() req: AuthRequest) {
    return this.notificationsService.markAllRead(req.user.userId);
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    return this.notificationsService.markRead(req.user.userId, id);
  }
}
