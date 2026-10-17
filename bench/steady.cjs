// Preloaded in every arm with --no-memory-reducer. On one core the GC state of a big heap lasts minutes,
// and in the wrong one LibreChat ran 8% to 34% more instructions per request: the arm idle between
// rounds got its heap shrunk, the one booted second started in a long marking. SIGUSR2, sent once
// after seeding, runs a full GC.
const v8 = require("v8");
const vm = require("vm");

// gc() in a context of its own, so the app does not see a global gc
v8.setFlagsFromString("--expose-gc");
const gc = vm.runInNewContext("gc");
v8.setFlagsFromString("--no-expose-gc");

process.on("SIGUSR2", () => gc());
