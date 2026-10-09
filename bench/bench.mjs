// Boots a real project twice, once on the Express it ships with and once with express resolved to
// fulmine, and loads its own endpoints in alternating rounds. Linux only: it needs taskset, perf
// and wrk. The server gets one core, wrk two others, a database the fourth.
//
//   node bench/bench.mjs actual
//   node bench/bench.mjs actual --scenario sync-idle --rounds 7
//   node bench/bench.mjs actual --null     a second Express in place of fulmine: the noise floor
//   node bench/bench.mjs actual --tuned    fulmine with the few lines in patches/ applied

import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { once } from "node:events";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.COMPAT_ROOT || path.resolve(HERE, "..");
const HOOK = path.join(HERE, "fulmine-arm.mjs");
const RESULTS = path.join(ROOT, "results", "bench");
const WORK = process.env.BENCH_WORK || path.join(os.homedir(), "bench-work");

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
    const i = argv.indexOf("--" + name);
    if (i < 0) return fallback;
    const value = argv[i + 1];
    return value === undefined || value.startsWith("--") ? true : value;
};
const projectName = argv[0];
const opts = {
    rounds: Number(flag("rounds", 5)),
    duration: Number(flag("duration", 10)),
    warmup: Number(flag("warmup", 5)),
    connections: Number(flag("connections", 50)),
    threads: Number(flag("threads", 2)),
    serverCpu: String(flag("server-cpu", "1")),
    loadCpus: String(flag("load-cpus", "2-3")),
    sideCpu: String(flag("side-cpu", "0")),
    // the fixed rate is this share of the slower arm's saturation throughput
    rateShare: Number(flag("rate-share", 0.5)),
    scenario: flag("scenario", null),
    nullRun: flag("null", false) === true,
    tuned: flag("tuned", false) === true,
    keep: flag("keep", false) === true
};

const CLK_TCK = Number(execFileSync("getconf", ["CLK_TCK"]).toString().trim());

function log(...args) {
    console.log(new Date().toISOString().slice(11, 19), ...args);
}

/** utime + stime of every thread of the process, in ms. */
function cpuMs(pid) {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    return ((Number(fields[11]) + Number(fields[12])) * 1000) / CLK_TCK;
}

function rssMb(pid) {
    const status = fs.readFileSync(`/proc/${pid}/status`, "utf8");
    return Math.round(Number(/VmRSS:\s+(\d+)/.exec(status)[1]) / 1024);
}

