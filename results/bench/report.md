### Actual Budget, sync server

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.0. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 4,004 | 7,817 | 1.95x | 250 us | 128 us | -49% | 2,000/s | 57% | 38% | 2.1 ms | 0.9 ms | 355 B | 356 B |
| `validate` | 1,765 | 2,151 | 1.22x | 567 us | 465 us | -18% | 880/s | 55% | 46% | 4.4 ms | 2.3 ms | 542 B | 520 B |
| `list-files` | 1,456 | 1,777 | 1.22x | 689 us | 563 us | -18% | 730/s | 53% | 44% | 9.7 ms | 7.4 ms | 704 B | 682 B |
| `sync-idle` | 468 | 498 | 1.07x | 2,144 us | 2,010 us | -7% | 230/s | 50% | 48% | 11.4 ms | 10.7 ms | 13.0 KB | 12.9 KB |
| `sync-day` | 228 | 232 | 1.02x | 4,402 us | 4,291 us | -3% | 110/s | 50% | 50% | 36.3 ms | 25.2 ms | 53.5 KB | 53.4 KB |
| `index` | 1,191 | 6,841 | 5.78x | 839 us | 146 us | -83% | 600/s | 61% | 17% | 5.9 ms | 0.7 ms | 4.8 KB | 4.9 KB |
| `bundle` | 186 | 239 | 1.27x | 5,367 us | 4,190 us | -21% | 93/s | 62% | 54% | 94.1 ms | 67.7 ms | 1.16 MB | 1.16 MB |
| `bundle-304` | 2,758 | 5,091 | 1.85x | 363 us | 196 us | -46% | 1,400/s | 62% | 37% | 3.0 ms | 1.1 ms | 660 B | 661 B |

| endpoint | what it is |
| --- | --- |
| `health` | GET /health, the container health check |
| `validate` | GET /account/validate, the session check on every client start |
| `list-files` | GET /sync/list-user-files, the budget picker |
| `sync-idle` | POST /sync/sync with nothing new, what an open budget sends over and over |
| `sync-day` | POST /sync/sync from a day back, a client catching up |
| `index` | GET /, the web app's index.html |
| `bundle` | GET of the main bundle, 1.2 MB: a first visit, a new release, a browser without cache |
| `bundle-304` | GET of the main bundle with If-None-Match, a returning browser |

Resident memory, idle after seeding and after the run: Express 297 and 281 MB, fulmine 305 and 389 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 1.018, validate 0.978, sync-idle 1.048; CPU per request ratio health 0.983, validate 1.023, sync-idle 0.955.

### Actual Budget, sync server, with patches/actual.diff

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.0. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 3,954 | 8,117 | 2.04x | 252 us | 123 us | -51% | 2,000/s | 58% | 37% | 1.8 ms | 0.9 ms | 355 B | 356 B |
| `validate` | 1,766 | 2,174 | 1.24x | 567 us | 458 us | -20% | 880/s | 58% | 47% | 5.7 ms | 2.3 ms | 542 B | 520 B |
| `list-files` | 1,426 | 1,800 | 1.26x | 702 us | 556 us | -21% | 710/s | 53% | 43% | 8.5 ms | 8.3 ms | 704 B | 682 B |
| `sync-idle` | 462 | 498 | 1.08x | 2,172 us | 2,007 us | -8% | 230/s | 50% | 47% | 12.4 ms | 9.5 ms | 12.8 KB | 12.8 KB |
| `sync-day` | 229 | 237 | 1.04x | 4,380 us | 4,200 us | -4% | 110/s | 50% | 50% | 29.3 ms | 23.7 ms | 53.3 KB | 53.2 KB |
| `index` | 1,137 | 6,835 | 6.10x | 880 us | 146 us | -84% | 570/s | 60% | 16% | 5.9 ms | 0.7 ms | 4.8 KB | 4.9 KB |
| `bundle` | 178 | 5,043 | 28.37x | 5,623 us | 198 us | -96% | 89/s | 59% | 4% | 98.5 ms | 0.7 ms | 1.17 MB | 216.6 KB |
| `bundle-304` | 2,666 | 4,757 | 1.79x | 375 us | 210 us | -44% | 1,300/s | 60% | 35% | 2.6 ms | 1.1 ms | 660 B | 683 B |

