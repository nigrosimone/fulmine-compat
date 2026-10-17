### Actual Budget, sync server

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.1. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 3,906 | 12,060 | 3.13x | 256 us | 83 us | -68% | 2,000/s | 58% | 27% | 2.0 ms | 0.5 ms | 355 B | 356 B |
| `validate` | 1,724 | 2,407 | 1.40x | 581 us | 415 us | -29% | 860/s | 53% | 40% | 6.5 ms | 7.1 ms | 542 B | 520 B |
| `list-files` | 1,433 | 1,965 | 1.37x | 699 us | 509 us | -27% | 720/s | 53% | 41% | 8.4 ms | 6.4 ms | 704 B | 682 B |
| `sync-idle` | 477 | 521 | 1.10x | 2,100 us | 1,920 us | -10% | 240/s | 51% | 47% | 9.6 ms | 9.3 ms | 12.2 KB | 12.2 KB |
| `sync-day` | 230 | 241 | 1.05x | 4,359 us | 4,129 us | -5% | 110/s | 51% | 48% | 28.8 ms | 25.9 ms | 52.7 KB | 52.7 KB |
| `index` | 1,151 | 8,658 | 7.52x | 869 us | 115 us | -87% | 580/s | 59% | 14% | 5.9 ms | 0.6 ms | 4.8 KB | 4.9 KB |
| `bundle` | 189 | 251 | 1.35x | 5,280 us | 3,984 us | -26% | 95/s | 65% | 42% | 106.5 ms | 69.3 ms | 1.16 MB | 1.16 MB |
| `bundle-304` | 2,705 | 6,656 | 2.45x | 370 us | 150 us | -59% | 1,400/s | 63% | 30% | 2.8 ms | 0.8 ms | 660 B | 661 B |

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

Resident memory, idle after seeding and after the run: Express 297 and 469 MB, fulmine 305 and 450 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 0.996, validate 0.995, sync-idle 0.995; CPU per request ratio health 1.005, validate 1.005, sync-idle 1.006.

### Actual Budget, sync server, with patches/actual.diff

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.1. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 3,822 | 11,689 | 3.06x | 262 us | 86 us | -67% | 1,900/s | 56% | 27% | 1.7 ms | 0.6 ms | 355 B | 356 B |
| `validate` | 1,697 | 2,338 | 1.38x | 590 us | 428 us | -28% | 850/s | 53% | 41% | 4.8 ms | 4.0 ms | 542 B | 520 B |
| `list-files` | 1,430 | 1,844 | 1.29x | 700 us | 543 us | -23% | 710/s | 52% | 43% | 8.8 ms | 24.4 ms | 704 B | 682 B |
| `sync-idle` | 474 | 515 | 1.09x | 2,118 us | 1,943 us | -9% | 240/s | 52% | 49% | 23.2 ms | 10.1 ms | 12.3 KB | 12.3 KB |
| `sync-day` | 228 | 240 | 1.05x | 4,405 us | 4,153 us | -6% | 110/s | 51% | 47% | 25.1 ms | 26.4 ms | 52.8 KB | 52.7 KB |
| `index` | 1,128 | 9,075 | 8.05x | 887 us | 110 us | -88% | 560/s | 59% | 14% | 6.3 ms | 0.6 ms | 4.8 KB | 4.9 KB |
| `bundle` | 184 | 5,976 | 32.47x | 5,434 us | 167 us | -97% | 92/s | 63% | 4% | 113.4 ms | 0.7 ms | 1.16 MB | 216.6 KB |
| `bundle-304` | 2,659 | 6,040 | 2.28x | 377 us | 166 us | -56% | 1,300/s | 60% | 30% | 3.0 ms | 0.9 ms | 660 B | 683 B |

Resident memory, idle after seeding and after the run: Express 297 and 409 MB, fulmine 305 and 440 MB.

### LibreChat, API server

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.2. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 7,084 | 24,289 | 3.44x | 141 us | 41 us | -71% | 3,500/s | 60% | 26% | 1.4 ms | 0.4 ms | 571 B | 572 B |
| `index` | 683 | 696 | 1.03x | 1,460 us | 1,434 us | -2% | 340/s | 59% | 61% | 123.0 ms | 111.9 ms | 3.5 KB | 3.5 KB |
| `bundle` | 497 | 530 | 1.07x | 2,003 us | 1,885 us | -7% | 250/s | 43% | 62% | 115.4 ms | 108.6 ms | 234.1 KB | 234.8 KB |
| `config` | 279 | 287 | 1.02x | 3,580 us | 3,453 us | -2% | 140/s | 51% | 51% | 230.5 ms | 154.7 ms | 1.3 KB | 1.3 KB |
| `user` | 532 | 568 | 1.07x | 1,878 us | 1,755 us | -7% | 270/s | 53% | 50% | 9.2 ms | 8.7 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 495 | 519 | 1.06x | 2,020 us | 1,925 us | -6% | 250/s | 53% | 50% | 10.5 ms | 9.9 ms | 903 B | 905 B |
| `convos` | 260 | 264 | 1.01x | 3,845 us | 3,773 us | -1% | 130/s | 52% | 53% | 228.5 ms | 242.1 ms | 2.1 KB | 2.1 KB |
| `messages` | 254 | 258 | 1.03x | 3,924 us | 3,865 us | -2% | 130/s | 54% | 53% | 259.4 ms | 251.1 ms | 4.9 KB | 4.9 KB |

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

Resident memory, idle after seeding and after the run: Express 425 and 702 MB, fulmine 485 and 749 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 1.018, config 1.001, convos 1.003; CPU per request ratio health 0.983, config 1.003, convos 0.997.

### LibreChat, API server, with patches/librechat.diff

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.2. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 6,820 | 23,639 | 3.47x | 146 us | 42 us | -71% | 3,400/s | 61% | 25% | 1.4 ms | 0.4 ms | 571 B | 572 B |
| `index` | 660 | 1,552 | 2.33x | 1,484 us | 643 us | -57% | 330/s | 59% | 29% | 125.7 ms | 45.2 ms | 3.5 KB | 3.5 KB |
| `bundle` | 482 | 5,234 | 10.86x | 2,071 us | 190 us | -91% | 240/s | 43% | 9% | 107.0 ms | 0.8 ms | 235.0 KB | 182.4 KB |
| `config` | 275 | 347 | 1.24x | 3,632 us | 2,864 us | -19% | 140/s | 52% | 40% | 21.9 ms | 13.0 ms | 1.3 KB | 1.3 KB |
| `user` | 517 | 685 | 1.35x | 1,931 us | 1,455 us | -26% | 260/s | 50% | 39% | 9.0 ms | 5.9 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 482 | 609 | 1.28x | 2,073 us | 1,638 us | -22% | 240/s | 52% | 42% | 11.5 ms | 7.9 ms | 904 B | 905 B |
| `convos` | 256 | 314 | 1.23x | 3,904 us | 3,142 us | -19% | 130/s | 54% | 44% | 241.6 ms | 226.3 ms | 2.1 KB | 2.1 KB |
| `messages` | 248 | 309 | 1.25x | 4,035 us | 3,236 us | -20% | 120/s | 52% | 41% | 262.1 ms | 160.3 ms | 4.9 KB | 4.8 KB |

Resident memory, idle after seeding and after the run: Express 425 and 686 MB, fulmine 481 and 659 MB.

