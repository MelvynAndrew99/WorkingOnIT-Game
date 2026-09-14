Historical review only: user has removed mockups entirely. Variations are last. Mockup suggestions below are superseded, not backlog tasks. Current work order is in routing-plan.md and README.md.

# Codex simulation review — proposed work order

This is a proposed scope, not implemented functionality or a commitment to the entire feature list. The user's target is a rich traffic-management world delivered affordably, incrementally, and with reusable assets.

1. **Trust the existing roads.** Use real player debug snapshots to verify incident access, lane reservations, rerouting, completed crew returns and recovery of saved towns. A richer map amplifies these problems if they remain. No purchased/generated assets needed.
2. **One readable bottleneck puzzle.** A saved layout with home origins, a shared shop, and outside traffic. Show successful arrivals AND returns, waiting, destination occupancy, and road queue lengths. Offer two real solutions using current tools: control the intersection or build a bypass. Validate both, plus a player-made alternative. Do not let a good aggregate score hide one unreachable home.
3. **Reuse that network under different demand.** Scenario data selects origin/destination weights, demand budget and optional incident schedules. Morning/evening are different trip-direction patterns, not just palette changes or unbounded spawn multipliers. Festival visitors need finite destination capacity and recoverable access. Optimized flow compares the SAME offered demand, not artificially lighter traffic. Preserve deterministic seeds for debugging, not guaranteed identical outcomes after player edits.
4. **Add one new routing tool.** One-way segments are a reasonable first candidate: explicit directed connectivity, entrance access and valid return paths before art. A roundabout can then be constructed from a one-way loop with understood junction rules. Do not promise present undirected tiles can support it through arrows alone.
5. **Add lane capacity deliberately.** Multi-lane roads require lane-level occupancy, lane connections at junctions, lane choice/changes, merging and save migration. Stress-test a small junction before extending the city. Larger sprites are not additional capacity.
6. **Specialized demand and space.** Delivery work needs its own destination purpose; buses need passenger/trip aggregation and stops; bus lanes depend on lane rules; pedestrians need crossing conflict rules. Bridges/tunnels need grade-separated graph layers, entrances/ramps and readable picking. These are separate simulation features, not asset variants.

Cost controls: one shared brief, one external review, no repeated research loop; one small map and configurable variants; existing atlas first; shared icons and UI components; one comparison mockup before asset batches. Money prices/compute costs have not been quoted or verified. Existing subscriptions may still have quotas or usage charges.

Proposed next work item: use the new debug report to close a real responder failure, then a baseline/comparison diagnostic puzzle with current road tools. No speculative lane-system rewrite while the user's ambulance remains unexplained.
