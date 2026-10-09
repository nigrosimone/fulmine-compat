// `require("compression")` on the tuned arm: fulmine's own middleware, which takes the same options
// and compresses a whole response in one call. The diff is `app.use(express.compression())`.
module.exports = (options) => require("fulmine.js").compression(options);
