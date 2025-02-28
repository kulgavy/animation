import { Logger } from '../../logger/logger';
import { CharacterManager } from './character-manager';
import { Command } from './constant';
import { MessageValidator } from './message-validator';
import { SessionManager } from './session-manager';
import { WebSocketMessage } from './type';

export class WebSocketHandler {
  constructor(
    private readonly logger: Logger,
    private readonly sessionManager: SessionManager,
    private readonly characterManager: CharacterManager,
    private readonly messageValidator: MessageValidator,
  ) {}

  async handleWebSocket(req: Request, ctx: DurableObjectState) {
    try {
      const websocketPair = new WebSocketPair();
      const [client, server] = Object.values(websocketPair);

      ctx.acceptWebSocket(server);

      const connectionData = this.sessionManager.createConnectionData(req);
      this.sessionManager.addSession(server, connectionData);

      server.send(
        JSON.stringify({
          type: 'connection',
          message: 'Connected to Animation Session!',
          connectionData,
          characters: this.characterManager.getAllCharacters(),
        }),
      );

      await this.logger.log(
        'WebSocketHandler',
        `WebSocket connection established: ${connectionData.clientId}`,
      );

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    } catch (error) {
      await this.logger.error(
        'WebSocketHandler',
        `Failed to establish WebSocket connection: ${error}`,
      );
      return new Response(JSON.stringify({ error: 'WebSocket connection failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  async handleMessage(ws: WebSocket, message: string) {
    let parsedMessage: WebSocketMessage;

    try {
      parsedMessage = JSON.parse(message);
      if (!this.messageValidator.isValid(parsedMessage)) {
        throw new Error('Invalid message format');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
      await this.logger.error('WebSocketHandler', `Message parsing error: ${errorMessage}`);
      ws.send(JSON.stringify({ error: errorMessage }));
      return;
    }

    try {
      const { command, payload } = parsedMessage;
      const result = await this.characterManager.handleCommand(command, payload);
      await this.broadcastUpdate(command, {
        characters: this.characterManager.getAllCharacters(),
        result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Malformed message';
      await this.logger.error('WebSocketHandler', `WebSocket message error: ${errorMessage}`);
      ws.send(JSON.stringify({ error: errorMessage }));
    }
  }

  private async broadcastUpdate(command: Command, data: unknown) {
    const response = JSON.stringify({ command, data });
    const activeConnections = this.sessionManager.getActiveConnections();

    const CHUNK_SIZE = 50;
    for (let i = 0; i < activeConnections.length; i += CHUNK_SIZE) {
      const chunk = activeConnections.slice(i, i + CHUNK_SIZE);
      await Promise.allSettled(
        chunk.map(async socket => {
          try {
            socket.send(response);
          } catch (error) {
            await this.logger.error('WebSocketHandler', `Failed to broadcast to socket: ${error}`);
          }
        }),
      );
    }
  }

  async handleError(ws: WebSocket, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await this.logger.error('WebSocketHandler', `WebSocket error: ${errorMessage}`);
    this.sessionManager.removeSession(ws);
  }

  async handleClose(ws: WebSocket) {
    await this.logger.log('WebSocketHandler', 'WebSocket connection closed');
    const session = this.sessionManager.getSession(ws);
    if (session) {
      await this.logger.log('WebSocketHandler', `Cleaning up session: ${JSON.stringify(session)}`);
    }
    this.sessionManager.removeSession(ws);
  }
}
