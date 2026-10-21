### Actual Budget, sync server

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.7. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 3,885 | 12,468 | 3.20x | 257 us | 80 us | -69% | 1,900/s | 55% | 26% | 1.8 ms | 0.5 ms | 355 B | 356 B |
| `validate` | 1,733 | 2,385 | 1.38x | 578 us | 419 us | -28% | 870/s | 54% | 41% | 5.6 ms | 3.0 ms | 542 B | 520 B |
| `list-files` | 1,448 | 1,967 | 1.36x | 692 us | 508 us | -27% | 720/s | 53% | 41% | 8.8 ms | 10.7 ms | 704 B | 682 B |
| `sync-idle` | 455 | 489 | 1.08x | 2,204 us | 2,042 us | -8% | 230/s | 52% | 48% | 14.6 ms | 15.8 ms | 13.7 KB | 13.7 KB |
| `sync-day` | 224 | 228 | 1.02x | 4,451 us | 4,388 us | -1% | 110/s | 52% | 50% | 29.4 ms | 25.6 ms | 54.2 KB | 54.2 KB |
| `index` | 1,154 | 9,017 | 7.83x | 866 us | 111 us | -87% | 580/s | 60% | 14% | 6.3 ms | 0.6 ms | 4.8 KB | 4.9 KB |
| `bundle` | 180 | 258 | 1.42x | 5,565 us | 3,880 us | -29% | 90/s | 62% | 40% | 109.3 ms | 66.3 ms | 1.16 MB | 1.16 MB |
| `bundle-304` | 2,686 | 6,712 | 2.50x | 372 us | 149 us | -60% | 1,300/s | 59% | 28% | 2.6 ms | 0.8 ms | 660 B | 661 B |

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

Resident memory, idle after seeding and after the run: Express 298 and 411 MB, fulmine 304 and 438 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 0.996, validate 0.995, sync-idle 0.995; CPU per request ratio health 1.005, validate 1.005, sync-idle 1.006.

### Actual Budget, sync server, with patches/actual.diff

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.7. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 3,840 | 11,974 | 3.11x | 260 us | 84 us | -68% | 1,900/s | 55% | 26% | 1.7 ms | 0.5 ms | 355 B | 356 B |
| `validate` | 1,723 | 2,417 | 1.40x | 581 us | 414 us | -29% | 860/s | 53% | 40% | 5.6 ms | 2.6 ms | 542 B | 520 B |
| `list-files` | 1,441 | 1,957 | 1.36x | 695 us | 511 us | -27% | 720/s | 53% | 41% | 10.6 ms | 8.3 ms | 704 B | 682 B |
| `sync-idle` | 450 | 489 | 1.10x | 2,226 us | 2,043 us | -10% | 230/s | 52% | 50% | 11.7 ms | 13.7 ms | 13.8 KB | 13.7 KB |
| `sync-day` | 224 | 226 | 1.02x | 4,474 us | 4,382 us | -2% | 110/s | 52% | 51% | 35.2 ms | 39.6 ms | 54.2 KB | 54.2 KB |
| `index` | 1,144 | 8,757 | 7.73x | 874 us | 114 us | -87% | 570/s | 59% | 14% | 5.8 ms | 0.6 ms | 4.8 KB | 4.9 KB |
| `bundle` | 186 | 6,150 | 33.00x | 5,370 us | 163 us | -97% | 93/s | 61% | 4% | 88.8 ms | 0.7 ms | 1.16 MB | 216.6 KB |
| `bundle-304` | 2,677 | 5,937 | 2.22x | 374 us | 168 us | -55% | 1,300/s | 59% | 30% | 2.6 ms | 0.9 ms | 660 B | 683 B |

Resident memory, idle after seeding and after the run: Express 297 and 433 MB, fulmine 305 and 412 MB.

### LibreChat, API server

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.7. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 6,778 | 23,728 | 3.50x | 147 us | 42 us | -71% | 3,400/s | 60% | 24% | 1.4 ms | 0.4 ms | 571 B | 572 B |
| `index` | 679 | 745 | 1.11x | 1,469 us | 1,335 us | -10% | 340/s | 61% | 58% | 122.9 ms | 108.6 ms | 3.5 KB | 3.5 KB |
| `bundle` | 484 | 518 | 1.10x | 2,063 us | 1,918 us | -9% | 240/s | 44% | 60% | 125.3 ms | 114.5 ms | 234.8 KB | 234.3 KB |
| `config` | 276 | 290 | 1.07x | 3,616 us | 3,444 us | -4% | 140/s | 52% | 50% | 214.5 ms | 191.1 ms | 1.3 KB | 1.3 KB |
| `user` | 527 | 578 | 1.13x | 1,896 us | 1,724 us | -11% | 260/s | 52% | 47% | 9.6 ms | 7.1 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 487 | 538 | 1.10x | 2,048 us | 1,857 us | -9% | 240/s | 51% | 48% | 10.9 ms | 8.8 ms | 903 B | 905 B |
| `convos` | 260 | 266 | 1.02x | 3,851 us | 3,722 us | -3% | 130/s | 53% | 52% | 251.2 ms | 266.9 ms | 2.1 KB | 2.1 KB |
| `messages` | 250 | 263 | 1.06x | 3,997 us | 3,791 us | -5% | 120/s | 53% | 50% | 234.3 ms | 242.1 ms | 4.9 KB | 4.9 KB |

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

Resident memory, idle after seeding and after the run: Express 425 and 695 MB, fulmine 488 and 777 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 1.018, config 1.001, convos 1.003; CPU per request ratio health 0.983, config 1.003, convos 0.997.

### LibreChat, API server, with patches/librechat.diff

Neoverse-N1, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.7. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 6,859 | 23,891 | 3.49x | 145 us | 42 us | -71% | 3,400/s | 59% | 25% | 1.4 ms | 0.4 ms | 571 B | 572 B |
| `index` | 684 | 1,183 | 1.73x | 1,451 us | 842 us | -42% | 340/s | 60% | 34% | 123.3 ms | 50.0 ms | 3.5 KB | 3.5 KB |
| `bundle` | 491 | 5,394 | 11.07x | 2,035 us | 184 us | -91% | 250/s | 45% | 9% | 106.8 ms | 0.8 ms | 235.2 KB | 182.4 KB |
| `config` | 271 | 352 | 1.24x | 3,686 us | 2,832 us | -20% | 140/s | 54% | 41% | 255.0 ms | 13.4 ms | 1.3 KB | 1.3 KB |
| `user` | 528 | 693 | 1.34x | 1,893 us | 1,439 us | -25% | 260/s | 51% | 39% | 9.3 ms | 5.5 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 482 | 621 | 1.27x | 2,072 us | 1,608 us | -21% | 240/s | 52% | 41% | 10.4 ms | 8.1 ms | 905 B | 905 B |
| `convos` | 261 | 315 | 1.20x | 3,826 us | 3,128 us | -18% | 130/s | 52% | 41% | 228.3 ms | 14.8 ms | 2.1 KB | 2.1 KB |
| `messages` | 248 | 313 | 1.25x | 4,027 us | 3,169 us | -20% | 120/s | 52% | 40% | 204.7 ms | 90.5 ms | 4.9 KB | 4.9 KB |

Resident memory, idle after seeding and after the run: Express 425 and 683 MB, fulmine 474 and 663 MB.

