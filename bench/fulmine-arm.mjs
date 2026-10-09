// Preloaded with --import on the fulmine arms: every require("express") and import "express" in the
// process gets fulmine.js instead, the same as `npm i express@npm:fulmine.js`, without touching the
// project's node_modules. So the arms can run at the same time from one checkout.
//
// FULMINE_ARM_MAP, a JSON object of specifier to file, sends more modules elsewhere: the tuned arm
// uses it to stand in for the few lines a project changes to use fulmine's own compression and
// static files. Those files are in bench/tuned, and the same change as a diff in patches/.
import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const home = process.env.FULMINE_HOME || new URL("../arms/fulmine", import.meta.url).pathname;
// resolved once here: for a require() the default resolver ignores a parentURL passed down to it
const fulmine = pathToFileURL(createRequire(home + "/package.json").resolve("fulmine.js")).href;
const map = { express: fulmine };
for (const [specifier, file] of Object.entries(JSON.parse(process.env.FULMINE_ARM_MAP || "{}"))) {
    map[specifier] = pathToFileURL(file).href;
}
// the files in bench/tuned get fulmine itself when they ask for it, or a wrapper would wrap itself
map["fulmine.js"] = fulmine;
let told = false;

registerHooks({
    resolve(specifier, context, next) {
        const url = map[specifier];
        if (!url) return next(specifier, context);
        if (!told) {
            told = true;
            process.stderr.write(`fulmine-arm: express resolves to ${map.express}\n`);
        }
        return { url, format: "commonjs", shortCircuit: true };
    }
});
