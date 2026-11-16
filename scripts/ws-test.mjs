import { io } from 'socket.io-client';

const [senderToken, recipientToken, conversationId] = process.argv.slice(2);

if (!senderToken || !recipientToken || !conversationId) {
  console.error(
    'Usage: node scripts/ws-test.mjs <sender-access-token> <recipient-access-token> <conversation-id>',
  );
  process.exit(1);
}

const serverUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';
const sender = io(serverUrl, {
  auth: { token: senderToken },
  reconnection: false,
});
const recipient = io(serverUrl, {
  auth: { token: recipientToken },
  reconnection: false,
});

function waitForConnection(socket) {
  return new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
}

function waitForMessage() {
  let onMessage;
  let timeout;
  const promise = new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      recipient.off('message:new', onMessage);
      reject(new Error('Timed out waiting for message:new'));
    }, 10_000);

    onMessage = (message) => {
      if (message.conversationId !== conversationId) return;
      clearTimeout(timeout);
      recipient.off('message:new', onMessage);
      resolve(message);
    };

    recipient.on('message:new', onMessage);
  });

  return {
    promise,
    cancel() {
      clearTimeout(timeout);
      recipient.off('message:new', onMessage);
    },
  };
}

const messageWaiter = waitForMessage();

try {
  await Promise.all([waitForConnection(sender), waitForConnection(recipient)]);

  const acknowledgement = await new Promise((resolve, reject) => {
    sender.timeout(5_000).emit(
      'message:send',
      {
        conversationId,
        text: `Socket.IO test message ${new Date().toISOString()}`,
      },
      (error, response) => {
        if (error) {
          reject(new Error('Timed out waiting for message acknowledgement'));
          return;
        }
        resolve(response);
      },
    );
  });

  if (!acknowledgement?.ok) {
    messageWaiter.cancel();
    throw new Error(acknowledgement?.error ?? 'Message send was rejected');
  }

  console.log(JSON.stringify(await messageWaiter.promise, null, 2));
} catch (error) {
  messageWaiter.cancel();
  console.error(
    error instanceof Error ? error.message : 'WebSocket test failed',
  );
  process.exitCode = 1;
} finally {
  sender.disconnect();
  recipient.disconnect();
}
