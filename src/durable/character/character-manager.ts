import { Logger } from '../../logger/logger';
import { CharacterHistory } from './character-history';
import {
  Character,
  CharacterUpdatePayload,
  MovePayload,
  ResetPayload,
  RotatePayload,
  StartPayload,
  StopPayload,
} from './type';
import { Command, PREDEFINED_CHARACTERS } from './constant';
import { Nullable } from '../../types/basic-type';
import { CommandPayload } from './type';

export class CharacterManager {
  private characters: Record<string, Character> = {};

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly logger: Logger,
    private readonly characterHistory: CharacterHistory,
  ) {}

  async initialize() {
    await this.logger.log(CharacterManager.name, 'Initializing predefined characters...');
    const storedCharacters = await this.ctx.storage.list<Character>();
    await this.logger.log(
      CharacterManager.name,
      `Stored characters: ${JSON.stringify(storedCharacters)}`,
    );

    if (!storedCharacters.size) {
      await this.logger.log(
        CharacterManager.name,
        'No stored characters found. Initializing predefined characters...',
      );
      const predefinedCharacters = PREDEFINED_CHARACTERS;
      await this.ctx.storage.put(predefinedCharacters, { noCache: true });
      this.characters = predefinedCharacters;
    } else {
      this.characters = Object.fromEntries(storedCharacters);
    }

    await this.logger.log(CharacterManager.name, 'Characters initialized');
  }

  async handleCommand(command: Command, payload: CommandPayload) {
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
    const { characterId } = payload;
    await this.updateCharacter(characterId, {
      isActive: true,
    });
  }

  private async deactivateCharacter(payload: StopPayload) {
    const { characterId } = payload;
    if (!(characterId in this.characters)) {
      throw new Error(`Character ${characterId} does not exist`);
    }

    await this.updateCharacter(characterId, { isActive: false });
  }

  private async rotateCharacter(payload: RotatePayload) {
    const { characterId, rotation } = payload;
    if (!(characterId in this.characters)) {
      throw new Error(`Character ${characterId} does not exist`);
    }

    await this.updateCharacter(characterId, { rotation });
  }

  private async moveCharacter(payload: MovePayload) {
    const { characterId, position } = payload;
    if (!(characterId in this.characters)) {
      throw new Error(`Character ${characterId} does not exist`);
    }

    await this.updateCharacter(characterId, { position: { ...position } });
  }

  private async resetCharacter(payload: ResetPayload) {
    const { characterId } = payload;
    if (!(characterId in this.characters)) {
      throw new Error(`Character ${characterId} does not exist`);
    }

    await this.updateCharacter(characterId, { isActive: false });
  }

  private async updateCharacter(
    id: string,
    payload: Partial<CharacterUpdatePayload>,
  ): Promise<Nullable<Character>> {
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
        this.characterHistory.addHistoryEntry(id, payload),
      ]);
      await this.logger.log(
        CharacterManager.name,
        `Character ${id} updated: ${JSON.stringify(updatedCharacter)}`,
      );
      return updatedCharacter;
    } catch (error) {
      await this.logger.error(CharacterManager.name, `Failed to update character ${id}: ${error}`);
      return character;
    }
  }

  getAllCharacters(): Record<string, Character> {
    return this.characters;
  }

  async getCharactersByProperty<K extends keyof Character>(
    property: K,
    value: Character[K],
  ): Promise<Character[]> {
    return Object.values(this.characters).filter(character => character[property] === value);
  }
}
