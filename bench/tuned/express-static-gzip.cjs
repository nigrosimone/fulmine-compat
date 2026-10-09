// `require("express-static-gzip")` on the tuned arm: fulmine's static over the same .br and .gz
// twins the build already wrote, `express.static(root, { preCompressed: true, ... })` in the diff.
module.exports = (root, options = {}) =>
    require("fulmine.js").static(root, {
        index: options.index,
        setHeaders: options.setHeaders || options.serveStatic?.setHeaders,
        preCompressed: true
    });
