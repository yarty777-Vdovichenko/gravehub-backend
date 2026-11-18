import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatGateway } from 'src/chat/chat.gateway';

interface ProposalEvent {
  proposalId: string;
  contractId: string;
}

interface ContractStatusChangedEvent {
  contractId: string;
  from: string;
  to: string;
  actorId: string;
}

interface ChatMessageCreatedEvent {
  conversationId: string;
  messageId: string;
  senderId: string;
  recipientId: string;
  text: string;
}

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @OnEvent('proposal.created')
  onProposalCreated(event: ProposalEvent) {
    return this.handle('proposal.created', async () => {
      const proposal = await this.prisma.proposal.findFirst({
        where: { id: event.proposalId, contractId: event.contractId },
        select: {
          id: true,
          contract: {
            select: { id: true, title: true, customerId: true },
          },
        },
      });
      if (!proposal) {
        throw new Error('Proposal for notification was not found');
      }

      await this.createAndEmit(
        proposal.contract.customerId,
        NotificationType.proposal_received,
        {
          contractId: proposal.contract.id,
          proposalId: proposal.id,
          contractTitle: proposal.contract.title,
        },
      );
    });
  }

  @OnEvent('proposal.accepted')
  onProposalAccepted(event: ProposalEvent) {
    return this.handle('proposal.accepted', async () => {
      const proposal = await this.getProposalForNotification(event);
      await this.createAndEmit(
        proposal.employee.userId,
        NotificationType.proposal_accepted,
        {
          contractId: proposal.contract.id,
          proposalId: proposal.id,
          contractTitle: proposal.contract.title,
        },
      );
    });
  }

  @OnEvent('proposal.rejected')
  onProposalRejected(event: ProposalEvent) {
    return this.handle('proposal.rejected', async () => {
      const proposal = await this.getProposalForNotification(event);
      await this.createAndEmit(
        proposal.employee.userId,
        NotificationType.proposal_rejected,
        {
          contractId: proposal.contract.id,
          proposalId: proposal.id,
          contractTitle: proposal.contract.title,
        },
      );
    });
  }

  @OnEvent('contract.statusChanged')
  onContractStatusChanged(event: ContractStatusChangedEvent) {
    return this.handle('contract.statusChanged', async () => {
      const contract = await this.prisma.contract.findUnique({
        where: { id: event.contractId },
        select: {
          id: true,
          title: true,
          customerId: true,
          employee: { select: { userId: true } },
        },
      });
      if (!contract) {
        throw new Error('Contract for notification was not found');
      }

      const employeeUserId = contract.employee?.userId;
      let recipientId: string;
      if (contract.customerId === event.actorId && employeeUserId) {
        recipientId = employeeUserId;
      } else if (employeeUserId === event.actorId) {
        recipientId = contract.customerId;
      } else {
        throw new Error('Contract status event actor is not a participant');
      }

      await this.createAndEmit(
        recipientId,
        NotificationType.contract_status_changed,
        {
          contractId: contract.id,
          contractTitle: contract.title,
          from: event.from,
          to: event.to,
        },
      );
    });
  }

  @OnEvent('chat.messageCreated')
  onChatMessageCreated(event: ChatMessageCreatedEvent) {
    return this.handle('chat.messageCreated', async () => {
      const [sender, conversation] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: event.senderId },
          select: { id: true, name: true },
        }),
        this.prisma.conversation.findUnique({
          where: { id: event.conversationId },
          select: {
            id: true,
            customerId: true,
            employeeId: true,
          },
        }),
      ]);

      if (!sender) {
        throw new Error('Message sender for notification was not found');
      }
      if (
        !conversation ||
        (conversation.customerId !== event.senderId &&
          conversation.employeeId !== event.senderId) ||
        (conversation.customerId !== event.recipientId &&
          conversation.employeeId !== event.recipientId)
      ) {
        throw new Error('Conversation for message notification was not found');
      }

      await this.createAndEmit(
        event.recipientId,
        NotificationType.new_message,
        {
          conversationId: event.conversationId,
          messageId: event.messageId,
          senderId: event.senderId,
          senderName: sender.name,
          text: event.text,
        },
      );
    });
  }

  private async getProposalForNotification(event: ProposalEvent) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: event.proposalId, contractId: event.contractId },
      select: {
        id: true,
        employee: { select: { userId: true } },
        contract: { select: { id: true, title: true } },
      },
    });
    if (!proposal) {
      throw new Error('Proposal for notification was not found');
    }
    return proposal;
  }

  private async createAndEmit(
    userId: string,
    type: NotificationType,
    payload: Prisma.InputJsonObject,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, payload },
    });
    this.chatGateway.emitToUser(userId, 'notification:new', notification);
  }

  private async handle(eventName: string, work: () => Promise<void>) {
    try {
      await work();
    } catch (error) {
      this.logger.error(
        `Failed to process ${eventName} notification`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
