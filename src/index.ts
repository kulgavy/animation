import {Hono} from "hono";
import {authMiddleware} from "./middleware/auth";
import {Variables} from "./type";
import AuthService from "./auth/auth-service";
import {logger} from 'hono/logger';
import prismaClients from "../prisma/client";
import {UserType} from "./user/constant";
import {zValidator} from '@hono/zod-validator'
import {z} from 'zod'
import {CharacterHistory} from "./durable/character/character-history";
import {Logger} from "../logger/logger";

const app = new Hono<{ Bindings: CloudflareBindings, Variables: Variables }>();
app.use(logger());

app.get("/", async (c) => {
    return c.text(`Hello Hono!`);
});

app.post('/auth/login', zValidator('json', z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(2, 'Password must be at least 2 characters')
})), async (c) => {
    try {
        const {email, password} = c.req.valid('json');
        const prisma = await prismaClients.fetch(c.env.DB);
        const authService = new AuthService(c.env, prisma);

        const token = await authService.login(email, password);

        if (!token) {
            return c.json({message: 'Invalid credentials'}, 401);
        }

        return c.json({message: 'Login successful', token});
    } catch (error) {
        console.error("Login error:", error);
        return c.json({message: 'Internal Server Error'}, 500);
    }
});

app.get("/ws", authMiddleware([UserType.User, UserType.Admin]), async (c) => {
    try {
        if (c.req.header("upgrade") !== "websocket") {
            return c.text("Expected Upgrade: websocket", 426);
        }

        const user = c.get("user");
        const id = c.env.CHARACTER_OBJECT.idFromName(user.id);
        const stub = c.env.CHARACTER_OBJECT.get(id);

        return stub.fetch(c.req.raw);
    } catch (error) {
        console.error("WebSocket error:", error);
        return c.json({message: "Internal Server Error"}, 500);
    }
});

app.get("/admin/character", authMiddleware([UserType.Admin]), zValidator('query', z.object({
    userId: z.string().uuid('Invalid UUID format'),
    isActive: z.string().regex(/^(true|false)$/, 'isActive must be "true" or "false"')
})), async (c) => {
    try {
        const {userId, isActive} = c.req.valid('query');
        const id = c.env.CHARACTER_OBJECT.idFromName(userId);
        const stub = c.env.CHARACTER_OBJECT.get(id);

        const characters = await stub.getCharactersByProperty("isActive", isActive === "true");
        return c.json({data: characters});
    } catch (error) {
        console.error("Error fetching characters:", error);
        return c.json({message: "Internal Server Error"}, 500);
    }
});

app.get("/admin/session", authMiddleware([UserType.Admin]), zValidator('query', z.object({
    userId: z.string().uuid('Invalid UUID format')
})), async (c) => {
    try {
        const {userId} = c.req.valid('query');
        const id = c.env.CHARACTER_OBJECT.idFromName(userId);
        const stub = c.env.CHARACTER_OBJECT.get(id);

        const sessions = stub.getSessionConnections();
        return c.json({data: sessions});
    } catch (error) {
        console.error("Error fetching admin sessions:", error);
        return c.json({message: "Internal Server Error"}, 500);
    }
});

app.get("/admin/history", authMiddleware([UserType.Admin]), zValidator('query', z.object({
    characterId: z.string()
})), async (c) => {
    try {
        const {characterId} = c.req.valid('query');
        const characterHistory = new CharacterHistory(c.env.CHARACTER_HISTORY);
        const history = await characterHistory.getHistoryById(characterId);
        return c.json({data: history});
    } catch (error) {
        console.error("Error fetching character history:", error);
        return c.json({message: "Internal Server Error"}, 500);
    }
});

app.get("/admin/log", authMiddleware([UserType.Admin]), zValidator('query', z.object({
    className: z.string(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime()
})), async (c) => {
    try {
        const {className, startTime, endTime} = c.req.valid('query');
        const logger = new Logger(c.env.CHARACTER_LOGS);
        const logs = await logger.getLogs(
            className,
            new Date(startTime),
            new Date(endTime)
        );
        return c.json({data: logs});
    } catch (error) {
        console.error("Error fetching logs:", error);
        return c.json({message: "Internal Server Error"}, 500);
    }
});

export {CharacterObject} from "./durable/character/character-object";
export default app;
