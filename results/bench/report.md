### Actual Budget, sync server

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.2.1, fulmine 5.22.0. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 3,835 | 7,570 | 1.97x | 261 us | 132 us | -49% | 1,900/s | 56% | 36% | 1.8 ms | 0.8 ms | - | - |
| `validate` | 1,741 | 2,161 | 1.25x | 575 us | 463 us | -20% | 870/s | 55% | 46% | 5.2 ms | 3.4 ms | - | - |
| `list-files` | 1,468 | 1,785 | 1.22x | 682 us | 560 us | -18% | 730/s | 53% | 45% | 8.6 ms | 7.5 ms | - | - |
| `sync-idle` | 416 | 454 | 1.09x | 2,409 us | 2,204 us | -9% | 210/s | 50% | 47% | 11.2 ms | 11.7 ms | - | - |
| `sync-day` | 215 | 220 | 1.03x | 4,637 us | 4,546 us | -2% | 110/s | 55% | 53% | 34.3 ms | 42.1 ms | - | - |
| `index` | 1,208 | 6,144 | 5.09x | 828 us | 163 us | -80% | 600/s | 61% | 18% | 6.4 ms | 0.8 ms | - | - |
| `bundle-304` | 2,840 | 4,573 | 1.62x | 352 us | 219 us | -38% | 1,400/s | 60% | 38% | 2.6 ms | 1.2 ms | - | - |
| `bundle` | 177 | 254 | 1.46x | 5,652 us | 3,935 us | -32% | 89/s | 71% | 44% | 101.0 ms | 62.6 ms | 1.16 MB | 1.16 MB |

| endpoint | what it is |
| --- | --- |
| `health` | GET /health, the container health check |
| `validate` | GET /account/validate, the session check on every client start |
| `list-files` | GET /sync/list-user-files, the budget picker |
| `sync-idle` | POST /sync/sync with nothing new, what an open budget sends over and over |
| `sync-day` | POST /sync/sync from a day back, a client catching up |
| `index` | GET /, the web app's index.html |
| `bundle-304` | GET of the main bundle with If-None-Match, a returning browser |
| `bundle` | GET of the main bundle, 1.2 MB: a first visit, a new release, a browser without cache |

Resident memory, idle after seeding and after the run: Express 297 and 284 MB, fulmine 304 and 184 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 0.987, validate 1.007, sync-idle 0.994; CPU per request ratio health 1.012, validate 0.994, sync-idle 1.007.

### Actual Budget, sync server, with patches/actual.diff

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.2.1, fulmine 5.22.0. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 3,713 | 7,455 | 2.01x | 269 us | 134 us | -50% | 1,900/s | 58% | 37% | 1.9 ms | 0.9 ms | 355 B | 356 B |
| `validate` | 1,727 | 2,177 | 1.26x | 579 us | 458 us | -21% | 860/s | 57% | 45% | 4.4 ms | 2.6 ms | 542 B | 520 B |
| `list-files` | 1,416 | 1,767 | 1.25x | 707 us | 566 us | -20% | 710/s | 53% | 44% | 8.7 ms | 8.3 ms | 704 B | 682 B |
| `sync-idle` | 413 | 450 | 1.10x | 2,426 us | 2,221 us | -9% | 210/s | 50% | 48% | 10.4 ms | 13.6 ms | 15.4 KB | 15.4 KB |
| `sync-day` | 213 | 219 | 1.03x | 4,677 us | 4,524 us | -3% | 110/s | 52% | 50% | 22.2 ms | 24.2 ms | 55.8 KB | 55.8 KB |
| `index` | 1,128 | 6,104 | 5.40x | 886 us | 164 us | -81% | 560/s | 59% | 17% | 6.0 ms | 0.8 ms | 4.8 KB | 4.9 KB |
| `bundle` | 178 | 4,526 | 25.31x | 5,620 us | 221 us | -96% | 89/s | 61% | 4% | 88.7 ms | 0.8 ms | 1.16 MB | 216.5 KB |
| `bundle-304` | 2,845 | 4,437 | 1.57x | 352 us | 226 us | -36% | 1,400/s | 60% | 39% | 2.5 ms | 1.2 ms | 660 B | 683 B |

