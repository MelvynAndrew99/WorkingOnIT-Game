# Production browser before/after results

Values are medians of two capture-level measurements (not pooled percentiles). Frame and input values are milliseconds. Input is dispatch-to-second-rAF; “—” means no scripted input, not zero latency. See README for methods and software-rendering limits.

## small, desktop 1440×900

| Phase | FPS | Frame p95 | Frame p99 | Input proxy p95 | Long tasks >50ms |
|---|---:|---:|---:|---:|---:|
| live | 10.1 → 10.0 | 116.6 → 116.7 | 116.7 → 116.7 | — | 0.0 → 0.0 |
| pan-zoom | 7.6 → 9.6 | 233.3 → 116.7 | 241.7 → 133.4 | 392.8 → 230.0 | 0.0 → 0.0 |
| construction | 9.6 → 11.2 | 225.1 → 108.4 | 241.6 → 133.3 | 411.6 → 225.3 | 0.0 → 0.0 |
| apartment-joining | 8.8 → 9.5 | 216.7 → 133.4 | 233.3 → 266.7 | 274.9 → 312.6 | 0.0 → 0.0 |
| inspectors | 8.7 → 10.9 | 233.3 → 116.8 | 258.4 → 191.7 | 405.1 → 287.9 | 0.0 → 0.0 |
| radio | 52.6 → 52.6 | 25.1 → 25.0 | 116.6 → 116.7 | 73.9 → 86.2 | 0.0 → 0.0 |

## small, mobile layout 390×844

| Phase | FPS | Frame p95 | Frame p99 | Input proxy p95 | Long tasks >50ms |
|---|---:|---:|---:|---:|---:|
| live | 39.6 → 40.1 | 33.4 → 33.4 | 33.4 → 33.4 | — | 0.0 → 0.0 |
| pan-zoom | 20.1 → 35.9 | 150.0 → 41.7 | 166.6 → 66.6 | 281.8 → 80.2 | 0.0 → 0.0 |
| construction | 30.1 → 33.3 | 50.0 → 41.7 | 166.7 → 50.1 | 65.7 → 57.9 | 0.0 → 0.0 |
| apartment-joining | 35.9 → 38.2 | 33.4 → 33.4 | 150.0 → 150.0 | 169.9 → 61.7 | 0.0 → 0.0 |
| inspectors | 30.0 → 42.3 | 150.0 → 33.4 | 166.7 → 33.4 | 50.5 → 48.4 | 0.0 → 0.0 |
| radio | 55.3 → 55.3 | 16.8 → 16.8 | 58.4 → 58.3 | 70.9 → 67.3 | 0.0 → 0.0 |

## busy, desktop 1440×900

| Phase | FPS | Frame p95 | Frame p99 | Input proxy p95 | Long tasks >50ms |
|---|---:|---:|---:|---:|---:|
| live | 6.9 → 6.8 | 158.4 → 158.4 | 166.7 → 166.7 | — | 0.5 → 0.0 |
| pan-zoom | 5.2 → 6.8 | 291.6 → 175.0 | 291.7 → 191.7 | 533.7 → 341.1 | 1.5 → 2.0 |
| construction | 5.5 → 6.1 | 291.7 → 308.4 | 308.3 → 400.0 | 433.0 → 464.3 | 1.0 → 0.5 |
| apartment-joining | 8.0 → 8.6 | 241.7 → 150.1 | 266.7 → 266.6 | 380.5 → 370.9 | 1.0 → 0.0 |
| inspectors | 7.9 → 9.6 | 250.0 → 133.4 | 266.7 → 150.0 | 363.7 → 264.8 | 0.0 → 0.0 |
| radio | 56.9 → 57.4 | 16.8 → 16.8 | 58.3 → 50.0 | 59.2 → 59.9 | 0.0 → 0.0 |

## busy, mobile layout 390×844

| Phase | FPS | Frame p95 | Frame p99 | Input proxy p95 | Long tasks >50ms |
|---|---:|---:|---:|---:|---:|
| live | 26.4 → 26.0 | 50.0 → 50.0 | 50.1 → 50.1 | — | 0.0 → 0.0 |
| pan-zoom | 16.2 → 25.7 | 166.6 → 58.4 | 249.9 → 83.4 | 186.5 → 90.2 | 0.0 → 0.0 |
| construction | 21.5 → 22.5 | 150.0 → 66.7 | 166.7 → 183.3 | 104.9 → 92.6 | 0.0 → 0.0 |
| apartment-joining | 35.9 → 34.6 | 33.4 → 41.6 | 166.6 → 158.3 | 204.3 → 209.8 | 1.0 → 0.0 |
| inspectors | 21.2 → 28.1 | 150.0 → 50.1 | 166.7 → 66.6 | 204.5 → 60.9 | 0.0 → 0.0 |
| radio | 57.9 → 57.5 | 16.8 → 16.8 | 41.7 → 50.0 | 61.2 → 76.4 | 0.0 → 0.0 |

