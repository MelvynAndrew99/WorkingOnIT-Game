# Direct Debug access restored — 2026-09-10

Debug had moved inside Dashboard during UI-02. Restored a directly visible toggle in the global action row with Heatmap, Dashboard, Pause and Menu on desktop and narrow. This follows the user correction: Debug belongs with global controls, not camera tools. Dashboard retains its secondary Open debug action. Opening Debug closes Dashboard; both use the existing reserved panel space. No simulation or save changes, and UI-04 remains queued.

Verified actual toggle open/close, panel Close, Dashboard-to-Debug switching, pressed state and non-overlap at 390×844 and 1440×900. Screenshots inspected; production TypeScript/build passed (existing bundle-size warning). Evidence: `evidence-debug/`. Narrow inspector content scrolls in its reserved space.

UI-04 must preserve this directly visible Debug access.
