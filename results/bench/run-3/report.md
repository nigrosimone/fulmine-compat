### Actual Budget, sync server

Neoverse-N2, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.12. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 5,271 | 16,219 | 3.06x | 190 us | 62 us | -67% | 2,600/s | 54% | 23% | 1.4 ms | 0.4 ms | 355 B | 356 B |
| `validate` | 2,231 | 3,099 | 1.39x | 449 us | 322 us | -28% | 1,100/s | 52% | 38% | 2.8 ms | 3.5 ms | 542 B | 520 B |
| `list-files` | 1,863 | 2,524 | 1.35x | 537 us | 396 us | -26% | 930/s | 53% | 40% | 5.6 ms | 2.4 ms | 704 B | 682 B |
| `sync-idle` | 769 | 858 | 1.12x | 1,300 us | 1,166 us | -10% | 380/s | 50% | 45% | 6.4 ms | 7.1 ms | 7.9 KB | 7.9 KB |
| `sync-day` | 371 | 387 | 1.04x | 2,705 us | 2,585 us | -4% | 190/s | 52% | 50% | 26.8 ms | 30.9 ms | 48.3 KB | 48.3 KB |
| `index` | 1,738 | 14,397 | 8.27x | 575 us | 69 us | -88% | 870/s | 61% | 14% | 4.6 ms | 0.5 ms | 4.8 KB | 4.9 KB |
| `bundle` | 251 | 379 | 1.48x | 3,982 us | 2,638 us | -32% | 130/s | 65% | 38% | 70.1 ms | 42.4 ms | 1.16 MB | 1.16 MB |
| `bundle-304` | 3,869 | 8,558 | 2.21x | 258 us | 117 us | -55% | 1,900/s | 59% | 29% | 2.1 ms | 0.7 ms | 660 B | 661 B |

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

Resident memory, idle after seeding and after the run: Express 291 and 400 MB, fulmine 306 and 433 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 1.007, validate 1.001, list-files 0.999, sync-idle 0.993, sync-day 1.000, index 0.984, bundle 0.980, bundle-304 0.990; CPU per request ratio health 0.993, validate 1.001, list-files 1.002, sync-idle 1.006, sync-day 1.000, index 1.016, bundle 1.022, bundle-304 1.010.

### Actual Budget, sync server, with patches/actual.diff

Neoverse-N2, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.12. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 5,284 | 15,999 | 3.03x | 189 us | 62 us | -67% | 2,600/s | 53% | 23% | 1.4 ms | 0.4 ms | 355 B | 356 B |
| `validate` | 2,205 | 3,032 | 1.38x | 454 us | 330 us | -27% | 1,100/s | 53% | 39% | 2.8 ms | 2.4 ms | 542 B | 520 B |
| `list-files` | 1,848 | 2,498 | 1.35x | 541 us | 401 us | -26% | 920/s | 52% | 40% | 3.7 ms | 2.3 ms | 704 B | 682 B |
| `sync-idle` | 764 | 854 | 1.12x | 1,311 us | 1,170 us | -11% | 380/s | 51% | 46% | 7.4 ms | 6.7 ms | 7.7 KB | 7.8 KB |
| `sync-day` | 370 | 386 | 1.05x | 2,704 us | 2,591 us | -5% | 180/s | 52% | 49% | 34.5 ms | 26.4 ms | 48.2 KB | 48.2 KB |
| `index` | 1,729 | 14,683 | 8.52x | 579 us | 68 us | -88% | 860/s | 61% | 14% | 4.5 ms | 0.5 ms | 4.8 KB | 4.9 KB |
| `bundle` | 263 | 9,382 | 35.76x | 3,807 us | 107 us | -97% | 130/s | 61% | 3% | 66.4 ms | 0.5 ms | 1.16 MB | 216.5 KB |
| `bundle-304` | 3,865 | 7,749 | 2.01x | 259 us | 129 us | -50% | 1,900/s | 58% | 30% | 2.0 ms | 0.7 ms | 660 B | 683 B |

Resident memory, idle after seeding and after the run: Express 298 and 474 MB, fulmine 306 and 496 MB.

### LibreChat, API server

