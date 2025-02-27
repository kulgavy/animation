import { Command } from "./constant";
import { WebSocketMessage } from "./type";

export class MessageValidator {
    isValid(message: any): message is WebSocketMessage {
        if (!message || typeof message !== 'object') {
            return false;
        }

        if (!('command' in message) || !('payload' in message)) {
            return false;
        }

        if (!Object.values(Command).includes(message.command)) {
            return false;
        }

        return this.validatePayload(message.command, message.payload);
    }

    private validatePayload(command: Command, payload: any): boolean {
        switch (command) {
            case Command.START:
            case Command.STOP:
            case Command.RESET:
                return typeof payload?.id === 'string';
            case Command.ROTATE:
                return typeof payload?.id === 'string' &&
                    typeof payload?.rotation === 'number';
            case Command.MOVE:
                return typeof payload?.id === 'string' &&
                    typeof payload?.position === 'object' &&
                    typeof payload?.position?.x === 'number' &&
                    typeof payload?.position?.y === 'number' &&
                    typeof payload?.position?.z === 'number';
            default:
                return false;
        }
    }
} 