function median(values) {
    const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    if (!sorted.length) return NaN;
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** A Lua string literal that carries any byte, for a binary body. */
function luaString(value) {
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
    let out = '"';
    for (const b of bytes) {
        out += b >= 32 && b < 127 && b !== 34 && b !== 92 ? String.fromCharCode(b) : "\\" + String(b).padStart(3, "0");
    }
    return out + '"';
}

/**
 * The wrk script for one scenario. `forwardedFor` gives every request a client address of its own
 * from the benchmarking range, as a reverse proxy would, so a per-client rate limit sees many
 * clients rather than one. `rate` paces each connection so the whole run offers that many req/s.
 */
function writeLua(file, scenario, rate) {
    const lines = [`wrk.method = ${luaString(scenario.method || "GET")}`, `wrk.path = ${luaString(scenario.path)}`];
    for (const [k, v] of Object.entries(scenario.headers || {})) lines.push(`wrk.headers[${luaString(k)}] = ${luaString(v)}`);
    if (scenario.body != null) lines.push(`wrk.body = ${luaString(scenario.body)}`);
    // each wrk thread is a Lua state of its own, and seeding them all with the time alone would
    // give them the same sequence
    lines.push('math.randomseed(os.time() + tonumber(tostring({}):match("0x(%x+)") or "0", 16) % 1000003)');
    if (scenario.forwardedFor) {
        lines.push(
            "request = function()",
            '  wrk.headers["X-Forwarded-For"] = "198." .. math.random(18, 19) .. "." .. math.random(0, 255) .. "." .. math.random(1, 254)',
            "  return wrk.format()",
            "end"
        );
    }
    if (rate) {
        // exponential gaps, so the connections do not fire in step and arrivals look like many
        // independent clients rather than one burst of fifty every few milliseconds
        const ms = (1000 * opts.connections) / rate;
        lines.push(`delay = function() return -math.log(1 - math.random()) * ${ms.toFixed(3)} end`);
    }
    fs.writeFileSync(file, lines.join("\n") + "\n");
}

function toMs(text) {
    const m = /([\d.]+)(us|ms|s|m)/.exec(text);
    if (!m) return NaN;
    return Number(m[1]) * { us: 0.001, ms: 1, s: 1000, m: 60000 }[m[2]];
}

function parseWrk(out) {
    const latency = {};
    for (const p of ["50", "90", "99"]) {
        const m = new RegExp(`^\\s+${p}%\\s+(\\S+)`, "m").exec(out);
        latency["p" + p] = m ? toMs(m[1]) : NaN;
    }
    const sock = /Socket errors: connect (\d+), read (\d+), write (\d+), timeout (\d+)/.exec(out);
    const read = /requests in [\d.]+\w+, ([\d.]+)(B|KB|MB|GB) read/.exec(out);
    return {
        requests: Number((/(\d+) requests in/.exec(out) || [])[1]),
        rps: Number((/Requests\/sec:\s+([\d.]+)/.exec(out) || [])[1]),
        bad: Number((/Non-2xx or 3xx responses: (\d+)/.exec(out) || [0, 0])[1]),
        bytes: read ? Number(read[1]) * { B: 1, KB: 1024, MB: 1048576, GB: 1073741824 }[read[2]] : NaN,
        socketErrors: sock ? sock.slice(1).reduce((a, b) => a + Number(b), 0) : 0,
        latency
    };
}

function run(cmd, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
        let out = "";
        child.stdout.on("data", (d) => (out += d));
        child.stderr.on("data", (d) => (out += d));
        child.on("error", reject);
        child.on("exit", (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}: ${out}`))));
    });
}

/** One round of load on one arm: wrk for `seconds`, the server's CPU time and instructions around it. */
async function measure(arm, scenario, seconds, rate) {
    const lua = path.join(WORK, `${arm.name}.lua`);
    writeLua(lua, scenario.byArm[arm.name], rate);
    const perfOut = path.join(WORK, `${arm.name}.perf`);
    const perf = spawn("perf", ["stat", "-x,", "-e", "task-clock,instructions:u", "-p", String(arm.child.pid), "-o", perfOut], {
        stdio: "ignore"
    });
    await sleep(150);
    const cpuBefore = cpuMs(arm.child.pid);
    const started = performance.now();
    const out = await run("taskset", [
        "-c",
        opts.loadCpus,
        "wrk",
        `-t${opts.threads}`,
        `-c${opts.connections}`,
        `-d${seconds}s`,
        "--latency",
        "-s",
        lua,
        `http://127.0.0.1:${arm.port}${scenario.byArm[arm.name].path}`
    ]);
    const wallMs = performance.now() - started;
    const cpu = cpuMs(arm.child.pid) - cpuBefore;
    perf.kill("SIGINT");
    await once(perf, "exit");
    const perfText = fs.existsSync(perfOut) ? fs.readFileSync(perfOut, "utf8") : "";
    const instructions = Number((/^([\d.]+),[^,]*,instructions/m.exec(perfText) || [])[1]);
    const w = parseWrk(out);
    return {
        ...w,
        cpuMs: Math.round(cpu),
        cpuShare: cpu / wallMs,
        usPerReq: (cpu * 1000) / w.requests,
        bytesPerReq: w.bytes / w.requests,
        instrPerReq: instructions / w.requests,
        rss: rssMb(arm.child.pid)
    };
}

