# fulmine-compat

Takes real open source projects that run on Express 5, swaps Express for
[fulmine.js](https://github.com/nigrosimone/fulmine.js), and checks three things:

1. **It works**: their own test suites, written by people who never heard of fulmine, still pass
   without a line of their code changed, one setting at most.
2. **It costs less**: their own endpoints, called the way their own web client calls them, take less
   CPU per request, still without a line changed.
3. **A few lines cost even less**: the same endpoints with a small patch that moves the project to
   fulmine's own compression and static files.

Nothing in the projects is written by us, which is the point. A hello world says little about an
application with a database, twenty middlewares and a session check on every request.

## Results

The tests on fulmine 5.22.0, the endpoints on fulmine 5.25.0 against Express 5.3.0, October 2026.

### Their tests

| project | its own Express | plain Express 5 | fulmine |
| --- | --- | --- | --- |
| [Actual Budget](https://github.com/actualbudget/actual), sync server | 595 passed | 595 passed | 595 passed |
| [LibreChat](https://github.com/danny-avila/LibreChat), API | 4,840 passed, 6 failed | 4,818 passed, 28 failed | 4,842 passed, 4 failed |
| [n8n](https://github.com/n8n-io/n8n), CLI integration suite | 5,618 passed, 9 failed | 6,123 passed, 14 failed | 6,109 passed, 10 failed |

**No test fails on fulmine that passes on Express.** What fails on fulmine fails on Express as well:

- LibreChat: the 4 are among the 6 that fail on its own Express on this machine, which runs the
  suites on Windows. Plain Express 5 loses 22 more in `AuthService.spec.js`, a harness effect of the
  control arm: the same tests pass on the other two.
- n8n: a full run times out a different handful of tests at 10 s on every arm. The four files that
  failed on fulmine and not on plain Express 5 were run again alone (`n8n-recheck`): there fulmine
  fails exactly the six tests that n8n's own Express fails, all of them timeouts, and plain Express 5
  five of the same six.

One setting, in two projects: `body methods`, the one documented difference their tests walk into.
Express reads a body on any verb, fulmine by default only on POST, PUT, PATCH and QUERY. Actual's
tests send a body with GET and DELETE, and LibreChat's DELETE routes take a JSON filter, so in
production LibreChat needs `app.set("body methods", [..., "DELETE"])`. The benchmarks below run
fulmine with its defaults, which reads no body on the GET endpoints they measure either way.

Versions: fulmine 5.22.0; Express 5.2.1 in Actual and LibreChat, 5.1.0 in n8n; the projects at the
commit their submodule points to.

### Their endpoints

Measured on one ARM core (Oracle Cloud A1, Neoverse N1), Node 24, fulmine 5.25.0 against Express
5.3.0, how in Part 2. Express 5.3.0 is the newest in the range both projects ask for, and
`bench/setup.sh` puts it in their lockfile. CPU per request, summed over a day of use of one active
user, the mix in [`bench/cost.mjs`](bench/cost.mjs):

| | Actual Budget | LibreChat |
| --- | ---: | ---: |
| Express | 96.9 ms | 89.4 ms |
| fulmine, no change | 83.7 ms, **-14%** | 86.7 ms, **-3%** |
| fulmine and the patch | 82.5 ms, **-15%** | 67.3 ms, **-25%** |
| the patch | [1 line, and 2 at build](patches/actual.diff) | [5 lines](patches/librechat.diff) |

On October 9, with fulmine 5.22.0 against Express 5.2.1 and before the GC settings of Part 2, it was
-11% and -12% on Actual, -9% and -28% on LibreChat. Since then fulmine is faster on static files,
Express 5.3 is faster on LibreChat, and LibreChat's figures no longer depend on the GC state each
server happened to be in.

Endpoint by endpoint, CPU per request against Express:

- Where the framework is the work, the gain is large: the health check 2x on Actual and 3.7x on
  LibreChat, Actual's `index.html` 5.9x, a returning browser revalidating Actual's bundle 1.9x.
- Where a database is the work, it is smaller and still there: 1.04x to 1.26x on Actual's SQLite
  endpoints, 1.03x to 1.11x on LibreChat's MongoDB ones, and 1.23x to 1.29x on LibreChat's with the
  patch.
- With the patch, the web app itself: Actual's main bundle 27x, since it goes out as a 216 KB brotli
  twin instead of 1.16 MB of plain JavaScript, and LibreChat's 10x.

The noise of the machine, Express against a second Express, is under 1% on Actual and under 3% on
LibreChat. So LibreChat's -3% without the patch is at the edge of it, and everything else is a
result. Every table, with req/s, latency and bytes:
[`results/bench/report.md`](results/bench/report.md).

**What it is worth in money** depends on scale, and these servers are light: a million active users
a day on Fargate ARM is about two tasks, around $750 a year of compute. Without a change, fulmine
takes 14% of that on Actual, and 3% on LibreChat. With the patch, 15% to 25%, and the total bill
with outbound traffic falls 16% (LibreChat) and 24% (Actual), most of it from the web app going out
compressed. That last part is not fulmine's alone: Express serves precompressed files too through a
plugin, which LibreChat already uses with gzip. What fulmine adds is doing it with one option, and
spending less CPU per file. `node bench/cost.mjs` prints the year for 10 thousand to 1 million
users, with every price and assumption at the top of the file.

## Part 1: the test suites

### Three arms, because a red row alone means nothing

Every suite runs three times:

- **pinned**: the Express the project itself depends on, untouched. Says the harness works.
- **express5**: plain Express 5 from npm. This is the control.
- **fulmine**: `express` resolved to the fulmine checkout.

A test that fails on `express5` and on `fulmine` is an Express 4 to 5 difference, or a project that
is simply not ready for Express 5, and it is not ours. Only what passes on `express5` and fails on
`fulmine` is a bug here. `diff` prints exactly that list.

### Running the tests

```sh
node run.js list
node run.js setup n8n              # the submodule at its commit, install, build
node run.js test n8n               # all three arms
node run.js test n8n fulmine       # one arm
node run.js diff n8n               # the three summaries, then what only fulmine fails
```

Logs and results per arm go in `results/tests/<project>.<arm>.log` and `.json`.

`FULMINE_DIR` points at the checkout under test, `../fulmine.js` by default.

### How the swap works

No fork and no `overrides`: npm refuses an override that touches a direct dependency, and a fork is
one more thing to keep up to date. Instead the runner finds every real `express` directory in the
project tree, renames it to `express.__pinned__`, and puts a junction in its place. pnpm's
`.pnpm/express@x` store directory is the real one and every workspace symlink follows it, so one
junction moves the whole monorepo. The `pinned` arm renames the backups back, and `test` always ends
by restoring them.

### Adding a project

A submodule at the commit to test, `git submodule add <url> <dir>` and a checkout of that commit,
and one entry in `projects.json`:

| key | what it is |
| --- | --- |
| `dir` | the submodule, if not the entry name |
| `install`, `prepare`, `build` | run once by `setup`, in that order |
| `cwd` | where the test command runs, if not the repo root |
| `test` | the test command, the same one for all three arms |
| `exclude` | path fragments to leave alone, for a monorepo carrying copies the suite never loads |
| `fulmineSettings` | settings to apply to every application, for a documented difference the project walks into. The arm becomes a package called express that is a Proxy around fulmine |
| `summary` | regex for the line with the counts, printed by `diff` |
| `failPattern` | regex for the lines that name a failing test |
| `notes` | what a reader has to know before believing the numbers |

Commands run through Git Bash, so a POSIX env prefix works even where the project ships a `:win`
variant of its script for cmd.

### What the tests do not prove

Most of these suites drive the app with supertest, which passes the request to `http.createServer`
and therefore through fulmine's node:http shim, not through uWebSockets.js. What is tested is the
Express surface, which is what "drop-in" means, but it is not the production path. Part 2 is.

## Part 2: the endpoints under load

`bench/bench.mjs` starts the project twice from one checkout, as its Docker image starts it:

- **express**: untouched.
- **fulmine**: the same command with `--import bench/fulmine-arm.mjs`, a resolve hook that gives
  `fulmine.js` to every `require("express")` and `import "express"`. It is what
  `npm i express@npm:fulmine.js` does, without touching node_modules, so both servers can run at the
  same time. The arm checks in its log that the hook ran, and the other arm that it did not.

Each arm gets its own data directory or database and the same seed: a user, a session, and enough
data to look like a real account (three months of a household budget in Actual, two hundred
conversations in LibreChat). Then, for every endpoint:

1. Both arms answer the request once and must agree on the status and, within 5%, on the size.
2. **Saturation**: wrk with 50 keep-alive connections, no pipelining, in alternating rounds
   (express then fulmine, then fulmine then express, ...) so a drift of the machine lands on both.
   The figure is the median of the per-round ratios. CPU time of the server process comes from
   `/proc` around each round, so CPU per request includes every thread, garbage collector too.
3. **Fixed rate**: the same rounds at half the throughput of the slower arm, with random gaps
   between requests like many independent clients. Here the question is "same traffic, how busy is
   the core", and the p99 latency.

The server gets one core (`taskset`), wrk two others, a database the fourth. Requests carry the
headers a desktop Chrome sends, cookies and tokens included, and Actual's go through a trusted proxy
address so its rate limit of 500 a minute sees many clients and not one.

Both servers run with `--no-memory-reducer` and get one full GC after seeding,
[`bench/steady.cjs`](bench/steady.cjs). On one core the GC state of a big heap lasts minutes. In
alternating rounds a server waits idle while the other is loaded, V8's memory reducer shrinks its
heap, and LibreChat then ran up to a third more instructions per request; the server booted second
could also start the rounds in a long marking. A server under steady traffic has neither, so this
takes out the pauses of the bench, the same way for both arms.

`--null` puts a second Express in place of fulmine: what it reports is the noise of the machine, and
a difference smaller than that is not a result.

`--tuned` puts fulmine with the project's patch in place of plain fulmine. The patch is in
`patches/<project>.diff`, the real change; the run does not apply it to the checkout, it gets the
same result through the same resolve hook, sending `compression` and `express-static-gzip` to
fulmine's own (`bench/tuned/`), so all arms still run from one checkout. Actual's twins are written by
`bench/precompress.mjs`, what the `find` in its patch does at build.

n8n's endpoints are not measured: it builds its server with `http.createServer(app)`, so without a
change fulmine serves it through node:http, which is a different and smaller story.

### Running the benchmarks

On Linux with `wrk`, `perf` and `taskset`, from the repository root:

```sh
bash bench/setup.sh actual          # Node 24, fulmine from npm, the project at its commit, built
node24/bin/node bench/bench.mjs actual
node24/bin/node bench/bench.mjs actual --null --scenario health,sync-idle
node24/bin/node bench/report.mjs    # every table, from results/bench/*.json
node24/bin/node bench/cost.mjs      # a year of compute and traffic; --write also results/summary.json
```

`--scenario a,b` runs some endpoints only, `--rounds` and `--duration` change the length, and
`--server-cpu`, `--load-cpus` and `--side-cpu` move the processes. Projects are defined in
`bench/projects/*.mjs`: how to start them, how to seed them, and what to ask.

### What the benchmarks do not prove

- One machine, one core per server. A real deployment has more cores and more processes; CPU per
  request is the figure that carries over, not req/s.
- The requests are the ones the web client sends, but the mix and the rates are ours, not
  production traffic. Each endpoint is measured alone.
- The databases are on the same machine and warm. With a database across a network the server waits
  longer per request, and the CPU it spends stays the same.
- Long lived streams (LLM answers in LibreChat, WebSocket pushes in n8n) are left out. There the
  server waits on someone else, and fulmine is not faster at waiting.
