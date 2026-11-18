import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createConversation(customerId: string, employeeProfileId: string) {
    const employee = await this.prisma.employeeProfile.findUnique({
      where: { id: employeeProfileId },
      select: { userId: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (employee.userId === customerId) {
      throw new BadRequestException(
        'You cannot start a conversation with yourself',
      );
    }

    const where = {
      customerId_employeeId: {
        customerId,
        employeeId: employee.userId,
      },
    };
    const existing = await this.prisma.conversation.findUnique({ where });
    if (existing) {
      return { conversation: existing, created: false };
    }

    try {
      const conversation = await this.prisma.conversation.create({
        data: { customerId, employeeId: employee.userId },
      });
      return { conversation, created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const conversation = await this.prisma.conversation.findUnique({
          where,
        });
        if (conversation) {
          return { conversation, created: false };
        }
      }

      throw error;
    }
  }

  async listConversations(userId: string, page: number, limit: number) {
    const where: Prisma.ConversationWhereInput = {
      OR: [{ customerId: userId }, { employeeId: userId }],
    };
    const [conversations, total] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where,
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { id: true, name: true } },
          employee: { select: { id: true, name: true } },
          messages: {
            take: 1,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            include: { sender: { select: { id: true, name: true } } },
          },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      items: conversations.map((conversation) => ({
        id: conversation.id,
        createdAt: conversation.createdAt,
        lastMessageAt: conversation.lastMessageAt,
        participant:
          conversation.customerId === userId
            ? conversation.employee
            : conversation.customer,
        lastMessage: conversation.messages[0] ?? null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listMessages(
    userId: string,
    conversationId: string,
    limit: number,
    before?: Date,
  ) {
    await this.assertConversationMember(userId, conversationId);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(before && { createdAt: { lt: before } }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { sender: { select: { id: true, name: true } } },
    });
    const hasMore = messages.length > limit;

    return { items: messages.slice(0, limit), hasMore };
  }

  async sendMessage(userId: string, conversationId: string, text: string) {
    const trimmedText = text.trim();
    if (trimmedText.length < 1 || trimmedText.length > 2000) {
      throw new BadRequestException(
        'Message text must be 1 to 2000 characters',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true, customerId: true, employeeId: true },
      });
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
      if (
        conversation.customerId !== userId &&
        conversation.employeeId !== userId
      ) {
        throw new ForbiddenException(
          'You are not a member of this conversation',
        );
      }

      const message = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          text: trimmedText,
        },
        include: { sender: { select: { id: true, name: true } } },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt },
      });

      return {
        message,
        customerId: conversation.customerId,
        employeeId: conversation.employeeId,
      };
    });

    const recipientId =
      result.customerId === userId ? result.employeeId : result.customerId;
    this.eventEmitter.emit('chat.messageCreated', {
      conversationId,
      messageId: result.message.id,
      senderId: userId,
      recipientId,
      text: trimmedText,
    });

    return result;
  }

  private async assertConversationMember(
    userId: string,
    conversationId: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { customerId: true, employeeId: true },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (
      conversation.customerId !== userId &&
      conversation.employeeId !== userId
    ) {
      throw new ForbiddenException('You are not a member of this conversation');
    }
  }
}