async function startArm(project, arm) {
    const dataDir = path.join(WORK, `${project.name}-${arm.name}`);
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.mkdirSync(dataDir, { recursive: true });
    const env = { ...process.env, ...project.env({ port: arm.port, dataDir, arm: arm.name }) };
    if (arm.tuned) {
        const map = Object.fromEntries(Object.entries(project.tuned.map).map(([k, file]) => [k, path.join(HERE, "tuned", file)]));
        env.FULMINE_ARM_MAP = JSON.stringify(map);
    }
    const args = ["-c", opts.serverCpu, process.execPath, ...(arm.fulmine ? ["--import", HOOK] : []), ...project.command];
    arm.logFile = path.join(WORK, `${project.name}-${arm.name}.log`);
    const fd = fs.openSync(arm.logFile, "w");
    arm.child = spawn("taskset", args, { cwd: path.join(ROOT, project.dir, project.cwd || ""), env, stdio: ["ignore", fd, fd] });
    arm.base = `http://127.0.0.1:${arm.port}`;
    const deadline = Date.now() + (project.bootSeconds || 120) * 1000;
    for (;;) {
        if (arm.child.exitCode !== null) throw new Error(`${arm.name} exited during boot, see ${arm.logFile}`);
        try {
            const res = await fetch(arm.base + project.ready, { signal: AbortSignal.timeout(2000) });
            if (res.status < 500) break;
        } catch {}
        if (Date.now() > deadline) throw new Error(`${arm.name} not ready after ${project.bootSeconds || 120}s`);
        await sleep(500);
    }
    // the arm is what it says it is, or nothing measured below means anything
    const said = fs.readFileSync(arm.logFile, "utf8").includes("fulmine-arm: express resolves to");
    if (said !== arm.fulmine) throw new Error(`${arm.name}: the fulmine hook ${said ? "ran" : "did not run"}`);
    log(`${arm.name} up on ${arm.port}, pid ${arm.child.pid}, ${rssMb(arm.child.pid)} MB`);
}

/**
 * One request with exactly the scenario's headers. Not fetch: given If-None-Match it adds
 * Cache-Control: no-cache, as the spec says, and the server rightly answers 200 instead of 304.
 */
function exchange(port, s) {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: "127.0.0.1", port, path: s.path, method: s.method || "GET", headers: s.headers }, (res) => {
            let bytes = 0;
            res.on("data", (d) => (bytes += d.length));
            res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, bytes }));
        });
        req.on("error", reject);
        req.end(s.body ?? undefined);
    });
}

/** Every scenario answered by both arms the same way before a single round is run. */
async function check(arms, scenario) {
    const seen = {};
    for (const arm of arms) {
        const s = scenario.byArm[arm.name];
        const res = await exchange(arm.port, s);
        seen[arm.name] = { status: res.status, bytes: res.bytes, type: res.headers["content-type"], encoding: res.headers["content-encoding"] };
    }
    const [a, b] = arms.map((arm) => seen[arm.name]);
    const problems = [];
    if (a.status !== b.status) problems.push(`status ${a.status} against ${b.status}`);
    if (a.status >= 400) problems.push(`status ${a.status}`);
    // the tuned arm may answer brotli where the other answers gzip: then only the status compares
    if (a.encoding === b.encoding && Math.abs(a.bytes - b.bytes) > Math.max(16, a.bytes * 0.05)) problems.push(`body ${a.bytes} against ${b.bytes} bytes`);
    return { seen, problems };
}

