import {
  Ack,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { HttpException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Server, Socket } from 'socket.io';
import { env } from 'src/config/env';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

type MessageAcknowledgement =
  { ok: true; message: unknown } | { ok: false; error: string };

@Injectable()
@WebSocketGateway({
  cors: { origin: env.frontendUrl, credentials: true },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  afterInit(server: Server) {
    server.use((socket, next) => {
      const token: unknown = socket.handshake.auth?.token;
      if (typeof token !== 'string' || token.length === 0) {
        next(new Error('unauthorized'));
        return;
      }

      try {
        const payload = this.jwtService.verify<{ sub?: unknown }>(token, {
          secret: env.jwtAccessSecret,
        });
        if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
          next(new Error('unauthorized'));
          return;
        }

        const socketData: unknown = socket.data;
        if (typeof socketData !== 'object' || socketData === null) {
          next(new Error('unauthorized'));
          return;
        }
        Object.assign(socketData, { userId: payload.sub });
        next();
      } catch {
        next(new Error('unauthorized'));
      }
    });
  }

  async handleConnection(client: Socket) {
    const userId = this.getSocketUserId(client);
    if (!userId) {
      client.disconnect(true);
      return;
    }
    await client.join(this.userRoom(userId));
  }

  @SubscribeMessage('message:send')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
    @Ack()
    acknowledge: ((response: MessageAcknowledgement) => void) | undefined,
  ) {
    const respond = (response: MessageAcknowledgement) =>
      acknowledge?.(response);

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      respond({ ok: false, error: 'Invalid message payload' });
      return;
    }

    const dto = plainToInstance(SendMessageDto, payload);
    const validationErrors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (validationErrors.length > 0) {
      respond({ ok: false, error: 'Invalid message payload' });
      return;
    }

    const userId = this.getSocketUserId(client);
    if (!userId) {
      respond({ ok: false, error: 'unauthorized' });
      return;
    }

    try {
      const result = await this.chatService.sendMessage(
        userId,
        dto.conversationId,
        dto.text,
      );
      this.server
        .to(this.userRoom(result.customerId))
        .to(this.userRoom(result.employeeId))
        .emit('message:new', result.message);
      respond({ ok: true, message: result.message });
    } catch (error) {
      respond({
        ok: false,
        error:
          error instanceof HttpException
            ? error.message
            : 'Unable to send message',
      });
    }
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private getSocketUserId(socket: Socket): string | undefined {
    const data: unknown = socket.data;
    if (typeof data !== 'object' || data === null || !('userId' in data)) {
      return undefined;
    }
    return typeof data.userId === 'string' ? data.userId : undefined;
  }
}
