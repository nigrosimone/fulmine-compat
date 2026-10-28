// A year of compute and outbound traffic for each arm, from results/bench/*.json and a day of use
// per active user. The day, the user counts and the prices are assumptions, all written below so
// anyone can change them and run it again.
//
//   node bench/cost.mjs
//   node bench/cost.mjs --users 250000
//   node bench/cost.mjs --x86            Fargate's x86 prices instead of ARM's
//   node bench/cost.mjs --write          also results/summary.json, what the fulmine site charts
//
// With results/bench/run-1, run-2, ... (one per CI job, each on its own machine) it reads them all:
// Express is the median of the runs, every other arm the median of its ratio to Express in the same run.

import fs from "node:fs";
import path from "node:path";

const RESULTS = path.resolve(import.meta.dirname, "..", "results", "bench");
const argv = process.argv.slice(2);
const flag = (name, fallback) => (argv.includes("--" + name) ? Number(argv[argv.indexOf("--" + name) + 1]) : fallback);

// AWS Fargate, Linux, us-east-1, on demand, October 2026, per vCPU-hour and per GB-hour. The
// machines these results come from are ARM, Neoverse N2 (GitHub's ARM runners), so ARM is the
// default; x86 costs more and its CPU time per request was not measured here.
const X86 = argv.includes("--x86");
const VCPU_HOUR = X86 ? 0.04048 : 0.03238;
const GB_HOUR = X86 ? 0.004445 : 0.00356;
// one Node process per task, since it runs JavaScript on one core: 1 vCPU and 2 GB. A process that
// needs less CPU means fewer tasks, and the memory goes with them. The resident memory of the two
// arms is within a few tens of MB, well inside the 2 GB either way.
const TASK_GB = flag("task-gb", 2);
const TASK_HOUR = VCPU_HOUR + TASK_GB * GB_HOUR;
// AWS data transfer out to the internet, first 10 TB a month
const EGRESS_GB = flag("egress", 0.09);
// an autoscaler keeps headroom: 50% CPU is the target of the Kubernetes HPA walkthrough
const UTILIZATION = flag("utilization", 0.5);
const USERS = argv.includes("--users") ? [flag("users")] : [10_000, 100_000, 1_000_000];

// requests per active user per day, by endpoint
const DAY = {
    actual: {
        // two visits a day: the page, the 16 files it loads revalidated, the session, the budget
        // list and a sync to catch up; then a sync each time the window comes back or something
        // changes, about 30
        index: 2,
        "bundle-304": 2 * 16,
        validate: 2,
        "list-files": 2,
        "sync-day": 2,
        "sync-idle": 30,
        // a release a month downloads the whole app again: 16 files, 6.2 MB, 5.4 main bundles
        bundle: 5.4 / 30
    },
    librechat: {
        // three visits a day, ten conversations opened, the chat itself left out
        index: 3,
        config: 3,
        user: 3,
        endpoints: 3,
        convos: 3,
        messages: 10,
        // a release every two weeks downloads the app again: 37 files, 8.8 main bundles
        bundle: 8.8 / 14
    }
};

const n = (v, d = 0) => v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
const read = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null);

/**
 * CPU microseconds and bytes out per active user per day, on each arm of one results file. Rows
 * measured before bytes were counted take them from `bytesFrom`: an unpatched fulmine sends the
 * same bodies as Express.
 */
function perUserDay(r, day, bytesFrom) {
    const out = {};
    for (const arm of r.arms) out[arm] = { us: 0, bytes: 0 };
    for (const [scenario, count] of Object.entries(day)) {
        const row = r.scenarios.find((s) => s.name === scenario && !s.skipped);
        if (!row) return null;
        const other = bytesFrom?.scenarios.find((s) => s.name === scenario)?.summary?.bytesPerReq?.express;
        for (const arm of r.arms) {
            // CPU per request at the fixed rate: a fleet runs below saturation, not at it
            out[arm].us += count * row.summary.fixed.usPerReq[arm];
            const bytes = row.summary.bytesPerReq?.[arm];
            out[arm].bytes += count * (Number.isFinite(bytes) ? bytes : (other ?? NaN));
        }
    }
    return out;
}

