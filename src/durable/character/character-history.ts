import {Character, CharacterHistoryEntry} from "./type";
import {HISTORY_PREFIX} from "./constant";

export class CharacterHistory {
    private readonly kvNamespace: KVNamespace;

    constructor(kvNamespace: KVNamespace) {
        this.kvNamespace = kvNamespace;
    }

    async addHistoryEntry(id: string, data: Partial<Character>) {
        const timestamp = new Date().toISOString();
        const entry: CharacterHistoryEntry = {
            id,
            timestamp: timestamp,
            data
        };

        await this.kvNamespace.put(`${HISTORY_PREFIX}:${id}:${timestamp}`, JSON.stringify(entry));
    }

    async getHistoryById(id: string): Promise<CharacterHistoryEntry[]> {
        const entries: CharacterHistoryEntry[] = [];
        const listResult = await this.kvNamespace.list({prefix: `${HISTORY_PREFIX}:${id}:`});

        for (const key of listResult.keys) {
            const entry = await this.kvNamespace.get(key.name);
            if (entry) {
                entries.push(JSON.parse(entry));
            }
        }

        return entries;
    }

    async getAllHistory(): Promise<CharacterHistoryEntry[]> {
        const entries: CharacterHistoryEntry[] = [];
        const listResult = await this.kvNamespace.list({prefix: `${HISTORY_PREFIX}:`});

        for (const key of listResult.keys) {
            const entry = await this.kvNamespace.get(key.name);
            if (entry) {
                entries.push(JSON.parse(entry));
            }
        }

        return entries;
    }
}