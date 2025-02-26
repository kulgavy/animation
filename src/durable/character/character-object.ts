import {DurableObject} from "cloudflare:workers";
import {Command, PREDEFINED_CHARACTERS} from "./constant";
import {
    Character,
    CharacterUpdatePayload,
    MovePayload,
    ResetPayload,
    RotatePayload, StartPayload,
    StopPayload,
    WebSocketMessage
} from "./type";
import {Nullable} from "../../type";
import {Logger} from "../../../logger/logger";
import {CharacterHistory} from "./character-history";

export class CharacterObject extends DurableObject<CloudflareBindings> {
    private sessions: Map<WebSocket, unknown>;
    private characters: Record<string, Character> = {};
    private logger: Logger;
    private characterHistory: CharacterHistory;

    constructor(ctx: DurableObjectState, env: CloudflareBindings) {
        super(ctx, env);

        this.sessions = new Map();
        this.logger = new Logger(env.CHARACTER_LOGS);
        this.characterHistory = new CharacterHistory(env.CHARACTER_HISTORY);
        this.ctx.getWebSockets().forEach(ws => {
            this.sessions.set(ws, {...ws.deserializeAttachment()});
        });

        this.ctx.blockConcurrencyWhile(async () => {
            await this.logger.log(CharacterObject.name, "Initializing predefined characters...");
            // Load stored characters
            const storedCharacters = await this.ctx.storage.list<Character>();
            await this.logger.log(CharacterObject.name, `Stored characters: ${JSON.stringify(storedCharacters)}`);

            if (!storedCharacters.size) {
                await this.logger.log(CharacterObject.name, "No stored characters found. Initializing predefined characters...");
                const predefinedCharacters = PREDEFINED_CHARACTERS;
                await this.ctx.storage.put(predefinedCharacters, {noCache: true});

                this.characters = predefinedCharacters;
            } else {
                this.characters = Object.fromEntries(storedCharacters);
            }

            await this.logger.log(CharacterObject.name, "Characters initialized");
        });
    }


    async fetch(req: Request) {
        await this.logger.log(CharacterObject.name, "Handling WebSocket connection request");
        try {
            if (req.headers.get("Upgrade") === "websocket") {
                return this.handleWebSocket(req);
            }

            return new Response(JSON.stringify({error: "Not Found"}), {
                status: 404,
                headers: {"Content-Type": "application/json"},
            });
        } catch (error) {
            await this.logger.error(CharacterObject.name, `WebSocket connection failed: ${error}`);
            return new Response(JSON.stringify({error: "Failed to establish WebSocket connection"}), {
                status: 500,
                headers: {"Content-Type": "application/json"}
            });
        }
    }

    private async handleWebSocket(req: Request) {
        try {
            const websocketPair = new WebSocketPair();
            const [client, server] = Object.values(websocketPair);

            // Add connection metadata
            const connectionData = {
                connectedAt: new Date().toISOString(),
                userAgent: req.headers.get('User-Agent') || 'unknown',
                clientId: crypto.randomUUID()
            };

            this.ctx.acceptWebSocket(server);
            this.sessions.set(server, connectionData);

            // Send initial connection confirmation
            server.send(JSON.stringify({
                type: 'connection',
                message: 'Connected to Animation Session!',
                connectionData,
                characters: this.characters
            }));

            await this.logger.log(CharacterObject.name, `WebSocket connection established: ${connectionData.clientId}`);

            return new Response(null, {
                status: 101,
                webSocket: client,
            });
        } catch (error) {
            await this.logger.error(CharacterObject.name, `Failed to establish WebSocket connection: ${error}`);
            return new Response(JSON.stringify({error: 'WebSocket connection failed'}), {
                status: 500,
                headers: {'Content-Type': 'application/json'}
            });
        }
    }

