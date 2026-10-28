### Actual Budget, sync server

Neoverse-N2, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.12. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 5,258 | 15,476 | 2.91x | 190 us | 65 us | -66% | 2,600/s | 53% | 23% | 1.4 ms | 0.4 ms | 355 B | 356 B |
| `validate` | 2,185 | 3,084 | 1.41x | 458 us | 324 us | -29% | 1,100/s | 53% | 38% | 3.3 ms | 3.2 ms | 542 B | 520 B |
| `list-files` | 1,835 | 2,474 | 1.35x | 545 us | 404 us | -26% | 920/s | 52% | 39% | 4.8 ms | 3.1 ms | 704 B | 682 B |
| `sync-idle` | 761 | 847 | 1.11x | 1,315 us | 1,181 us | -10% | 380/s | 51% | 46% | 12.5 ms | 8.4 ms | 7.8 KB | 7.7 KB |
| `sync-day` | 367 | 384 | 1.05x | 2,731 us | 2,608 us | -5% | 180/s | 50% | 48% | 28.4 ms | 18.1 ms | 48.3 KB | 48.1 KB |
| `index` | 1,688 | 13,277 | 7.87x | 593 us | 75 us | -87% | 840/s | 61% | 14% | 4.9 ms | 0.5 ms | 4.8 KB | 4.9 KB |
| `bundle` | 255 | 353 | 1.39x | 3,914 us | 2,833 us | -28% | 130/s | 62% | 41% | 68.9 ms | 42.3 ms | 1.16 MB | 1.16 MB |
| `bundle-304` | 3,840 | 8,599 | 2.24x | 261 us | 116 us | -55% | 1,900/s | 58% | 28% | 2.1 ms | 0.7 ms | 660 B | 661 B |

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

Resident memory, idle after seeding and after the run: Express 299 and 466 MB, fulmine 306 and 421 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 0.999, validate 1.010, list-files 1.007, sync-idle 1.005, sync-day 0.980, index 1.016, bundle 1.046, bundle-304 1.008; CPU per request ratio health 1.001, validate 0.990, list-files 0.992, sync-idle 0.995, sync-day 1.021, index 0.985, bundle 0.955, bundle-304 0.991.

### Actual Budget, sync server, with patches/actual.diff

Neoverse-N2, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.12. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 5,342 | 15,948 | 2.97x | 187 us | 63 us | -66% | 2,700/s | 54% | 24% | 1.4 ms | 0.4 ms | 355 B | 356 B |
| `validate` | 2,199 | 3,090 | 1.41x | 455 us | 324 us | -29% | 1,100/s | 52% | 38% | 2.9 ms | 2.2 ms | 542 B | 520 B |
| `list-files` | 1,832 | 2,505 | 1.37x | 546 us | 399 us | -27% | 920/s | 52% | 39% | 4.5 ms | 2.4 ms | 704 B | 682 B |
| `sync-idle` | 768 | 860 | 1.12x | 1,305 us | 1,163 us | -11% | 380/s | 50% | 45% | 6.3 ms | 5.9 ms | 7.7 KB | 7.8 KB |
| `sync-day` | 371 | 388 | 1.05x | 2,698 us | 2,575 us | -5% | 190/s | 53% | 50% | 27.4 ms | 25.1 ms | 48.2 KB | 48.2 KB |
| `index` | 1,724 | 13,867 | 8.10x | 580 us | 72 us | -88% | 860/s | 61% | 13% | 4.4 ms | 0.5 ms | 4.8 KB | 4.9 KB |
| `bundle` | 269 | 9,093 | 34.08x | 3,721 us | 110 us | -97% | 130/s | 62% | 3% | 70.6 ms | 0.5 ms | 1.16 MB | 216.5 KB |
| `bundle-304` | 3,866 | 7,824 | 2.02x | 259 us | 128 us | -51% | 1,900/s | 58% | 29% | 2.0 ms | 0.7 ms | 660 B | 683 B |

