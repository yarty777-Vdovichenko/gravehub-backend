import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationMessagesQueryDto } from './dto/conversation-messages-query.dto';

type AuthRequest = Request & { user: { userId: string } };

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('conversations')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @Roles('customer')
  @ApiOperation({
    summary: 'Start or retrieve a conversation with an employee',
  })
  @ApiCreatedResponse({ description: 'Conversation created' })
  @ApiOkResponse({ description: 'Existing conversation returned' })
  async create(
    @Body() dto: CreateConversationDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.chatService.createConversation(
      req.user.userId,
      dto.employeeProfileId,
    );
    res.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result.conversation;
  }

  @Post('by-contract/:contractId')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Open (or create) the conversation between the customer and the employee of a contract',
  })
  openForContract(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Req() req: AuthRequest,
  ) {
    return this.chatService.openForContract(req.user.userId, contractId);
  }

  @Post('by-proposal/:proposalId')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Open (or create) the conversation between the customer and the author of a proposal',
  })
  openForProposal(
    @Param('proposalId', ParseUUIDPipe) proposalId: string,
    @Req() req: AuthRequest,
  ) {
    return this.chatService.openForProposal(req.user.userId, proposalId);
  }

  @Get()
  @ApiOperation({ summary: 'List the current user conversations' })
  list(@Query() query: PaginationDto, @Req() req: AuthRequest) {
    return this.chatService.listConversations(
      req.user.userId,
      query.page,
      query.limit,
    );
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'List messages in a conversation' })
  listMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ConversationMessagesQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.chatService.listMessages(
      req.user.userId,
      id,
      query.limit,
      query.before ? new Date(query.before) : undefined,
    );
  }
}
