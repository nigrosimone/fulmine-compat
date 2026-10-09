// Actual Budget's sync server, the build its Docker image runs (`node build/app.js`), each arm on a
// data directory of its own. The requests are the ones the web client sends: login, the session
// check, the budget list, the sync it repeats while a budget is open, and the web app itself.

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { page, script, xhr } from "./browser.mjs";

const PASSWORD = "bench-password-1";
const EPOCH = "1970-01-01T00:00:00.000Z-0000-0000000000000000";
const NODE_ID = crypto.randomBytes(8).toString("hex");
const DAY = 24 * 60 * 60 * 1000;

// the protobuf of packages/crdt/src/proto/sync.proto, by hand: four message types, no dependency
function varint(n) {
    const out = [];
    while (n > 127) {
        out.push((n & 127) | 128);
        n >>>= 7;
    }
    out.push(n);
    return Buffer.from(out);
}
const bytesField = (no, value) => {
    const b = Buffer.isBuffer(value) ? value : Buffer.from(value);
    return Buffer.concat([varint((no << 3) | 2), varint(b.length), b]);
};
const message = (dataset, row, column, value) =>
    Buffer.concat([bytesField(1, dataset), bytesField(2, row), bytesField(3, column), bytesField(4, value)]);
const envelope = (timestamp, content) => Buffer.concat([bytesField(1, timestamp), bytesField(3, content)]);
const syncRequest = ({ messages = [], fileId, groupId, since }) =>
    Buffer.concat([...messages.map((m) => bytesField(1, m)), bytesField(2, fileId), bytesField(3, groupId), bytesField(6, since)]);

const timestamp = (millis, counter = 0) =>
    `${new Date(millis).toISOString()}-${counter.toString(16).toUpperCase().padStart(4, "0")}-${NODE_ID}`;

/** About three months of a household budget: 400 transactions, eight fields each, plus some edits. */
function history(now) {
    const out = [];
    const columns = ["account", "date", "amount", "payee", "category", "notes", "cleared", "imported_id"];
    let millis = now - 90 * DAY;
    for (let t = 0; t < 400; t++) {
        const row = crypto.randomUUID();
        millis += Math.floor((90 * DAY) / 420);
        columns.forEach((column, i) => {
            const value = column === "amount" ? `N:${-Math.floor(Math.random() * 20000)}` : `S:${crypto.randomBytes(6).toString("hex")}`;
            out.push(envelope(timestamp(millis, i), message("transactions", row, column, value)));
        });
    }
    for (let e = 0; e < 300; e++) {
        millis += 1000;
        out.push(envelope(timestamp(millis), message("transactions", crypto.randomUUID(), "notes", "S:edited")));
    }
    return { messages: out, last: timestamp(millis), dayBefore: timestamp(millis - DAY) };
}

async function call(base, path, init = {}) {
    const res = await fetch(base + path, init);
    const text = await res.text();
    if (res.status >= 400) throw new Error(`${init.method || "GET"} ${path}: ${res.status} ${text.slice(0, 200)}`);
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export default {
    name: "actual",
    title: "Actual Budget, sync server",
    dir: "actual",
    cwd: "packages/sync-server",
    command: ["build/app.js"],
    ready: "/health",
    env: ({ port, dataDir }) => ({
        NODE_ENV: "production",
        ACTUAL_PORT: String(port),
        ACTUAL_DATA_DIR: dataDir,
        // behind a reverse proxy on the same host, as most installs are, so the rate limit of 500
        // requests a minute counts every client on its own
        ACTUAL_TRUSTED_PROXIES: "127.0.0.1/32"
    }),

    // patches/actual.diff: preCompressed on the express.static() call, and the twins written at build
    tuned: {
        map: { express: "express-precompressed.cjs" },
        prepare(dir) {
            const build = path.join(dir, "packages", "desktop-client", "build");
            const html = path.join(build, "index.html");
            if (fs.existsSync(html + ".br")) return;
            console.log(execFileSync(process.execPath, [path.join(import.meta.dirname, "..", "precompress.mjs"), build]).toString().trim());
        }
    },

    async seed(base) {
        const json = (body) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        await call(base, "/account/bootstrap", json({ password: PASSWORD }));
        const token = (await call(base, "/account/login", json({ loginMethod: "password", password: PASSWORD }))).data.token;
        const auth = { "x-actual-token": token };

        const fileId = crypto.randomUUID();
        const upload = await call(base, "/sync/upload-user-file", {
            method: "POST",
            headers: {
                ...auth,
                "content-type": "application/encrypted-file",
                "x-actual-name": "Bench%20budget",
                "x-actual-file-id": fileId,
                "x-actual-format": "2"
            },
            body: crypto.randomBytes(256 * 1024)
        });
        const groupId = upload.groupId;

        const { messages, last, dayBefore } = history(Date.now());
        for (let i = 0; i < messages.length; i += 500) {
            const res = await fetch(base + "/sync/sync", {
                method: "POST",
                headers: { ...auth, "content-type": "application/actual-sync" },
                body: syncRequest({ messages: messages.slice(i, i + 500), fileId, groupId, since: EPOCH })
            });
            if (res.status !== 200) throw new Error(`sync seed: ${res.status} ${await res.text()}`);
        }

        const html = await call(base, "/");
        const bundle = /<script[^>]+src="(\/static\/js\/index\.[^"]+\.js)"/.exec(html)?.[1];
        if (!bundle) throw new Error("no index bundle in index.html");
        // with the browser's Accept-Encoding: a server that keeps a brotli twin gives it an ETag of its own
        const head = await fetch(base + bundle, { headers: script(base) });
        await head.arrayBuffer();
        return { base, token, fileId, groupId, last, dayBefore, bundle, etag: head.headers.get("etag"), modified: head.headers.get("last-modified") };
    },

    scenarios(ctx) {
        const auth = xhr(ctx.base, { "x-actual-token": ctx.token });
        const sync = (since) => ({
            method: "POST",
            path: "/sync/sync",
            headers: { ...auth, "content-type": "application/actual-sync", origin: ctx.base },
            body: syncRequest({ fileId: ctx.fileId, groupId: ctx.groupId, since }),
            forwardedFor: true
        });
        return [
            { name: "health", what: "GET /health, the container health check", path: "/health", forwardedFor: true },
            { name: "validate", what: "GET /account/validate, the session check on every client start", path: "/account/validate", headers: auth, forwardedFor: true },
            { name: "list-files", what: "GET /sync/list-user-files, the budget picker", path: "/sync/list-user-files", headers: auth, forwardedFor: true },
            { name: "sync-idle", what: "POST /sync/sync with nothing new, what an open budget sends over and over", ...sync(ctx.last) },
            { name: "sync-day", what: "POST /sync/sync from a day back, a client catching up", ...sync(ctx.dayBefore) },
            { name: "index", what: "GET /, the web app's index.html", path: "/", headers: page(), forwardedFor: true },
            {
                name: "bundle",
                what: "GET of the main bundle, 1.2 MB: a first visit, a new release, a browser without cache",
                path: ctx.bundle,
                headers: script(ctx.base),
                forwardedFor: true
            },
            {
                name: "bundle-304",
                what: "GET of the main bundle with If-None-Match, a returning browser",
                path: ctx.bundle,
                headers: script(ctx.base, { "if-none-match": ctx.etag, "if-modified-since": ctx.modified }),
                forwardedFor: true
            }
        ];
    }
};
