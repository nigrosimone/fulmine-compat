// LibreChat's API server (`node api/server/index.js`, what its Docker image runs) with the built web
// client, on a MongoDB 8.0 of its own on the side core. Each arm has its own database. The requests
// are what the web app sends when a signed in user opens it: the page, the startup config, the user,
// the endpoints menu, the conversation list, and one conversation. The chat itself is a stream to an
// LLM provider and is left out: the server waits on the provider there, not on the framework.

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";

import { page, script, xhr } from "./browser.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MONGO_PORT = 27018;
const PASSWORD = "bench-password-1";
const secret = (n) => crypto.createHash("sha256").update("fulmine-compat-" + n).digest("hex");

const words = "the of and to in is you that it he was for on are as with his they at be this have from or one had by word but not what all were we when your can said there use an each which she do how their if will up other about out many then them these so some her would make like him into time has look two more write go see number no way could people my than first water been call who oil its now find long down day did get come made may part".split(" ");
const sentence = (n) => Array.from({ length: n }, () => words[Math.floor(Math.random() * words.length)]).join(" ");

function waitPort(port, ms) {
    const deadline = Date.now() + ms;
    return new Promise((resolve, reject) => {
        const tryOnce = () => {
            const socket = net.connect(port, "127.0.0.1");
            socket.on("connect", () => {
                socket.destroy();
                resolve();
            });
            socket.on("error", () => (Date.now() > deadline ? reject(new Error(`port ${port} closed`)) : setTimeout(tryOnce, 300)));
        };
        tryOnce();
    });
}

