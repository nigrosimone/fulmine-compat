#!/bin/bash
# Prepares a Linux machine for bench.mjs, from the repository root: Node 24, fulmine from npm, and a
# project at the commit of its submodule, installed and built the way its Docker image builds it.
# Needs git, curl, wrk, perf and taskset.
#
#   bash bench/setup.sh actual
#   bash bench/setup.sh librechat
set -e
ROOT=$(pwd)
NODE_VERSION=24.18.1
FULMINE_VERSION=5.25.7
ARCH=$(uname -m | sed 's/aarch64/arm64/;s/x86_64/x64/')

if [ ! -x node24/bin/node ]; then
  curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$ARCH.tar.xz" | tar -xJ
  mv "node-v$NODE_VERSION-linux-$ARCH" node24
fi
export PATH="$ROOT/node24/bin:$PATH"

# fulmine as anyone gets it from npm, not a checkout
mkdir -p arms/fulmine
[ -f arms/fulmine/package.json ] || echo '{"private":true}' > arms/fulmine/package.json
(cd arms/fulmine && npm i "fulmine.js@$FULMINE_VERSION" --no-audit --no-fund)

# the submodule, at exactly the commit the results were taken on
fetch() {
  git -c core.longpaths=true submodule update --init --depth 1 -- "$1"
}

case "$1" in
  actual)
    fetch actual
    cd actual
    node .yarn/releases/yarn-4.17.1.cjs install
    # the newest Express in the range the project asks for, 5.3.0 in the results: only the lockfile changes
    node .yarn/releases/yarn-4.17.1.cjs up "express@^5.2.1"
    # the web app and the server, as sync-server.Dockerfile does
    NODE_OPTIONS=--max_old_space_size=8192 node .yarn/releases/yarn-4.17.1.cjs build:server
    ;;
  librechat)
    fetch librechat
    cd librechat
    npm ci --no-audit --no-fund
    # the newest Express in the range the project asks for, 5.3.0 in the results: only the lockfile changes
    npm update express --no-audit --no-fund
    NODE_OPTIONS=--max_old_space_size=8192 npm run frontend
    cd "$ROOT"
    # the MongoDB its docker-compose.yml runs
    MONGO_ARCH=$(uname -m | sed 's/arm64/aarch64/')
    ls -d mongodb-linux-* > /dev/null 2>&1 || curl -fsSL "https://fastdl.mongodb.org/linux/mongodb-linux-$MONGO_ARCH-ubuntu2404-8.0.20.tgz" | tar -xz
    ;;
  *)
    echo "usage: bash bench/setup.sh actual|librechat"
    exit 1
    ;;
esac
