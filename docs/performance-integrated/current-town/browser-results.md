# Supplied-town browser comparison

Each cell is before → after; median of two capture-level statistics. FPS derives from sampled frame intervals. Zero input means no input events, not zero latency. See README for methodology and limitations.

| Layout / phase | FPS | Frame p95 ms | Frame p99 ms | Input proxy p95 ms | Simulation p95 ms | Report p95 ms | Long tasks | Sim / wall second |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1440 / live | 5.8 → 5.9 | 183.4 → 191.7 | 200.0 → 191.7 | 0.0 → 0.0 | 38.8 → 47.5 | 64.1 → 31.6 | 7.5 → 8.5 | 0.6 → 0.6 |
| 1440 / pan-zoom | 4.5 → 5.8 | 325.0 → 199.9 | 333.3 → 241.7 | 631.9 → 424.3 | 24.3 → 26.6 | 49.5 → 26.3 | 7.0 → 7.0 | 0.4 → 0.6 |
| 1440 / inspectors | 4.7 → 5.1 | 333.4 → 316.7 | 350.0 → 350.0 | 533.7 → 484.4 | 12.6 → 13.1 | 15.3 → 18.0 | 2.0 → 0.5 | 0.5 → 0.5 |
| 1440 / radio | 52.2 → 52.6 | 25.1 → 25.0 | 108.3 → 116.7 | 60.9 → 101.1 | 0.0 → 0.0 | 0.0 → 0.0 | 0.0 → 0.0 | 0.0 → 0.0 |
| 390 / live | 18.6 → 19.5 | 100.0 → 66.7 | 191.8 → 91.7 | 0.0 → 0.0 | 26.9 → 23.1 | 70.3 → 36.7 | 10.5 → 6.0 | 1.0 → 1.0 |
| 390 / pan-zoom | 10.8 → 17.5 | 183.4 → 91.7 | 200.1 → 108.3 | 305.3 → 150.1 | 12.4 → 14.6 | 19.2 → 28.3 | 3.0 → 4.0 | 0.7 → 1.0 |
| 390 / inspectors | 17.1 → 19.1 | 175.0 → 91.7 | 208.4 → 183.3 | 173.1 → 124.9 | 12.1 → 11.3 | 17.8 → 17.7 | 0.5 → 0.0 | 0.9 → 0.9 |
| 390 / radio | 55.5 → 55.9 | 16.8 → 16.8 | 66.6 → 58.4 | 72.4 → 56.2 | 0.0 → 0.0 | 0.0 → 0.0 | 0.0 → 0.0 | 0.0 → 0.0 |

## Synchronous render CPU totals per capture

Nested costs overlap; do not sum them.

| Layout / phase | Ground ms | World ms | Cars ms | Pixi submit ms |
|---|---:|---:|---:|---:|
| 1440 / live | 0.0 → 0.0 | 0.0 → 0.0 | 16.6 → 18.2 | 124.0 → 142.6 |
| 1440 / pan-zoom | 44.8 → 3.3 | 70.1 → 66.6 | 22.9 → 22.5 | 221.5 → 192.2 |
| 1440 / inspectors | 10.8 → 13.4 | 113.8 → 68.5 | 15.3 → 17.2 | 68.3 → 80.5 |
| 390 / live | 3.7 → 0.0 | 57.2 → 52.3 | 42.2 → 45.2 | 238.9 → 236.7 |
| 390 / pan-zoom | 38.5 → 1.1 | 86.3 → 56.2 | 41.4 → 55.2 | 386.2 → 433.7 |
| 390 / inspectors | 7.4 → 9.0 | 137.3 → 101.0 | 38.1 → 46.0 | 194.4 → 223.1 |

## Memory

MiB of used JS heap, medians of two contexts; initial gameplay and final menu after forced GC, gameplay end before GC. Different lifecycle points are not a leak measurement.

| Layout | Initial gameplay MiB | End gameplay MiB | Menu MiB | Menu DOM nodes | Menu listeners |
|---|---:|---:|---:|---:|---:|
| 1440 | 16.0 → 14.3 | 44.8 → 31.5 | 11.7 → 11.7 | 627.5 → 267.0 | 281.5 → 250.0 |
| 390 | 14.0 → 14.9 | 42.6 → 47.4 | 12.1 → 11.9 | 631.5 → 269.0 | 285.0 → 250.0 |
