### Actual Budget, sync server

Neoverse-N2, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.12. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 5,238 | 15,195 | 2.91x | 191 us | 66 us | -66% | 2,600/s | 54% | 23% | 1.4 ms | 0.4 ms | 355 B | 356 B |
| `validate` | 2,195 | 3,072 | 1.40x | 456 us | 325 us | -29% | 1,100/s | 52% | 39% | 3.1 ms | 4.3 ms | 542 B | 520 B |
| `list-files` | 1,825 | 2,515 | 1.38x | 549 us | 398 us | -27% | 910/s | 51% | 39% | 4.3 ms | 2.0 ms | 704 B | 682 B |
| `sync-idle` | 764 | 856 | 1.12x | 1,310 us | 1,168 us | -11% | 380/s | 50% | 46% | 6.7 ms | 9.0 ms | 7.8 KB | 7.8 KB |
| `sync-day` | 364 | 375 | 1.05x | 2,755 us | 2,670 us | -5% | 180/s | 53% | 49% | 30.4 ms | 33.2 ms | 48.3 KB | 48.2 KB |
| `index` | 1,707 | 13,960 | 8.18x | 585 us | 72 us | -88% | 850/s | 60% | 14% | 4.5 ms | 0.5 ms | 4.8 KB | 4.9 KB |
| `bundle` | 246 | 359 | 1.43x | 4,068 us | 2,784 us | -30% | 120/s | 62% | 39% | 64.8 ms | 43.6 ms | 1.16 MB | 1.16 MB |
| `bundle-304` | 3,912 | 8,714 | 2.23x | 256 us | 115 us | -55% | 2,000/s | 61% | 29% | 2.0 ms | 0.7 ms | 660 B | 661 B |

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

Resident memory, idle after seeding and after the run: Express 299 and 400 MB, fulmine 306 and 437 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 1.010, validate 0.991, list-files 0.998, sync-idle 1.003, sync-day 0.976, index 0.986, bundle 1.062, bundle-304 0.993; CPU per request ratio health 0.991, validate 1.008, list-files 1.004, sync-idle 0.996, sync-day 1.024, index 1.015, bundle 0.941, bundle-304 1.008.

### Actual Budget, sync server, with patches/actual.diff

Neoverse-N2, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.12. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 5,365 | 15,506 | 2.89x | 186 us | 64 us | -65% | 2,700/s | 54% | 24% | 1.4 ms | 0.4 ms | 355 B | 356 B |
| `validate` | 2,200 | 3,115 | 1.43x | 455 us | 321 us | -30% | 1,100/s | 51% | 38% | 2.7 ms | 1.6 ms | 542 B | 520 B |
| `list-files` | 1,852 | 2,477 | 1.34x | 540 us | 404 us | -25% | 930/s | 52% | 40% | 5.5 ms | 8.5 ms | 704 B | 682 B |
| `sync-idle` | 763 | 852 | 1.12x | 1,314 us | 1,174 us | -11% | 380/s | 52% | 47% | 8.2 ms | 5.9 ms | 7.7 KB | 7.7 KB |
| `sync-day` | 349 | 374 | 1.05x | 2,869 us | 2,672 us | -5% | 170/s | 51% | 46% | 33.7 ms | 27.6 ms | 48.2 KB | 48.2 KB |
| `index` | 1,719 | 13,484 | 7.89x | 582 us | 74 us | -87% | 860/s | 60% | 14% | 4.5 ms | 0.5 ms | 4.8 KB | 4.9 KB |
| `bundle` | 247 | 8,533 | 34.57x | 4,054 us | 117 us | -97% | 120/s | 61% | 4% | 60.7 ms | 0.6 ms | 1.16 MB | 216.5 KB |
| `bundle-304` | 3,887 | 7,912 | 2.04x | 257 us | 126 us | -51% | 1,900/s | 58% | 29% | 2.0 ms | 0.7 ms | 660 B | 683 B |

