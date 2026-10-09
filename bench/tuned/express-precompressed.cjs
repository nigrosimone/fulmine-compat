// `require("express")` on Actual's tuned arm: fulmine, with `preCompressed: true` added to the one
// express.static() call, which is the diff. The twins are written at build, see bench/precompress.mjs.
const fulmine = require("fulmine.js");

module.exports = new Proxy(fulmine, {
    get(target, key, receiver) {
        if (key === "static") return (root, options) => target.static(root, { ...options, preCompressed: true });
        return Reflect.get(target, key, receiver);
    }
});
