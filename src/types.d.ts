/// <reference types="@cloudflare/workers-types" />

interface CloudflareBindings {
    JWT_SECRET: string;
    CHARACTER_LOGS: KVNamespace;
} 