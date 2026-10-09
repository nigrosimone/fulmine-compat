// Markdown tables from results/bench/*.json, so the numbers in the readme come from the runs and not
// from a copy by hand.
//
//   node bench/report.mjs            every project with results
//   node bench/report.mjs actual

import fs from "node:fs";
import path from "node:path";

const RESULTS = path.resolve(import.meta.dirname, "..", "results", "bench");
const only = process.argv[2];

const n = (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }) : "-");
const pct = (v) => (Number.isFinite(v) ? `${v > 0 ? "-" : "+"}${Math.abs(Math.round(v * 100))}%` : "-");
const size = (v) => (!Number.isFinite(v) ? "-" : v >= 1048576 ? `${n(v / 1048576, 2)} MB` : v >= 1024 ? `${n(v / 1024, 1)} KB` : `${n(v)} B`);
const read = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null);

/** One table: Express against the plain fulmine arm, or with suffix ".tuned" against the patched one. */
function project(name, suffix = "") {
    const r = read(path.join(RESULTS, `${name}${suffix}.json`));
    if (!r) return "";
    const tuned = suffix === ".tuned";
    const floor = tuned ? null : read(path.join(RESULTS, `${name}.null.json`));
    const [a, b] = r.arms;
    const out = [
        `### ${r.title}${tuned ? `, with patches/${name}.diff` : ""}`,
        "",
        `${r.env.cpu}, one core for the server. Node ${r.env.node}, Express ${r.env.express}, fulmine ${r.env.fulmine}. ` +
            `Medians of ${r.env.opts.rounds} alternating rounds of ${r.env.opts.duration} s, ${r.env.opts.connections} keep-alive connections, no pipelining.`,
        "",
        "| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"
    ];
    for (const row of r.scenarios) {
        if (row.skipped) {
            out.push(`| ${row.name} | not measured: ${row.check.problems.join("; ")} | | | | | | | | | | | | |`);
            continue;
        }
        const s = row.summary;
        out.push(
            `| \`${row.name}\` | ${n(s.rps[a])} | ${n(s.rps[b])} | ${n(s.rps.ratio, 2)}x | ${n(s.usPerReq[a])} us | ${n(s.usPerReq[b])} us | ${pct(1 - s.usPerReq.ratio)} | ${n(s.fixed.rate)}/s | ${n(s.fixed.cpuShare[a] * 100)}% | ${n(s.fixed.cpuShare[b] * 100)}% | ${n(s.fixed.p99[a], 1)} ms | ${n(s.fixed.p99[b], 1)} ms | ${size(s.bytesPerReq?.[a])} | ${size(s.bytesPerReq?.[b])} |`
        );
    }
    if (!tuned) {
        out.push("", "| endpoint | what it is |", "| --- | --- |");
        for (const row of r.scenarios) out.push(`| \`${row.name}\` | ${row.what} |`);
    }
    if (r.memory) {
        out.push("", `Resident memory, idle after seeding and after the run: Express ${r.memory[a].idle} and ${r.memory[a].afterLoad} MB, fulmine ${r.memory[b].idle} and ${r.memory[b].afterLoad} MB.`);
    }
    if (floor) {
        const rows = floor.scenarios.filter((s) => !s.skipped);
        out.push(
            "",
            `Noise floor, Express against a second Express in the same conditions: req/s ratio ${rows.map((s) => `${s.name} ${n(s.summary.rps.ratio, 3)}`).join(", ")}; ` +
                `CPU per request ratio ${rows.map((s) => `${s.name} ${n(s.summary.usPerReq.ratio, 3)}`).join(", ")}.`
        );
    }
    return out.join("\n") + "\n";
}

const names = only
    ? [only]
    : fs
          .readdirSync(RESULTS)
          .filter((f) => f.endsWith(".json") && !f.includes(".null.") && !f.includes(".tuned."))
          .map((f) => f.slice(0, -5));
console.log(
    names
        .flatMap((name) => [project(name), project(name, ".tuned")])
        .filter(Boolean)
        .join("\n")
);