    async webSocketMessage(ws: WebSocket, message: string) {
        try {
            const parsedMessage = JSON.parse(message) as WebSocketMessage;
            await this.logger.log(CharacterObject.name, `Received message: ${JSON.stringify(parsedMessage)}`);

            const {command, payload} = parsedMessage;
            if (!command || !payload) {
                throw new Error("Invalid message format: missing command or payload");
            }

            const broadcastUpdate = (data: unknown) => {
                const response = JSON.stringify({command, data});
                this.sessions.forEach((_, socket) => socket.readyState === WebSocket.OPEN && socket.send(response));
            };

            let result;
            switch (command) {
                case Command.START:
                    result = await this.activateCharacter(ws, payload);
                    break;
                case Command.STOP:
                    result = await this.deactivateCharacter(ws, payload);
                    break;
                case Command.ROTATE:
                    result = await this.rotateCharacter(ws, payload);
                    break;
                case Command.MOVE:
                    result = await this.moveCharacter(ws, payload);
                    break;
                case Command.RESET:
                    result = await this.resetCharacter(ws, payload);
                    break;
                default:
                    throw new Error(`Unknown command: ${command}`);
            }

            broadcastUpdate({characters: this.characters, result});
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Malformed message";
            await this.logger.error(CharacterObject.name, `WebSocket message error: ${errorMessage}`);
            ws.send(JSON.stringify({error: errorMessage}));
        }
    }

    private async activateCharacter(ws: WebSocket, payload: StartPayload) {
        if (!this.characters[payload.id]) {
            await this.logger.error(CharacterObject.name, `Character ${payload.id} not found`);
            return ws.send(JSON.stringify({error: `Character ${payload.id} not found`}));
        }

        if (this.characters[payload.id].isActive) {
            await this.logger.log(CharacterObject.name, `Character ${payload.id} is already active`);
            return ws.send(JSON.stringify({message: `Character ${payload.id} is already active`}));
        }

        const character = await this.updateCharacter(payload.id, {isActive: true});
        if (!character) {
            await this.logger.error(CharacterObject.name, `Failed to activate character ${payload.id}`);
            return ws.send(JSON.stringify({error: `Failed to activate character ${payload.id}`}));
        }

        await this.logger.log(CharacterObject.name, `Character ${payload.id} activated`);
        return ws.send(JSON.stringify({message: `Character ${payload.id} started`}));
    }

    private async deactivateCharacter(ws: WebSocket, payload: StopPayload) {
        if (!this.characters[payload.id]) {
            await this.logger.error(CharacterObject.name, `Character ${payload.id} not found`);
            return ws.send(JSON.stringify({error: `Character ${payload.id} not found`}));
        }

        if (!this.characters[payload.id].isActive) {
            await this.logger.log(CharacterObject.name, `Character ${payload.id} is already inactive`);
            return ws.send(JSON.stringify({message: `Character ${payload.id} is already inactive`}));
        }

        const character = await this.updateCharacter(payload.id, {isActive: false});
        if (!character) {
            await this.logger.error(CharacterObject.name, `Failed to deactivate character ${payload.id}`);
            return ws.send(JSON.stringify({error: `Failed to deactivate character ${payload.id}`}));
        }

        await this.logger.log(CharacterObject.name, `Character ${payload.id} deactivated`);
        return ws.send(JSON.stringify({message: `Character ${payload.id} stopped`}));
    }

    private async updateCharacter(id: string, payload: Partial<CharacterUpdatePayload>): Promise<Nullable<Character>> {
        const character = this.characters[id];
        if (!character) {
            await this.logger.error(CharacterObject.name, `Character ${id} not found`);
            return;
        }

        try {
            const updatedCharacter = {...character, ...payload};
            this.characters[id] = updatedCharacter;
            await Promise.all([
                this.ctx.storage.put(id, updatedCharacter, {noCache: true}),
                this.characterHistory.addHistoryEntry(id, payload)
            ]);
            await this.logger.log(CharacterObject.name, `Character ${id} updated: ${JSON.stringify(updatedCharacter)}`);
            return updatedCharacter;
        } catch (error) {
            await this.logger.error(CharacterObject.name, `Failed to update character ${id}: ${error}`);
            return character;
        }
    }