async function main() {
    if (!projectName) {
        console.log("usage: node bench/bench.mjs <project> [--scenario name] [--rounds n] [--duration s] [--null]");
        process.exit(1);
    }
    const project = (await import(pathToFileURL(path.join(HERE, "projects", projectName + ".mjs")).href)).default;
    fs.mkdirSync(WORK, { recursive: true });
    fs.mkdirSync(RESULTS, { recursive: true });

    const second = opts.nullRun
        ? { name: "express-b", port: 5103, fulmine: false }
        : opts.tuned
          ? { name: "fulmine-tuned", port: 5104, fulmine: true, tuned: true }
          : { name: "fulmine", port: 5102, fulmine: true };
    const arms = [{ name: "express", port: 5101, fulmine: false }, second];
    if (opts.tuned) {
        if (!project.tuned) throw new Error(`${project.name} has no tuned arm`);
        await project.tuned.prepare?.(path.join(ROOT, project.dir));
    }

    const side = project.side ? await project.side({ cpu: opts.sideCpu, work: WORK }) : null;
    const stopAll = () => {
        for (const arm of arms) arm.child?.kill("SIGTERM");
        side?.stop();
    };
    process.on("SIGINT", () => {
        stopAll();
        process.exit(130);
    });

    try {
        for (const arm of arms) await startArm(project, arm);
        for (const arm of arms) {
            arm.ctx = await project.seed(arm.base, { arm: arm.name, side });
            arm.idleRss = rssMb(arm.child.pid);
            log(`${arm.name} seeded, ${arm.idleRss} MB`);
        }

        // the scenario list comes from each arm's own seed: tokens and ids differ between the two
        const names = project.scenarios(arms[0].ctx).map((s) => s.name);
        const scenarios = names
            .filter((name) => !opts.scenario || opts.scenario.split(",").includes(name))
            .map((name) => {
                const byArm = {};
                for (const arm of arms) byArm[arm.name] = project.scenarios(arm.ctx).find((s) => s.name === name);
                return { name, what: byArm[arms[0].name].what, byArm };
            });

        const env = {
            date: new Date().toISOString(),
            cpu: (/Model name:\s+(.*)/.exec(execFileSync("lscpu").toString()) || [])[1] || os.cpus()[0].model,
            kernel: os.release(),
            node: process.version,
            fulmine: JSON.parse(fs.readFileSync(path.join(ROOT, "arms/fulmine/node_modules/fulmine.js/package.json"), "utf8")).version,
            express: createRequire(path.join(ROOT, project.dir, project.cwd || "", "x.js"))("express/package.json").version,
            opts
        };
        const results = { project: project.name, title: project.title, env, arms: arms.map((a) => a.name), scenarios: [] };

        for (const scenario of scenarios) {
            const verdict = await check(arms, scenario);
            if (verdict.problems.length) {
                log(`${scenario.name}: SKIPPED, ${verdict.problems.join("; ")}`);
                results.scenarios.push({ name: scenario.name, what: scenario.what, check: verdict, skipped: true });
                continue;
            }
            log(`${scenario.name}: ${JSON.stringify(verdict.seen)}`);
            const row = { name: scenario.name, what: scenario.what, date: new Date().toISOString(), check: verdict, saturation: [], fixed: [] };

            for (const arm of arms) await measure(arm, scenario, opts.warmup, null);
            for (let r = 0; r < opts.rounds; r++) {
                const order = r % 2 ? [...arms].reverse() : arms;
                const round = {};
                for (const arm of order) round[arm.name] = await measure(arm, scenario, opts.duration, null);
                row.saturation.push(round);
                log(`${scenario.name} sat ${r + 1}: ${arms.map((a) => `${a.name} ${Math.round(round[a.name].rps)}/s ${round[a.name].usPerReq.toFixed(0)}us`).join(", ")}`);
            }

            const slowest = Math.min(...arms.map((a) => median(row.saturation.map((r) => r[a.name].rps))));
            const rate = Number((slowest * opts.rateShare).toPrecision(2));
            row.rate = rate;
            for (let r = 0; r < opts.rounds; r++) {
                const order = r % 2 ? [...arms].reverse() : arms;
                const round = {};
                for (const arm of order) round[arm.name] = await measure(arm, scenario, opts.duration, rate);
                row.fixed.push(round);
                log(`${scenario.name} @${rate}/s ${r + 1}: ${arms.map((a) => `${a.name} ${(round[a.name].cpuShare * 100).toFixed(0)}% cpu p99 ${round[a.name].latency.p99}ms`).join(", ")}`);
            }
            row.summary = summarize(row, arms);
            results.scenarios.push(row);
            save(project, results);
        }
        for (const arm of arms) arm.endRss = rssMb(arm.child.pid);
        results.memory = Object.fromEntries(arms.map((a) => [a.name, { idle: a.idleRss, afterLoad: a.endRss }]));
        const file = save(project, results);
        console.log("\n" + table(results));
        log(`written ${file}`);
    } finally {
        if (!opts.keep) stopAll();
    }
}

