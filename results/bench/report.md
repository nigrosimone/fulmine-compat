### Actual Budget, sync server

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.0. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 3,828 | 7,950 | 2.06x | 261 us | 126 us | -51% | 1,900/s | 56% | 34% | 1.8 ms | 0.8 ms | 355 B | 356 B |
| `validate` | 1,693 | 2,133 | 1.26x | 591 us | 469 us | -21% | 850/s | 54% | 44% | 5.4 ms | 9.3 ms | 542 B | 520 B |
| `list-files` | 1,420 | 1,778 | 1.25x | 705 us | 562 us | -20% | 710/s | 53% | 43% | 9.5 ms | 10.7 ms | 704 B | 682 B |
| `sync-idle` | 471 | 501 | 1.08x | 2,129 us | 1,994 us | -8% | 240/s | 52% | 49% | 10.5 ms | 9.4 ms | 12.4 KB | 12.5 KB |
| `sync-day` | 225 | 232 | 1.03x | 4,456 us | 4,291 us | -3% | 110/s | 51% | 49% | 53.4 ms | 25.1 ms | 52.9 KB | 52.9 KB |
| `index` | 1,136 | 6,654 | 5.86x | 881 us | 150 us | -83% | 570/s | 60% | 16% | 5.7 ms | 0.7 ms | 4.8 KB | 4.9 KB |
| `bundle` | 183 | 253 | 1.38x | 5,470 us | 3,959 us | -28% | 91/s | 65% | 43% | 106.8 ms | 69.6 ms | 1.16 MB | 1.16 MB |
| `bundle-304` | 2,641 | 5,043 | 1.91x | 379 us | 198 us | -48% | 1,300/s | 60% | 34% | 2.6 ms | 1.1 ms | 660 B | 661 B |

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

Resident memory, idle after seeding and after the run: Express 292 and 402 MB, fulmine 304 and 513 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 0.996, validate 0.995, sync-idle 0.995; CPU per request ratio health 1.005, validate 1.005, sync-idle 1.006.

### Actual Budget, sync server, with patches/actual.diff

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.0. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 3,750 | 7,791 | 2.06x | 267 us | 128 us | -51% | 1,900/s | 56% | 34% | 1.8 ms | 0.8 ms | 355 B | 356 B |
| `validate` | 1,697 | 2,136 | 1.26x | 590 us | 468 us | -21% | 850/s | 54% | 44% | 6.6 ms | 9.3 ms | 542 B | 520 B |
| `list-files` | 1,421 | 1,794 | 1.26x | 704 us | 558 us | -21% | 710/s | 53% | 43% | 8.0 ms | 9.3 ms | 704 B | 682 B |
| `sync-idle` | 472 | 503 | 1.09x | 2,124 us | 1,987 us | -8% | 240/s | 52% | 49% | 12.0 ms | 10.5 ms | 12.4 KB | 12.4 KB |
| `sync-day` | 229 | 235 | 1.03x | 4,361 us | 4,252 us | -3% | 110/s | 50% | 49% | 25.6 ms | 23.4 ms | 52.9 KB | 52.8 KB |
| `index` | 1,150 | 6,674 | 5.82x | 870 us | 150 us | -83% | 570/s | 59% | 16% | 5.8 ms | 0.7 ms | 4.8 KB | 4.9 KB |
| `bundle` | 188 | 4,996 | 26.59x | 5,313 us | 200 us | -96% | 94/s | 65% | 4% | 95.2 ms | 0.8 ms | 1.16 MB | 216.6 KB |
| `bundle-304` | 2,649 | 4,755 | 1.80x | 378 us | 210 us | -44% | 1,300/s | 60% | 35% | 2.5 ms | 1.1 ms | 660 B | 683 B |

Resident memory, idle after seeding and after the run: Express 297 and 462 MB, fulmine 306 and 481 MB.

### LibreChat, API server

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.0. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 6,468 | 23,756 | 3.67x | 154 us | 42 us | -73% | 3,200/s | 58% | 24% | 1.4 ms | 0.4 ms | 571 B | 572 B |
| `index` | 671 | 710 | 1.05x | 1,471 us | 1,407 us | -4% | 340/s | 60% | 59% | 128.4 ms | 113.2 ms | 3.5 KB | 3.5 KB |
| `bundle` | 474 | 511 | 1.08x | 2,106 us | 1,952 us | -7% | 240/s | 44% | 44% | 116.7 ms | 101.9 ms | 234.9 KB | 234.2 KB |
| `config` | 278 | 283 | 1.04x | 3,589 us | 3,465 us | -4% | 140/s | 52% | 50% | 180.0 ms | 173.2 ms | 1.3 KB | 1.3 KB |
| `user` | 528 | 575 | 1.10x | 1,892 us | 1,734 us | -9% | 260/s | 51% | 48% | 9.0 ms | 8.0 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 477 | 527 | 1.10x | 2,093 us | 1,893 us | -9% | 240/s | 51% | 49% | 10.0 ms | 9.2 ms | 904 B | 905 B |
| `convos` | 260 | 263 | 1.00x | 3,843 us | 3,734 us | -2% | 130/s | 52% | 53% | 221.8 ms | 260.5 ms | 2.1 KB | 2.1 KB |
| `messages` | 247 | 256 | 1.04x | 4,045 us | 3,903 us | -3% | 120/s | 52% | 50% | 251.9 ms | 251.7 ms | 4.9 KB | 4.9 KB |

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

Resident memory, idle after seeding and after the run: Express 425 and 673 MB, fulmine 474 and 764 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 1.018, config 1.001, convos 1.003; CPU per request ratio health 0.983, config 1.003, convos 0.997.

### LibreChat, API server, with patches/librechat.diff

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.0. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 6,909 | 24,535 | 3.55x | 145 us | 41 us | -72% | 3,500/s | 60% | 25% | 1.4 ms | 0.4 ms | 571 B | 572 B |
| `index` | 675 | 1,180 | 1.76x | 1,478 us | 843 us | -43% | 340/s | 60% | 36% | 126.5 ms | 55.7 ms | 3.5 KB | 3.5 KB |
| `bundle` | 496 | 5,136 | 10.32x | 2,015 us | 194 us | -90% | 250/s | 43% | 9% | 101.7 ms | 0.8 ms | 234.7 KB | 182.4 KB |
| `config` | 280 | 348 | 1.24x | 3,570 us | 2,867 us | -19% | 140/s | 51% | 40% | 214.9 ms | 13.4 ms | 1.3 KB | 1.3 KB |
| `user` | 530 | 682 | 1.29x | 1,883 us | 1,463 us | -22% | 260/s | 51% | 40% | 9.4 ms | 5.7 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 484 | 609 | 1.27x | 2,062 us | 1,640 us | -21% | 240/s | 52% | 41% | 10.3 ms | 8.0 ms | 905 B | 905 B |
| `convos` | 259 | 317 | 1.24x | 3,859 us | 3,113 us | -19% | 130/s | 52% | 41% | 221.9 ms | 16.6 ms | 2.1 KB | 2.1 KB |
| `messages` | 252 | 309 | 1.22x | 3,967 us | 3,231 us | -18% | 130/s | 55% | 45% | 244.5 ms | 189.9 ms | 4.9 KB | 4.9 KB |

Resident memory, idle after seeding and after the run: Express 425 and 705 MB, fulmine 479 and 658 MB.

