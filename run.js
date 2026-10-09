// Runs a third party test suite three times: on the express it pins, on plain express 5, and on
// fulmine. Only what fails on fulmine and passes on express 5 is ours. The swap is a junction over
// every real express directory in the tree, so nothing in the project has to know about it.

"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PROJECTS = JSON.parse(fs.readFileSync(path.join(ROOT, "projects.json"), "utf8"));
const FULMINE = process.env.FULMINE_DIR || path.resolve(ROOT, "..", "fulmine.js");
const BASH = process.env.COMPAT_BASH || "C:/Program Files/Git/bin/bash.exe";
const BACKUP = ".__pinned__";
const OUT = path.join(ROOT, "results", "tests");

/** Run a command in the project, streaming to a log, and give back what happened. */
function shell(cmd, cwd, logPath) {
    const started = Date.now();
    const shellPath = fs.existsSync(BASH) ? BASH : true;
    const res = spawnSync(cmd, { cwd, shell: shellPath, encoding: "utf8", maxBuffer: 1 << 28 });
    const out = (res.stdout || "") + (res.stderr || "");
    if (logPath) {
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.writeFileSync(logPath, out);
    }
    process.stdout.write(out.length > 4000 ? out.slice(-4000) : out);
    return { code: res.status, ms: Date.now() - started, out };
}

/** Every express package directory that is really there, symlinks and pnpm's aliases skipped. */
function findExpress(dir, into = []) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return into;
    }
    for (const e of entries) {
        if (e.isSymbolicLink()) continue;
        const full = path.join(dir, e.name);
        if (e.name === "node_modules") {
            scanModules(full, into);
        } else if (e.isDirectory() && e.name !== ".git") {
            findExpress(full, into);
        }
    }
    return into;
}

/**
 * Whether a directory called express is the package rather than its typings.
 *
 * @param {string} dir
 * @returns {boolean}
 */
function isExpressPackage(dir) {
    try {
        return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).name === "express";
    } catch {
        return false;
    }
}

function scanModules(nm, into) {
    let entries;
    try {
        entries = fs.readdirSync(nm, { withFileTypes: true });
    } catch {
        return;
    }
    for (const e of entries) {
        const full = path.join(nm, e.name);
        if (e.name === ".pnpm") {
            for (const p of fs.readdirSync(full)) scanModules(path.join(full, p, "node_modules"), into);
            continue;
        }
        if (e.isSymbolicLink() || !e.isDirectory()) continue;
        if (e.name.startsWith("@")) {
            scanModules(full, into);
            continue;
        }
        if (e.name === "express" || e.name === "express" + BACKUP) {
            // @types/express is called express too, and swapping the typings for the
            // package says nothing about anything
            if (isExpressPackage(full) || isExpressPackage(full + BACKUP)) into.push(full.replace(BACKUP, ""));
        }
        scanModules(path.join(full, "node_modules"), into);
    }
}

/**
 * A package called express that is Fulmine with settings already applied, for a project that needs
 * one of the documented differences turned off. A Proxy, so Router, static, json and the rest come
 * through untouched and only the application the call returns is adjusted.
 *
 * @param {string} name
 * @param {Record<string, any>} settings
 * @returns {string}
 */
function settingsShim(name, settings) {
    const home = path.join(ROOT, "arms", `fulmine-${name}`);
    fs.mkdirSync(home, { recursive: true });
    const lines = [
        `const fulmine = require(${JSON.stringify(FULMINE)});`,
        `const settings = ${JSON.stringify(settings)};`,
        "module.exports = new Proxy(fulmine, {",
        "    apply(target, thisArg, args) {",
        "        const app = Reflect.apply(target, thisArg, args);",
        "        for (const [key, value] of Object.entries(settings)) app.set(key, value);",
        "        return app;",
        "    }",
        "});"
    ];
    fs.writeFileSync(path.join(home, "package.json"), JSON.stringify({ name: "express", version: "5.0.0", main: "index.js" }));
    fs.writeFileSync(path.join(home, "index.js"), lines.join("\n"));
    return home;
}

/** The directory an arm points express at. `pinned` has none: it puts the original back. */
function armTarget(arm, name) {
    if (arm === "pinned") return null;
    if (arm === "fulmine") {
        const settings = PROJECTS[name]?.fulmineSettings;
        return settings ? settingsShim(name, settings) : FULMINE;
    }
    const version = arm.replace("express", "");
    const home = path.join(ROOT, "arms", arm);
    const target = path.join(home, "node_modules", "express");
    if (!fs.existsSync(target)) {
        fs.mkdirSync(home, { recursive: true });
        fs.writeFileSync(path.join(home, "package.json"), '{"name":"arm","private":true}\n');
        shell(`npm i express@${version} --no-audit --no-fund`, home, null);
    }
    return target;
}