Resident memory, idle after seeding and after the run: Express 299 and 472 MB, fulmine 306 and 496 MB.

### LibreChat, API server

Neoverse-N2, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.12. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 9,047 | 32,149 | 3.53x | 110 us | 31 us | -72% | 4,500/s | 55% | 21% | 1.1 ms | 0.3 ms | 571 B | 572 B |
| `index` | 1,010 | 1,258 | 1.22x | 987 us | 793 us | -19% | 500/s | 60% | 51% | 96.5 ms | 4.9 ms | 3.5 KB | 3.5 KB |
| `bundle` | 680 | 749 | 1.11x | 1,470 us | 1,320 us | -10% | 340/s | 41% | 46% | 91.4 ms | 112.6 ms | 234.4 KB | 234.0 KB |
| `config` | 374 | 389 | 1.05x | 2,670 us | 2,562 us | -5% | 190/s | 55% | 54% | 125.3 ms | 115.8 ms | 1.3 KB | 1.3 KB |
| `user` | 727 | 796 | 1.09x | 1,374 us | 1,255 us | -9% | 360/s | 53% | 48% | 6.8 ms | 5.9 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 669 | 720 | 1.08x | 1,492 us | 1,385 us | -7% | 330/s | 53% | 51% | 8.2 ms | 8.0 ms | 904 B | 905 B |
| `convos` | 335 | 357 | 1.08x | 2,981 us | 2,799 us | -7% | 170/s | 56% | 53% | 176.4 ms | 152.0 ms | 2.1 KB | 2.1 KB |
| `messages` | 350 | 353 | 1.00x | 2,848 us | 2,810 us | -1% | 180/s | 52% | 52% | 163.8 ms | 129.8 ms | 4.9 KB | 4.9 KB |

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

Resident memory, idle after seeding and after the run: Express 423 and 692 MB, fulmine 462 and 696 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 0.984, index 1.007, bundle 0.993, config 1.005, user 0.997, endpoints 0.991, convos 1.009, messages 0.990; CPU per request ratio health 1.018, index 0.996, bundle 1.007, config 0.997, user 1.002, endpoints 1.010, convos 0.992, messages 1.011.

### LibreChat, API server, with patches/librechat.diff

Neoverse-N2, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.12. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 8,807 | 30,820 | 3.48x | 113 us | 32 us | -71% | 4,400/s | 55% | 21% | 1.1 ms | 0.3 ms | 571 B | 572 B |
| `index` | 999 | 1,633 | 1.61x | 1,001 us | 610 us | -38% | 500/s | 60% | 33% | 100.2 ms | 39.5 ms | 3.5 KB | 3.5 KB |
| `bundle` | 693 | 7,617 | 11.13x | 1,440 us | 131 us | -91% | 350/s | 41% | 9% | 83.3 ms | 0.6 ms | 234.4 KB | 182.3 KB |
| `config` | 378 | 464 | 1.23x | 2,639 us | 2,150 us | -19% | 190/s | 54% | 41% | 118.1 ms | 103.9 ms | 1.3 KB | 1.3 KB |
| `user` | 734 | 942 | 1.28x | 1,360 us | 1,059 us | -22% | 370/s | 51% | 41% | 6.7 ms | 4.4 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 682 | 854 | 1.25x | 1,464 us | 1,169 us | -20% | 340/s | 54% | 45% | 8.2 ms | 6.1 ms | 904 B | 905 B |
| `convos` | 343 | 433 | 1.26x | 2,907 us | 2,309 us | -21% | 170/s | 50% | 38% | 169.1 ms | 95.5 ms | 2.1 KB | 2.1 KB |
| `messages` | 355 | 440 | 1.23x | 2,811 us | 2,269 us | -19% | 180/s | 55% | 42% | 182.1 ms | 92.7 ms | 4.9 KB | 4.8 KB |

Resident memory, idle after seeding and after the run: Express 425 and 692 MB, fulmine 467 and 663 MB.

