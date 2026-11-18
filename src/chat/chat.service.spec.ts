import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatService } from './chat.service';

describe('ChatService sendMessage', () => {
  const findConversation = jest.fn();
  const createMessage = jest.fn();
  const updateConversation = jest.fn();
  const eventEmitter = { emit: jest.fn() };
  let runTransaction: jest.Mock;
  let service: ChatService;

  beforeEach(async () => {
    findConversation.mockReset();
    createMessage.mockReset();
    updateConversation.mockReset();
    eventEmitter.emit.mockReset();

    const tx = {
      conversation: {
        findUnique: findConversation,
        update: updateConversation,
      },
      message: { create: createMessage },
    };
    runTransaction = jest.fn(
      (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: {
            conversation: { findUnique: findConversation },
            message: { create: createMessage },
            $transaction: runTransaction,
          },
        },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = moduleRef.get(ChatService);
  });

  it('trims and saves a message, then notifies the other participant', async () => {
    const createdAt = new Date('2026-01-01T10:00:00.000Z');
    const message = { id: 'message-1', text: 'Hello', createdAt };
    findConversation.mockResolvedValue({
      id: 'conversation-1',
      customerId: 'customer-1',
      employeeId: 'employee-1',
    });
    createMessage.mockResolvedValue(message);

    await expect(
      service.sendMessage('customer-1', 'conversation-1', '  Hello  '),
    ).resolves.toEqual({
      message,
      customerId: 'customer-1',
      employeeId: 'employee-1',
    });

    expect(createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          conversationId: 'conversation-1',
          senderId: 'customer-1',
          text: 'Hello',
        },
      }),
    );
    expect(updateConversation).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      data: { lastMessageAt: createdAt },
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith('chat.messageCreated', {
      conversationId: 'conversation-1',
      messageId: 'message-1',
      senderId: 'customer-1',
      recipientId: 'employee-1',
      text: 'Hello',
    });
  });

  it('rejects messages from users who are not conversation participants', async () => {
    findConversation.mockResolvedValue({
      id: 'conversation-1',
      customerId: 'customer-1',
      employeeId: 'employee-1',
    });

    await expect(
      service.sendMessage('outsider-1', 'conversation-1', 'Hello'),
    ).rejects.toThrow(ForbiddenException);
    expect(createMessage).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('rejects empty messages before starting a transaction', async () => {
    await expect(
      service.sendMessage('customer-1', 'conversation-1', '   '),
    ).rejects.toThrow(BadRequestException);
    expect(runTransaction).not.toHaveBeenCalled();
  });
});
