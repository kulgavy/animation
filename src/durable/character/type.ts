import {Command} from "./constant";

export type Position = {
    x: number;
    y: number;
    z: number;
};

export type Character = {
    id: string;
    position: Position;
    rotation: number;
    isActive: boolean;
};

export type CharacterUpdatePayload ={
    position: Position,
    rotation: number;
    isActive: boolean;
}

export interface StartPayload {
    id: string;
}

export interface StopPayload {
    id: string;
}

export interface RotatePayload {
    id: string;
    rotation: number;
}

export interface MovePayload {
    id: string;
    position: Position;
}

export interface ResetPayload {
    id: string;
}

export type WebSocketMessage =
    | { command: Command.START; payload: StartPayload }
    | { command: Command.STOP; payload: StopPayload }
    | { command: Command.ROTATE; payload: RotatePayload }
    | { command: Command.MOVE; payload: MovePayload }
    | { command: Command.RESET; payload: ResetPayload }

export interface CharacterHistoryEntry {
    id: string;
    timestamp: string;
    data: Partial<Character>;
}