Resident memory, idle after seeding and after the run: Express 299 and 398 MB, fulmine 306 and 491 MB.

### LibreChat, API server

Neoverse-N2, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.12. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 9,728 | 33,778 | 3.47x | 103 us | 30 us | -71% | 4,900/s | 55% | 20% | 1.1 ms | 0.3 ms | 571 B | 572 B |
| `index` | 1,054 | 1,353 | 1.27x | 947 us | 737 us | -21% | 530/s | 57% | 59% | 88.1 ms | 88.4 ms | 3.5 KB | 3.5 KB |
| `bundle` | 707 | 801 | 1.13x | 1,414 us | 1,245 us | -12% | 350/s | 43% | 45% | 98.6 ms | 109.3 ms | 234.4 KB | 234.5 KB |
| `config` | 406 | 422 | 1.04x | 2,459 us | 2,362 us | -4% | 200/s | 50% | 47% | 115.0 ms | 12.9 ms | 1.3 KB | 1.3 KB |
| `user` | 780 | 840 | 1.07x | 1,281 us | 1,188 us | -7% | 390/s | 52% | 48% | 6.7 ms | 5.8 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 730 | 775 | 1.09x | 1,369 us | 1,286 us | -8% | 360/s | 50% | 49% | 7.5 ms | 6.4 ms | 904 B | 905 B |
| `convos` | 384 | 404 | 1.05x | 2,599 us | 2,458 us | -6% | 190/s | 50% | 50% | 155.7 ms | 157.0 ms | 2.1 KB | 2.1 KB |
| `messages` | 374 | 398 | 1.06x | 2,669 us | 2,501 us | -6% | 190/s | 53% | 48% | 159.9 ms | 147.9 ms | 4.9 KB | 4.9 KB |

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

Resident memory, idle after seeding and after the run: Express 425 and 679 MB, fulmine 462 and 747 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 1.018, index 1.003, bundle 1.003, config 0.990, user 1.006, endpoints 0.994, convos 0.976, messages 1.005; CPU per request ratio health 0.981, index 0.999, bundle 0.995, config 1.012, user 0.993, endpoints 1.005, convos 1.017, messages 0.997.

### LibreChat, API server, with patches/librechat.diff

Neoverse-N2, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.12. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 9,446 | 31,302 | 3.30x | 106 us | 32 us | -70% | 4,700/s | 55% | 21% | 1.1 ms | 0.3 ms | 571 B | 572 B |
| `index` | 1,045 | 2,324 | 2.26x | 954 us | 429 us | -56% | 520/s | 61% | 29% | 90.9 ms | 26.5 ms | 3.5 KB | 3.5 KB |
| `bundle` | 729 | 7,762 | 10.75x | 1,371 us | 129 us | -91% | 360/s | 43% | 8% | 97.5 ms | 0.5 ms | 234.4 KB | 182.3 KB |
| `config` | 403 | 491 | 1.22x | 2,481 us | 2,034 us | -18% | 200/s | 50% | 39% | 72.4 ms | 103.6 ms | 1.3 KB | 1.3 KB |
| `user` | 779 | 996 | 1.28x | 1,283 us | 1,002 us | -22% | 390/s | 51% | 40% | 6.9 ms | 4.2 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 713 | 894 | 1.25x | 1,400 us | 1,118 us | -20% | 360/s | 51% | 42% | 7.8 ms | 5.5 ms | 904 B | 905 B |
| `convos` | 372 | 454 | 1.22x | 2,685 us | 2,200 us | -18% | 190/s | 51% | 42% | 149.0 ms | 88.6 ms | 2.1 KB | 2.1 KB |
| `messages` | 375 | 467 | 1.24x | 2,659 us | 2,142 us | -19% | 190/s | 52% | 41% | 138.7 ms | 77.7 ms | 4.9 KB | 4.9 KB |

Resident memory, idle after seeding and after the run: Express 425 and 668 MB, fulmine 468 and 680 MB.

