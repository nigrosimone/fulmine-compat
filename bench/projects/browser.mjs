// The headers a desktop Chrome sends, so the server parses what it parses in production rather than
// the three headers wrk sends on its own.

const common = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    "accept-language": "en-US,en;q=0.9,it;q=0.8",
    "accept-encoding": "gzip, deflate, br, zstd",
    "sec-ch-ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"'
};

/** A fetch() from the web app to its own API. */
export const xhr = (origin, extra = {}) => ({
    ...common,
    accept: "application/json, text/plain, */*",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    referer: origin + "/",
    ...extra
});

/** The browser opening the page. */
export const page = (extra = {}) => ({
    ...common,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "cache-control": "max-age=0",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    ...extra
});

/** A script the page loads. */
export const script = (origin, extra = {}) => ({
    ...common,
    accept: "*/*",
    "sec-fetch-dest": "script",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    referer: origin + "/",
    ...extra
});