function swap(dirs, arm, name) {
    const target = armTarget(arm, name);
    for (const dir of dirs) {
        const backup = dir + BACKUP;
        if (fs.existsSync(dir) && !fs.existsSync(backup)) fs.renameSync(dir, backup);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
        if (target) fs.symlinkSync(target, dir, "junction");
        else if (fs.existsSync(backup)) fs.renameSync(backup, dir);
    }
    return target;
}

/** What the run says about itself: the summary line, and every line that names a failure. */
function digest(out, project) {
    const summary = new RegExp(project.summary || "(\d+) (?:passing|passed|failing|failed)", "g");
    const fails = new RegExp(project.failPattern || "^\\s*(?:\u00d7|\u2715|\u2716|FAIL|\\d+\\) )(.*)$", "gm");
    return {
        summary: [...new Set(out.match(summary) || [])],
        // the duration goes, or the same suite failing on two arms reads as two different lines
        failures: [...new Set((out.match(fails) || []).map((l) => l.trim().replace(/\s*\(?[\d.]+ ?m?s\)?$/, "")))].sort()
    };
}

function projectDir(name) {
    const project = PROJECTS[name];
    return path.join(ROOT, project.dir || name);
}

function setup(name) {
    const project = PROJECTS[name];
    const dir = projectDir(name);
    // every project is a submodule pinned to the commit the results were taken on
    if (!fs.existsSync(path.join(dir, "package.json"))) {
        shell(`git -c core.longpaths=true submodule update --init --depth 1 -- "${path.relative(ROOT, dir)}"`, ROOT, null);
    }
    if (project.install) shell(project.install, dir, path.join(OUT, `${name}-install.log`));
    if (project.prepare) shell(project.prepare, dir, path.join(OUT, `${name}-prepare.log`));
    if (project.build) shell(project.build, dir, path.join(OUT, `${name}-build.log`));
}

function test(name, arms) {
    const project = PROJECTS[name];
    const dir = projectDir(name);
    // a monorepo carries copies belonging to packages the suite never loads, and swapping those
    // says nothing while risking a failure that is not the framework's
    const dirs = findExpress(dir).filter((found) => !(project.exclude ?? []).some((part) => found.includes(part)));
    console.log(`${dirs.length} express director${dirs.length === 1 ? "y" : "ies"} in ${name}`);
    for (const arm of arms) {
        const target = swap(dirs, arm, name);
        console.log(`\n=== ${name} on ${arm}${target ? " (" + target + ")" : ""}`);
        const where = project.cwd ? path.join(dir, project.cwd) : dir;
        const log = path.join(OUT, `${name}.${arm}.log`);
        const run = shell(project.test, where, log);
        const result = { arm, code: run.code, ms: run.ms, ...digest(run.out, project) };
        fs.writeFileSync(path.join(OUT, `${name}.${arm}.json`), JSON.stringify(result, null, 2));
        console.log(`--- ${arm}: exit ${run.code}, ${(run.ms / 1000).toFixed(1)}s, ${result.summary.join(" ") || "no summary"}`);
    }
    swap(dirs, "pinned", name);
}

function diff(name) {
    const read = (arm) => {
        const file = path.join(OUT, `${name}.${arm}.json`);
        return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
    };
    const control = read("express5");
    const ours = read("fulmine");
    for (const arm of ["pinned", "express5", "fulmine"]) {
        const r = read(arm);
        if (r) console.log(`${arm.padEnd(9)} exit ${r.code}  ${r.summary.join(" ")}  (${r.failures.length} failure lines)`);
    }
    if (!control || !ours) return;
    const only = ours.failures.filter((f) => !control.failures.includes(f));
    console.log(`\nfails on fulmine and not on express 5: ${only.length}`);
    for (const f of only) console.log("  " + f);
}

const [cmd, name, ...rest] = process.argv.slice(2);
if (cmd === "list" || !cmd) console.log(Object.keys(PROJECTS).join("\n"));
else if (cmd === "setup") setup(name);
else if (cmd === "test") test(name, rest.length ? rest : ["pinned", "express5", "fulmine"]);
else if (cmd === "diff") diff(name);
else console.log("usage: node run.js [list|setup <p>|test <p> [arm...]|diff <p>]");
