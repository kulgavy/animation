import { Logger } from "../../../logger/logger";
import { CharacterHistory } from "./character-history";
import { Character, CharacterUpdatePayload, MovePayload, ResetPayload, RotatePayload, StartPayload, StopPayload } from "./type";
import { Command, PREDEFINED_CHARACTERS } from "./constant";
import { Nullable } from "../../type";

export class CharacterManager {
    private characters: Record<string, Character> = {};

    constructor(
        private readonly ctx: DurableObjectState,
        private readonly logger: Logger,
        private readonly characterHistory: CharacterHistory
    ) { }

    async initialize() {
        await this.logger.log(CharacterManager.name, "Initializing predefined characters...");
        const storedCharacters = await this.ctx.storage.list<Character>();
        await this.logger.log(CharacterManager.name, `Stored characters: ${JSON.stringify(storedCharacters)}`);

        if (!storedCharacters.size) {
            await this.logger.log(CharacterManager.name, "No stored characters found. Initializing predefined characters...");
            const predefinedCharacters = PREDEFINED_CHARACTERS;
            await this.ctx.storage.put(predefinedCharacters, { noCache: true });
            this.characters = predefinedCharacters;
        } else {
            this.characters = Object.fromEntries(storedCharacters);
        }

        await this.logger.log(CharacterManager.name, "Characters initialized");
    }

    async handleCommand(command: Command, payload: any) {
        switch (command) {
            case Command.START:
                return this.activateCharacter(payload as StartPayload);
            case Command.STOP:
                return this.deactivateCharacter(payload as StopPayload);
            case Command.ROTATE:
                return this.rotateCharacter(payload as RotatePayload);
            case Command.MOVE:
                return this.moveCharacter(payload as MovePayload);
            case Command.RESET:
                return this.resetCharacter(payload as ResetPayload);
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    }

    private async activateCharacter(payload: StartPayload) {
        if (!this.characters[payload.id]) {
            throw new Error(`Character ${payload.id} not found`);
        }

        if (this.characters[payload.id].isActive) {
            return { message: `Character ${payload.id} is already active` };
        }

        const character = await this.updateCharacter(payload.id, { isActive: true });
        if (!character) {
            throw new Error(`Failed to activate character ${payload.id}`);
        }

        return { message: `Character ${payload.id} started` };
    }

    private async deactivateCharacter(payload: StopPayload) {
        if (!this.characters[payload.id]) {
            throw new Error(`Character ${payload.id} not found`);
        }

        if (!this.characters[payload.id].isActive) {
            return { message: `Character ${payload.id} is already inactive` };
        }

        const character = await this.updateCharacter(payload.id, { isActive: false });
        if (!character) {
            throw new Error(`Failed to deactivate character ${payload.id}`);
        }

        return { message: `Character ${payload.id} stopped` };
    }

    private async rotateCharacter(payload: RotatePayload) {
        const character = this.characters[payload.id];
        if (!character) {
            throw new Error(`Character ${payload.id} not found`);
        }

        if (!character.isActive) {
            throw new Error(`Character ${payload.id} is not active`);
        }

        const updatedCharacter = await this.updateCharacter(payload.id, { rotation: payload.rotation });
        if (!updatedCharacter) {
            throw new Error(`Failed to rotate character ${payload.id}`);
        }

        return { message: `Character ${payload.id} rotated to ${payload.rotation} degrees` };
    }

    private async moveCharacter(payload: MovePayload) {
        const character = this.characters[payload.id];
        if (!character) {
            throw new Error(`Character ${payload.id} not found`);
        }

        if (!character.isActive) {
            throw new Error(`Character ${payload.id} is not active`);
        }

        const updatedCharacter = await this.updateCharacter(payload.id, { position: payload.position });
        if (!updatedCharacter) {
            throw new Error(`Failed to move character ${payload.id}`);
        }

        return { message: `Character ${payload.id} moved to ${JSON.stringify(payload.position)}` };
    }

    private async resetCharacter(payload: ResetPayload) {
        if (!this.characters[payload.id]) {
            throw new Error(`Character ${payload.id} not found`);
        }

        const character = await this.updateCharacter(payload.id, {
            position: { x: 0, y: 0, z: 0 },
            rotation: 0,
            isActive: false
        });

        if (!character) {
            throw new Error(`Failed to reset character ${payload.id}`);
        }

        return { message: `Character ${payload.id} reset to initial state` };
    }

    private async updateCharacter(id: string, payload: Partial<CharacterUpdatePayload>): Promise<Nullable<Character>> {
        const character = this.characters[id];
        if (!character) {
            await this.logger.error(CharacterManager.name, `Character ${id} not found`);
            return null;
        }

        try {
            const updatedCharacter = { ...character, ...payload };
            this.characters[id] = updatedCharacter;
            await Promise.all([
                this.ctx.storage.put(id, updatedCharacter, { noCache: true }),
                this.characterHistory.addHistoryEntry(id, payload)
            ]);
            await this.logger.log(CharacterManager.name, `Character ${id} updated: ${JSON.stringify(updatedCharacter)}`);
            return updatedCharacter;
        } catch (error) {
            await this.logger.error(CharacterManager.name, `Failed to update character ${id}: ${error}`);
            return character;
        }
    }

    getAllCharacters(): Record<string, Character> {
        return this.characters;
    }

    async getCharactersByProperty(property: keyof Character, value: any): Promise<Character[]> {
        return Object.values(this.characters).filter(character => character[property] === value);
    }
} 