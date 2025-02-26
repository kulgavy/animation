import {Character} from "./type";

export enum Command {
    START = 'start',
    STOP = 'stop',
    ROTATE = 'rotate',
    MOVE = 'move',
    RESET = 'reset'
}

export const HISTORY_PREFIX = 'history';

export const PREDEFINED_CHARACTERS: Record<string, Character> = {
    char1: {
        id: "char1",
        position: {x: 0, y: 0, z: 0},
        rotation: 0,
        isActive: false
    },
    char2: {
        id: "char2",
        position: {x: 10, y: 5, z: 0},
        rotation: 45,
        isActive: false
    }
}
