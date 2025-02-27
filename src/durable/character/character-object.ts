import { DurableObject } from "cloudflare:workers";
import {
    Character,
} from "./type";
import { Logger } from "../../../logger/logger";
import { CharacterHistory } from "./character-history";
import { WebSocketHandler } from "./websocket-handler";
import { SessionManager } from "./session-manager";
import { CharacterManager } from "./character-manager";
import { MessageValidator } from "./message-validator";

export class CharacterObject extends DurableObject<CloudflareBindings> {
    private webSocketHandler: WebSocketHandler;
    private readonly sessionManager: SessionManager;
    private readonly characterManager: CharacterManager;
    private readonly logger: Logger;

    constructor(ctx: DurableObjectState, env: CloudflareBindings) {
        super(ctx, env);

        this.logger = new Logger(env.CHARACTER_LOGS);
        this.sessionManager = new SessionManager();
        const characterHistory = new CharacterHistory(env.CHARACTER_HISTORY);
        this.characterManager = new CharacterManager(ctx, this.logger, characterHistory);
        this.webSocketHandler = new WebSocketHandler(
            this.logger,
            this.sessionManager,
            this.characterManager,
            new MessageValidator()
        );

        try {
            this.ctx.getWebSockets().forEach(ws => {
                const attachment = ws.deserializeAttachment();
                this.sessionManager.addSession(ws, { ...attachment });
            });
        } catch (error) {
            this.logger.error(CharacterObject.name, `Failed to initialize WebSocket sessions: ${error}`);
        }

        this.ctx.blockConcurrencyWhile(async () => {
            await this.characterManager.initialize();
        });
    }

    async fetch(req: Request) {
        await this.logger.log(CharacterObject.name, "Handling request");
        try {
            if (req.headers.get("Upgrade") === "websocket") {
                return this.webSocketHandler.handleWebSocket(req,this.ctx);
            }

            return new Response(JSON.stringify({ error: "Not Found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            await this.logger.error(CharacterObject.name, `Request handling failed: ${error}`);
            return new Response(JSON.stringify({ error: "Internal Server Error" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    async webSocketMessage(ws: WebSocket, message: string) {
        await this.webSocketHandler.handleMessage(ws, message);
    }

    async webSocketError(ws: WebSocket, error: unknown) {
        await this.webSocketHandler.handleError(ws, error);
    }

    async webSocketClose(ws: WebSocket) {
        await this.webSocketHandler.handleClose(ws);
    }

    public async getSessionConnections() {
        const sessions = this.sessionManager.getAllSessions();
        return Array.from(sessions.entries()).map(([ws]) => ({
            connectionStatus: { readyState: ws.readyState, url: ws.url }
        }));
    }

    public async getCharactersByProperty(property: keyof Character, value: any) {
        return this.characterManager.getCharactersByProperty(property, value);
    }
}