/**
 * The results file. A run of some scenarios only replaces those in the file and keeps the rest,
 * each row with the date it was measured on.
 */
function save(project, results) {
    const file = path.join(RESULTS, `${project.name}${opts.nullRun ? ".null" : opts.tuned ? ".tuned" : ""}.json`);
    let out = results;
    if (opts.scenario && fs.existsSync(file)) {
        out = JSON.parse(fs.readFileSync(file, "utf8"));
        for (const row of results.scenarios) {
            const i = out.scenarios.findIndex((s) => s.name === row.name);
            if (i >= 0) out.scenarios[i] = row;
            else out.scenarios.push(row);
        }
    }
    fs.writeFileSync(file, JSON.stringify(out, null, 2));
    return file;
}

/** Per-round ratios, so a drift of the machine lands on both arms of the same round. */
function summarize(row, arms) {
    const [a, b] = arms.map((x) => x.name);
    const pick = (rounds, arm, key) => median(rounds.map((r) => (key === "p99" ? r[arm].latency.p99 : r[arm][key])));
    const ratio = (rounds, key) => median(rounds.map((r) => r[b][key] / r[a][key]));
    return {
        rps: { [a]: pick(row.saturation, a, "rps"), [b]: pick(row.saturation, b, "rps"), ratio: ratio(row.saturation, "rps") },
        usPerReq: { [a]: pick(row.saturation, a, "usPerReq"), [b]: pick(row.saturation, b, "usPerReq"), ratio: ratio(row.saturation, "usPerReq") },
        instrPerReq: { [a]: pick(row.saturation, a, "instrPerReq"), [b]: pick(row.saturation, b, "instrPerReq") },
        bytesPerReq: { [a]: pick(row.saturation, a, "bytesPerReq"), [b]: pick(row.saturation, b, "bytesPerReq") },
        fixed: {
            rate: row.rate,
            cpuShare: { [a]: pick(row.fixed, a, "cpuShare"), [b]: pick(row.fixed, b, "cpuShare"), ratio: ratio(row.fixed, "cpuShare") },
            usPerReq: { [a]: pick(row.fixed, a, "usPerReq"), [b]: pick(row.fixed, b, "usPerReq") },
            p50: { [a]: median(row.fixed.map((r) => r[a].latency.p50)), [b]: median(row.fixed.map((r) => r[b].latency.p50)) },
            p99: { [a]: pick(row.fixed, a, "p99"), [b]: pick(row.fixed, b, "p99") }
        },
        bad: row.saturation.concat(row.fixed).reduce((n, r) => n + arms.reduce((m, x) => m + r[x.name].bad + r[x.name].socketErrors, 0), 0)
    };
}

function table(results) {
    const [a, b] = results.arms;
    const n = (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }) : "-");
    const lines = [
        `| endpoint | ${a} req/s | ${b} req/s | x | ${a} CPU us/req | ${b} CPU us/req | at a fixed rate | ${a} CPU | ${b} CPU | ${a} p99 | ${b} p99 |`,
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"
    ];
    for (const row of results.scenarios) {
        if (row.skipped) {
            lines.push(`| ${row.name} | skipped: ${row.check.problems.join("; ")} | | | | | | | | | |`);
            continue;
        }
        const s = row.summary;
        lines.push(
            `| ${row.name} | ${n(s.rps[a])} | ${n(s.rps[b])} | ${n(s.rps.ratio, 2)}x | ${n(s.usPerReq[a])} | ${n(s.usPerReq[b])} | ${n(s.fixed.rate)}/s | ${n(s.fixed.cpuShare[a] * 100)}% | ${n(s.fixed.cpuShare[b] * 100)}% | ${n(s.fixed.p99[a], 1)} ms | ${n(s.fixed.p99[b], 1)} ms |`
        );
    }
    return lines.join("\n");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