export default {
    name: "librechat",
    title: "LibreChat, API server",
    dir: "librechat",
    cwd: "api",
    command: ["server/index.js"],
    ready: "/health",
    bootSeconds: 240,
    env: ({ port, arm }) => ({
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: String(port),
        MONGO_URI: `mongodb://127.0.0.1:${MONGO_PORT}/LibreChat-${arm}`,
        DOMAIN_CLIENT: `http://127.0.0.1:${port}`,
        DOMAIN_SERVER: `http://127.0.0.1:${port}`,
        JWT_SECRET: secret("jwt"),
        JWT_REFRESH_SECRET: secret("refresh"),
        CREDS_KEY: secret("creds"),
        CREDS_IV: secret("iv").slice(0, 32),
        ALLOW_REGISTRATION: "true",
        ALLOW_EMAIL_LOGIN: "true",
        ALLOW_UNVERIFIED_EMAIL_LOGIN: "true",
        SEARCH: "false",
        NO_INDEX: "true",
        TRUST_PROXY: "1",
        // the access token lives 15 minutes by default, and a run lasts longer than that
        SESSION_EXPIRY: String(6 * 60 * 60 * 1000)
    }),

    // patches/librechat.diff: fulmine's compression, and its static over the twins their build writes
    tuned: {
        map: { compression: "compression.cjs", "express-static-gzip": "express-static-gzip.cjs" }
    },

    async side({ cpu, work }) {
        const dbPath = path.join(work, "mongo");
        fs.rmSync(dbPath, { recursive: true, force: true });
        fs.mkdirSync(dbPath, { recursive: true });
        const mongod = fs.readdirSync(path.join(ROOT)).find((d) => d.startsWith("mongodb-linux-"));
        const child = spawn(
            "taskset",
            ["-c", cpu, path.join(ROOT, mongod, "bin", "mongod"), "--dbpath", dbPath, "--port", String(MONGO_PORT), "--bind_ip", "127.0.0.1", "--quiet"],
            { stdio: ["ignore", fs.openSync(path.join(work, "mongod.log"), "w"), "inherit"] }
        );
        await waitPort(MONGO_PORT, 60000);
        return { pid: child.pid, stop: () => child.kill("SIGTERM") };
    },

    async seed(base, { arm }) {
        const post = (p, body) =>
            fetch(base + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const email = "bench@example.com";
        let res = await post("/api/auth/register", { name: "Bench User", username: "bench", email, password: PASSWORD, confirm_password: PASSWORD });
        if (res.status >= 400) throw new Error(`register: ${res.status} ${await res.text()}`);
        res = await post("/api/auth/login", { email, password: PASSWORD });
        if (res.status !== 200) throw new Error(`login: ${res.status} ${await res.text()}`);
        const { token, user } = await res.json();
        const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).concat("lang=en-US").join("; ");
        const userId = String(user._id || user.id);

        // two hundred conversations of twenty messages, written straight to the database in the
        // shape of LibreChat's own schemas, since making them through the API means an LLM
        const { MongoClient, ObjectId } = createRequire(path.join(ROOT, "librechat", "api", "x.js"))("mongodb");
        const client = await MongoClient.connect(`mongodb://127.0.0.1:${MONGO_PORT}`);
        const db = client.db(`LibreChat-${arm}`);
        const now = Date.now();
        const convos = [];
        const messages = [];
        for (let c = 0; c < 200; c++) {
            const conversationId = crypto.randomUUID();
            const ids = [];
            let parent = "00000000-0000-0000-0000-000000000000";
            const started = new Date(now - (200 - c) * 3600 * 1000);
            for (let m = 0; m < 20; m++) {
                const _id = new ObjectId();
                const messageId = crypto.randomUUID();
                const fromUser = m % 2 === 0;
                const at = new Date(started.getTime() + m * 30000);
                messages.push({
                    _id,
                    messageId,
                    conversationId,
                    user: userId,
                    parentMessageId: parent,
                    sender: fromUser ? "User" : "GPT-4o",
                    text: fromUser ? sentence(25) + "?" : sentence(160) + ".",
                    isCreatedByUser: fromUser,
                    model: "gpt-4o",
                    endpoint: "openAI",
                    tokenCount: fromUser ? 40 : 220,
                    error: false,
                    unfinished: false,
                    createdAt: at,
                    updatedAt: at
                });
                ids.push(_id);
                parent = messageId;
            }
            convos.push({
                conversationId,
                title: sentence(5),
                user: userId,
                endpoint: "openAI",
                model: "gpt-4o",
                isArchived: false,
                messages: ids,
                createdAt: started,
                updatedAt: new Date(started.getTime() + 20 * 30000)
            });
        }
        await db.collection("messages").insertMany(messages);
        await db.collection("conversations").insertMany(convos);
        await client.close();
        const html = await (await fetch(base + "/")).text();
        const bundle = /src="\.?(\/assets\/index\.[^"]+\.js)"/.exec(html)?.[1];
        if (!bundle) throw new Error("no index bundle in index.html");
        return { base, token, cookie, bundle, conversationId: convos[convos.length - 1].conversationId };
    },

    scenarios(ctx) {
        const api = xhr(ctx.base, { authorization: `Bearer ${ctx.token}`, cookie: ctx.cookie });
        return [
            { name: "health", what: "GET /health, the container health check", path: "/health" },
            { name: "index", what: "GET /, the page, with a CSP nonce of its own each time", path: "/", headers: page({ cookie: ctx.cookie }) },
            {
                name: "bundle",
                what: "GET of the main bundle, 0.9 MB served from its .gz twin: a first visit, a new release",
                path: ctx.bundle,
                headers: script(ctx.base, { cookie: ctx.cookie })
            },
            { name: "config", what: "GET /api/config, the first call of every page load", path: "/api/config", headers: api },
            { name: "user", what: "GET /api/user, the signed in user", path: "/api/user", headers: api },
            { name: "endpoints", what: "GET /api/endpoints, the model menu", path: "/api/endpoints", headers: api },
            {
                name: "convos",
                what: "GET /api/convos, the sidebar: 25 conversations of 200",
                path: "/api/convos?limit=25&isArchived=false&sortBy=updatedAt&sortDirection=desc",
                headers: api
            },
            { name: "messages", what: "GET /api/messages/:id, opening a conversation of 20 messages", path: `/api/messages/${ctx.conversationId}`, headers: api }
        ];
    }
};