Resident memory, idle after seeding and after the run: Express 298 and 346 MB, fulmine 298 and 330 MB.

### LibreChat, API server

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.0. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 6,899 | 24,526 | 3.53x | 143 us | 41 us | -72% | 3,400/s | 66% | 26% | 1.6 ms | 0.4 ms | 571 B | 572 B |
| `index` | 627 | 783 | 1.23x | 1,577 us | 1,262 us | -20% | 310/s | 55% | 48% | 133.1 ms | 6.6 ms | 3.5 KB | 3.5 KB |
| `bundle` | 468 | 519 | 1.13x | 2,131 us | 1,920 us | -11% | 230/s | 42% | 37% | 99.8 ms | 95.4 ms | 235.3 KB | 234.0 KB |
| `config` | 260 | 281 | 1.06x | 3,786 us | 3,554 us | -6% | 130/s | 52% | 46% | 256.7 ms | 19.2 ms | 1.3 KB | 1.3 KB |
| `user` | 518 | 567 | 1.10x | 1,928 us | 1,761 us | -9% | 260/s | 53% | 48% | 141.4 ms | 7.7 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 476 | 522 | 1.10x | 2,097 us | 1,909 us | -10% | 240/s | 51% | 49% | 10.9 ms | 9.6 ms | 904 B | 905 B |
| `convos` | 252 | 260 | 1.03x | 3,936 us | 3,829 us | -3% | 130/s | 52% | 52% | 249.5 ms | 235.7 ms | 2.1 KB | 2.1 KB |
| `messages` | 244 | 250 | 1.03x | 4,064 us | 3,986 us | -1% | 120/s | 51% | 50% | 239.6 ms | 211.3 ms | 4.9 KB | 4.9 KB |

| endpoint | what it is |
| --- | --- |
| `health` | GET /health, the container health check |
| `index` | GET /, the page, with a CSP nonce of its own each time |
| `bundle` | GET of the main bundle, 0.9 MB served from its .gz twin: a first visit, a new release |
| `config` | GET /api/config, the first call of every page load |
| `user` | GET /api/user, the signed in user |
| `endpoints` | GET /api/endpoints, the model menu |
| `convos` | GET /api/convos, the sidebar: 25 conversations of 200 |
| `messages` | GET /api/messages/:id, opening a conversation of 20 messages |

Resident memory, idle after seeding and after the run: Express 424 and 614 MB, fulmine 455 and 599 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 1.156, config 1.058, convos 1.090; CPU per request ratio health 0.867, config 0.933, convos 0.928.

### LibreChat, API server, with patches/librechat.diff

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.0. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 5,947 | 22,761 | 3.84x | 168 us | 44 us | -74% | 3,000/s | 57% | 24% | 1.5 ms | 0.4 ms | 571 B | 572 B |
| `index` | 649 | 1,686 | 2.55x | 1,539 us | 589 us | -61% | 320/s | 55% | 22% | 126.8 ms | 1.8 ms | 3.5 KB | 3.5 KB |
| `bundle` | 480 | 5,220 | 10.78x | 2,083 us | 191 us | -91% | 240/s | 42% | 9% | 103.7 ms | 0.8 ms | 234.8 KB | 182.3 KB |
| `config` | 266 | 351 | 1.32x | 3,758 us | 2,843 us | -24% | 130/s | 51% | 38% | 208.8 ms | 14.5 ms | 1.3 KB | 1.3 KB |
| `user` | 525 | 703 | 1.33x | 1,905 us | 1,421 us | -25% | 260/s | 51% | 44% | 9.1 ms | 128.7 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 479 | 617 | 1.29x | 2,070 us | 1,616 us | -22% | 240/s | 52% | 49% | 11.4 ms | 187.5 ms | 904 B | 905 B |
| `convos` | 257 | 292 | 1.13x | 3,896 us | 3,373 us | -13% | 130/s | 51% | 41% | 210.5 ms | 215.6 ms | 2.1 KB | 2.1 KB |
| `messages` | 254 | 287 | 1.13x | 3,927 us | 3,470 us | -12% | 130/s | 55% | 44% | 237.2 ms | 201.8 ms | 4.8 KB | 4.8 KB |

Resident memory, idle after seeding and after the run: Express 425 and 581 MB, fulmine 479 and 571 MB.

