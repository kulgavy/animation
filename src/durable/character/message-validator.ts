import { Command } from './constant';
import { WebSocketMessage, CommandPayload, MovePayload, RotatePayload } from './type';

export class MessageValidator {
  isValid(message: unknown): message is WebSocketMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    if (!('command' in message) || !('payload' in message)) {
      return false;
    }

    const typedMessage = message as { command: unknown; payload: unknown };

    if (!Object.values(Command).includes(typedMessage.command as Command)) {
      return false;
    }

    return this.validatePayload(typedMessage.command as Command, typedMessage.payload);
  }

  private validatePayload(command: Command, payload: unknown): payload is CommandPayload {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const hasCharacterId = 'characterId' in payload;
    if (!hasCharacterId) {
      return false;
    }

    switch (command) {
      case Command.START:
      case Command.STOP:
      case Command.RESET:
        return true;
      case Command.ROTATE: {
        const rotatePayload = payload as Partial<RotatePayload>;
        return typeof rotatePayload.rotation === 'number';
      }
      case Command.MOVE: {
        const movePayload = payload as Partial<MovePayload>;
        return (
          typeof movePayload.position === 'object' &&
          typeof movePayload.position?.x === 'number' &&
          typeof movePayload.position?.y === 'number' &&
          typeof movePayload.position?.z === 'number'
        );
      }
      default:
        return false;
    }
  }
}
