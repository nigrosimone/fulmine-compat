// Writes a .br and a .gz twin next to every text asset of a build, what a build step does before
// express.static(dir, { preCompressed: true }) can serve them. Brotli at 11 and gzip at 9: it runs
// once per release, so the slowest setting costs nothing.
//
//   node bench/precompress.mjs <dir>

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// the same files as the find in patches/actual.diff
const TEXT = /\.(js|css|html|svg)$/;
let files = 0;
let before = 0;
let after = 0;

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (TEXT.test(entry.name)) {
            const data = fs.readFileSync(full);
            if (data.length < 1024) continue;
            const br = zlib.brotliCompressSync(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length } });
            fs.writeFileSync(full + ".br", br);
            fs.writeFileSync(full + ".gz", zlib.gzipSync(data, { level: 9 }));
            files++;
            before += data.length;
            after += br.length;
        }
    }
}

walk(path.resolve(process.argv[2]));
console.log(`${files} files, ${(before / 1048576).toFixed(1)} MB, ${(after / 1048576).toFixed(1)} MB as brotli`);