Resident memory, idle after seeding and after the run: Express 297 and 285 MB, fulmine 304 and 323 MB.

### LibreChat, API server

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.2.1, fulmine 5.22.0. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 5,430 | 22,975 | 4.22x | 184 us | 43 us | -76% | 2,700/s | 56% | 22% | 1.4 ms | 0.4 ms | - | - |
| `index` | 640 | 797 | 1.24x | 1,556 us | 1,244 us | -20% | 320/s | 56% | 49% | 124.8 ms | 6.5 ms | - | - |
| `config` | 264 | 277 | 1.06x | 3,783 us | 3,599 us | -6% | 130/s | 51% | 49% | 209.7 ms | 211.2 ms | - | - |
| `user` | 519 | 566 | 1.08x | 1,927 us | 1,764 us | -8% | 260/s | 51% | 49% | 9.5 ms | 7.8 ms | - | - |
| `endpoints` | 474 | 520 | 1.10x | 2,108 us | 1,918 us | -9% | 240/s | 53% | 48% | 11.1 ms | 9.4 ms | - | - |
| `convos` | 243 | 260 | 1.06x | 4,117 us | 3,837 us | -7% | 120/s | 52% | 49% | 251.0 ms | 163.0 ms | - | - |
| `messages` | 230 | 245 | 1.06x | 4,332 us | 3,990 us | -8% | 120/s | 55% | 48% | 270.0 ms | 165.2 ms | - | - |
| `bundle` | 482 | 538 | 1.11x | 2,070 us | 1,853 us | -10% | 240/s | 53% | 50% | 175.8 ms | 136.8 ms | 234.9 KB | 235.4 KB |

| endpoint | what it is |
| --- | --- |
| `health` | GET /health, the container health check |
| `index` | GET /, the page, with a CSP nonce of its own each time |
| `config` | GET /api/config, the first call of every page load |
| `user` | GET /api/user, the signed in user |
| `endpoints` | GET /api/endpoints, the model menu |
| `convos` | GET /api/convos, the sidebar: 25 conversations of 200 |
| `messages` | GET /api/messages/:id, opening a conversation of 20 messages |
| `bundle` | GET of the main bundle, 0.9 MB served from its .gz twin: a first visit, a new release |

Resident memory, idle after seeding and after the run: Express 423 and 555 MB, fulmine 433 and 555 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 0.991, config 0.959, convos 0.984; CPU per request ratio health 1.011, config 1.022, convos 1.018.

### LibreChat, API server, with patches/librechat.diff

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.2.1, fulmine 5.22.0. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 5,435 | 23,255 | 4.24x | 180 us | 43 us | -76% | 2,700/s | 57% | 22% | 1.7 ms | 0.4 ms | 571 B | 572 B |
| `index` | 638 | 1,588 | 2.47x | 1,565 us | 614 us | -60% | 320/s | 56% | 22% | 128.6 ms | 1.8 ms | 3.5 KB | 3.5 KB |
| `bundle` | 487 | 4,902 | 10.06x | 2,050 us | 203 us | -90% | 240/s | 42% | 9% | 103.5 ms | 0.8 ms | 235.7 KB | 182.3 KB |
| `config` | 262 | 345 | 1.32x | 3,813 us | 2,894 us | -24% | 130/s | 49% | 39% | 204.7 ms | 96.2 ms | 1.3 KB | 1.3 KB |
| `user` | 509 | 701 | 1.34x | 1,964 us | 1,425 us | -25% | 250/s | 50% | 38% | 9.0 ms | 5.6 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 473 | 548 | 1.15x | 2,107 us | 1,820 us | -13% | 240/s | 53% | 44% | 10.8 ms | 8.8 ms | 903 B | 905 B |
| `convos` | 239 | 291 | 1.21x | 4,134 us | 3,408 us | -17% | 120/s | 50% | 40% | 263.2 ms | 221.8 ms | 2.1 KB | 2.1 KB |
| `messages` | 232 | 285 | 1.23x | 4,308 us | 3,465 us | -19% | 120/s | 52% | 42% | 244.3 ms | 165.6 ms | 4.9 KB | 4.8 KB |

Resident memory, idle after seeding and after the run: Express 423 and 558 MB, fulmine 442 and 518 MB.