    private async rotateCharacter(ws: WebSocket, payload: RotatePayload) {
        const character = this.characters[payload.id];
        if (!character) {
            await this.logger.error(CharacterObject.name, `Character ${payload.id} not found`);
            return ws.send(JSON.stringify({error: `Character ${payload.id} not found`}));
        }

        if (!character.isActive) {
            await this.logger.log(CharacterObject.name, `Character ${payload.id} is not active`);
            return ws.send(JSON.stringify({error: `Character ${payload.id} is not active`}));
        }

        const updatedCharacter = await this.updateCharacter(payload.id, {rotation: payload.rotation});
        if (!updatedCharacter) {
            await this.logger.error(CharacterObject.name, `Failed to rotate character ${payload.id}`);
            return ws.send(JSON.stringify({error: `Failed to rotate character ${payload.id}`}));
        }

        await this.logger.log(CharacterObject.name, `Character ${payload.id} rotated to ${payload.rotation} degrees`);
        return ws.send(JSON.stringify({message: `Character ${payload.id} rotated to ${payload.rotation} degrees`}));
    }

    private async moveCharacter(ws: WebSocket, payload: MovePayload) {
        const character = this.characters[payload.id];
        if (!character) {
            await this.logger.error(CharacterObject.name, `Character ${payload.id} not found`);
            return ws.send(JSON.stringify({error: `Character ${payload.id} not found`}));
        }

        if (!character.isActive) {
            await this.logger.log(CharacterObject.name, `Character ${payload.id} is not active`);
            return ws.send(JSON.stringify({error: `Character ${payload.id} is not active`}));
        }

        const updatedCharacter = await this.updateCharacter(payload.id, {position: payload.position});
        if (!updatedCharacter) {
            await this.logger.error(CharacterObject.name, `Failed to move character ${payload.id}`);
            return ws.send(JSON.stringify({error: `Failed to move character ${payload.id}`}));
        }

        await this.logger.log(CharacterObject.name, `Character ${payload.id} moved to ${JSON.stringify(payload.position)}`);
        return ws.send(JSON.stringify({message: `Character ${payload.id} moved to ${JSON.stringify(payload.position)}`}));
    }

    private async resetCharacter(ws: WebSocket, payload: ResetPayload) {
        if (!this.characters[payload.id]) {
            await this.logger.error(CharacterObject.name, `Character ${payload.id} not found`);
            return ws.send(JSON.stringify({error: `Character ${payload.id} not found`}));
        }

        const character = await this.updateCharacter(payload.id, {
            position: {x: 0, y: 0, z: 0},
            rotation: 0,
            isActive: false
        });

        if (!character) {
            await this.logger.error(CharacterObject.name, `Failed to reset character ${payload.id}`);
            return ws.send(JSON.stringify({error: `Failed to reset character ${payload.id}`}));
        }

        await this.logger.log(CharacterObject.name, `Character ${payload.id} reset to initial state`);
        return ws.send(JSON.stringify({message: `Character ${payload.id} reset to initial state`}));
    }

    async webSocketError(ws: WebSocket, error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.logger.error(CharacterObject.name, `WebSocket error: ${errorMessage}`);
        this.sessions.delete(ws);
    }

    async webSocketClose(ws: WebSocket) {
        await this.logger.log(CharacterObject.name, "WebSocket connection closed");
        const session = this.sessions.get(ws);
        if (session) {
            await this.logger.log(CharacterObject.name, `Cleaning up session: ${JSON.stringify(session)}`);
        }
        this.sessions.delete(ws);
    }

    public async getSessionConnections(): Promise<Array<{
        connectionStatus: { readyState: number; url: string | null }
    }>> {
        await this.logger.log(CharacterObject.name, "Fetching session connections");
        const connections = Array.from(this.sessions.entries()).map(([ws, session]) => ({
            connectionStatus: {readyState: ws.readyState, url: ws.url},
        }));
        await this.logger.log(CharacterObject.name, `Found ${connections.length} active connections`);
        return connections;
    }

    public async getCharactersByProperty(property: keyof Character, value: any): Promise<Character[]> {
        return Object.values(this.characters).filter(character => character[property] === value);
    }
}
