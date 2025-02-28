import { Command } from './constant';

export interface StartPayload {
  characterId: string;
}

export interface StopPayload {
  characterId: string;
}

export interface RotatePayload {
  characterId: string;
  rotation: number;
}

export interface MovePayload {
  characterId: string;
  position: { x: number; y: number; z: number };
}

export interface ResetPayload {
  characterId: string;
}

export type CommandPayload =
  | StartPayload
  | StopPayload
  | RotatePayload
  | MovePayload
  | ResetPayload;

export interface WebSocketMessage {
  command: Command;
  payload: CommandPayload;
}

export interface Character {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  isActive: boolean;
}

export type Position = {
  x: number;
  y: number;
  z: number;
};

export type CharacterUpdatePayload = {
  position: Position;
  rotation: number;
  isActive: boolean;
};

export interface CharacterHistoryEntry {
  id: string;
  timestamp: string;
  data: Partial<Character>;
}