function median(values) {
    const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** The arms of a day, the endpoint ratios and the noise of one run directory, or null. */
function oneRun(dir, name, day) {
    const plain = read(path.join(dir, `${name}.json`));
    if (!plain) return null;
    const tuned = read(path.join(dir, `${name}.tuned.json`));
    const both = perUserDay(plain, day, tuned);
    if (!both?.express) return { plain, arms: null };
    const arms = { express: both.express, fulmine: both.fulmine };
    const t = tuned && perUserDay(tuned, day);
    if (t) {
        // against the Express of its own pass: on a shared machine the same server moves between passes
        arms["fulmine + patch"] = { us: both.express.us * (t["fulmine-tuned"].us / t.express.us), bytes: t["fulmine-tuned"].bytes };
    }
    return {
        plain,
        arms,
        // CPU per request against Express, endpoint by endpoint, without and with the patch
        endpoints: plain.scenarios
            .filter((s) => !s.skipped)
            .map((s) => {
                const ts = tuned?.scenarios.find((x) => x.name === s.name && !x.skipped);
                return {
                    name: s.name,
                    what: s.what,
                    plain: s.summary.usPerReq.express / s.summary.usPerReq.fulmine,
                    patch: ts ? ts.summary.usPerReq.express / ts.summary.usPerReq["fulmine-tuned"] : null
                };
            }),
        noise: read(path.join(dir, `${name}.null.json`))?.scenarios.map((s) => Math.abs(1 - s.summary.usPerReq.ratio))
    };
}

const RUN_DIRS = fs.existsSync(RESULTS) ? fs.readdirSync(RESULTS).filter((d) => /^run-\d+$/.test(d)).map((d) => path.join(RESULTS, d)) : [];
const DIRS = RUN_DIRS.length ? RUN_DIRS : [RESULTS];

// the same figures for a page to draw, written only with --write
const summary = { date: null, prices: null, runs: DIRS.length, projects: [] };

for (const [name, day] of Object.entries(DAY)) {
    const runs = DIRS.map((dir) => oneRun(dir, name, day)).filter(Boolean);
    if (!runs.length) continue;
    const plain = runs[0].plain;
    if (runs.some((r) => !r.arms)) {
        console.log(`${plain.title}: a scenario of the day is missing from the results\n`);
        continue;
    }
    const expressUs = median(runs.map((r) => r.arms.express.us));
    const arms = {};
    // how far apart the runs are, as CPU saved against Express: what a single run could have said
    const spread = {};
    for (const arm of Object.keys(runs[0].arms)) {
        if (runs.some((r) => !r.arms[arm])) continue;
        const ratios = runs.map((r) => r.arms[arm].us / r.arms.express.us);
        arms[arm] = { us: expressUs * median(ratios), bytes: median(runs.map((r) => r.arms[arm].bytes)) };
        if (arm !== "express") spread[arm] = [1 - Math.max(...ratios), 1 - Math.min(...ratios)];
    }
    summary.date ??= runs.map((r) => r.plain.env.date.slice(0, 10)).sort().at(-1);
    const entry = {
        name,
        title: plain.title,
        express: plain.env.express,
        fulmine: plain.env.fulmine,
        day: Object.fromEntries(Object.entries(arms).map(([arm, v]) => [arm, { cpuMs: v.us / 1000, mbOut: v.bytes / 1048576 }])),
        spread,
        endpoints: runs[0].endpoints.map((e) => {
            const all = runs.map((r) => r.endpoints.find((x) => x.name === e.name));
            return { name: e.name, what: e.what, plain: median(all.map((x) => x?.plain)), patch: median(all.map((x) => x?.patch)) };
        }),
        noise: runs.some((r) => r.noise) ? runs.flatMap((r) => r.noise ?? []) : undefined,
        year: {}
    };
    summary.projects.push(entry);
    const total = n(Object.values(day).reduce((a, b) => a + b, 0), 1);
    console.log(`${plain.title}: per active user a day, ${total} requests${runs.length > 1 ? `, median of ${runs.length} runs` : ""}`);
    for (const [arm, v] of Object.entries(arms)) {
        const range = runs.length > 1 && spread[arm] ? `, runs ${n(spread[arm][0] * 100)}% to ${n(spread[arm][1] * 100)}% less` : "";
        console.log(`  ${arm.padEnd(16)} ${n(v.us / 1000, 1)} ms of CPU, ${n(v.bytes / 1048576, 2)} MB out${range}`);
    }
    for (const users of USERS) {
        console.log(`  ${n(users)} active users, a year:`);
        const base = arms.express;
        for (const [arm, v] of Object.entries(arms)) {
            if (!v) continue;
            const year = (x) => {
                const taskHours = (x.us / 1e6) * users * 365 / 3600 / UTILIZATION;
                const gb = (x.bytes / 1073741824) * users * 365;
                return { taskHours, compute: taskHours * TASK_HOUR, gb, egress: gb * EGRESS_GB };
            };
            const y = year(v);
            const b = year(base);
            const total = y.compute + y.egress;
            const saved = arm === "express" ? "" : `, saves $${n(b.compute + b.egress - total)} (${n((1 - total / (b.compute + b.egress)) * 100)}%)`;
            (entry.year[users] ??= {})[arm] = { tasks: y.taskHours / (365 * 24), compute: y.compute, egress: y.egress, total };
            console.log(`    ${arm.padEnd(16)} ${n(y.taskHours / (365 * 24), 2)} tasks on average, compute $${n(y.compute)}, ${n(y.gb / 1024, 1)} TB out $${n(y.egress)}, total $${n(total)}${saved}`);
        }
    }
    console.log("");
}
summary.prices = { cloud: `AWS Fargate ${X86 ? "x86" : "ARM"}, us-east-1`, taskHour: TASK_HOUR, taskGb: TASK_GB, utilization: UTILIZATION, egressGb: EGRESS_GB };
if (argv.includes("--write")) fs.writeFileSync(path.join(RESULTS, "..", "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(
    `Fargate ${X86 ? "x86" : "ARM"}: a task of 1 vCPU and ${TASK_GB} GB at $${TASK_HOUR.toFixed(5)} an hour, ${Math.round(UTILIZATION * 100)}% CPU on average, ` +
        `$${EGRESS_GB} per GB out. Tasks are counted as a fraction, the view of a fleet large enough to scale smoothly: a small deployment pays its minimum task either way.`
);
