
export interface SessionData {
    connectedAt: string;
    userAgent: string;
    clientId: string;
}

export class SessionManager {
    private readonly sessions: Map<WebSocket, SessionData>;

    constructor() {
        this.sessions = new Map();
    }

    createConnectionData(req: Request): SessionData {
        return {
            connectedAt: new Date().toISOString(),
            userAgent: req.headers.get('User-Agent') || 'unknown',
            clientId: crypto.randomUUID()
        };
    }

    addSession(ws: WebSocket, data: SessionData) {
        this.sessions.set(ws, data);
    }

    removeSession(ws: WebSocket) {
        this.sessions.delete(ws);
    }

    getSession(ws: WebSocket): SessionData | undefined {
        return this.sessions.get(ws);
    }

    getActiveConnections(): WebSocket[] {
        return Array.from(this.sessions.keys())
            .filter(socket => socket.readyState === WebSocket.OPEN);
    }

    getAllSessions(): Map<WebSocket, SessionData> {
        return this.sessions;
    }
} 