Neoverse-N2, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.12. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 8,730 | 30,380 | 3.48x | 114 us | 33 us | -71% | 4,400/s | 57% | 21% | 1.2 ms | 0.3 ms | 571 B | 572 B |
| `index` | 965 | 1,201 | 1.23x | 1,035 us | 831 us | -19% | 480/s | 61% | 50% | 95.7 ms | 4.9 ms | 3.5 KB | 3.5 KB |
| `bundle` | 678 | 761 | 1.13x | 1,475 us | 1,310 us | -12% | 340/s | 41% | 46% | 88.9 ms | 103.7 ms | 235.1 KB | 234.6 KB |
| `config` | 375 | 387 | 1.03x | 2,665 us | 2,581 us | -3% | 190/s | 51% | 48% | 141.5 ms | 13.7 ms | 1.3 KB | 1.3 KB |
| `user` | 717 | 778 | 1.09x | 1,394 us | 1,283 us | -8% | 360/s | 54% | 49% | 10.9 ms | 5.9 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 653 | 713 | 1.08x | 1,528 us | 1,400 us | -8% | 330/s | 53% | 49% | 8.5 ms | 7.2 ms | 904 B | 905 B |
| `convos` | 345 | 359 | 1.04x | 2,896 us | 2,779 us | -4% | 170/s | 50% | 48% | 138.5 ms | 87.9 ms | 2.1 KB | 2.1 KB |
| `messages` | 346 | 367 | 1.06x | 2,886 us | 2,721 us | -6% | 170/s | 52% | 47% | 165.7 ms | 149.9 ms | 4.9 KB | 4.9 KB |

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

Resident memory, idle after seeding and after the run: Express 426 and 668 MB, fulmine 463 and 735 MB.

Noise floor, Express against a second Express in the same conditions: req/s ratio health 1.008, index 1.003, bundle 1.005, config 0.992, user 0.995, endpoints 1.005, convos 0.998, messages 0.998; CPU per request ratio health 0.991, index 0.995, bundle 0.993, config 1.006, user 1.005, endpoints 0.995, convos 1.001, messages 1.001.

### LibreChat, API server, with patches/librechat.diff

Neoverse-N2, one core for the server. Node v24.18.1, Express 5.3.0, fulmine 5.25.12. Medians of 5 alternating rounds of 10 s, 50 keep-alive connections, no pipelining.

| endpoint | Express req/s | fulmine req/s | | Express CPU/req | fulmine CPU/req | CPU change | fixed rate | Express CPU | fulmine CPU | Express p99 | fulmine p99 | Express out | fulmine out |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `health` | 8,354 | 30,078 | 3.61x | 119 us | 33 us | -72% | 4,200/s | 55% | 21% | 1.2 ms | 0.3 ms | 571 B | 572 B |
| `index` | 958 | 2,085 | 2.17x | 1,042 us | 478 us | -54% | 480/s | 62% | 29% | 98.8 ms | 37.0 ms | 3.5 KB | 3.5 KB |
| `bundle` | 675 | 7,256 | 10.75x | 1,481 us | 138 us | -91% | 340/s | 41% | 9% | 88.9 ms | 0.6 ms | 234.4 KB | 182.3 KB |
| `config` | 362 | 429 | 1.21x | 2,761 us | 2,283 us | -17% | 180/s | 50% | 40% | 155.7 ms | 132.3 ms | 1.3 KB | 1.3 KB |
| `user` | 700 | 899 | 1.27x | 1,426 us | 1,110 us | -21% | 350/s | 50% | 39% | 6.8 ms | 4.5 ms | 1.1 KB | 1.1 KB |
| `endpoints` | 660 | 824 | 1.24x | 1,509 us | 1,211 us | -19% | 330/s | 52% | 41% | 8.3 ms | 5.9 ms | 905 B | 905 B |
| `convos` | 352 | 423 | 1.21x | 2,835 us | 2,360 us | -17% | 180/s | 52% | 41% | 154.6 ms | 111.5 ms | 2.1 KB | 2.1 KB |
| `messages` | 344 | 433 | 1.24x | 2,895 us | 2,306 us | -19% | 170/s | 51% | 40% | 161.4 ms | 56.4 ms | 4.9 KB | 4.9 KB |

Resident memory, idle after seeding and after the run: Express 425 and 672 MB, fulmine 468 and 665 MB.

