# Browser verification — 2026-09-09

The final isolated Chromium run passed all four scenarios: 320×640, 390×844, 1440×900 automatic layout, and 1440×900 forced portrait. Source was copied to `/tmp/claude-ui-isolated` after the economy grant-owner restoration. The test server used port 5178; screenshots/logs were written outside the watched repository, then copied here. `browser-results.log` records the run.

| Layout | Frame width | Uncovered map area |
| --- | ---: | ---: |
| 320 automatic | 320 | 244×296 |
| 390 automatic | 390 | 311×497 |
| 1440 automatic | 1440 | 932×729 |
| 1440 portrait | 506.25 | 422×596 |

Every visible game button measured at least 44 CSS pixels in both dimensions and 17.6px text. Actual screenshots were inspected at 320 and desktop, including the automatic-waiver state. The initial 320 Remove label overflow was corrected by Claude to visible “Clear” while retaining accessible name “Remove, full refund” and the existing bulldoze tool. A narrow final browser rerun measured label 51px and button clientWidth/scrollWidth 71/71; the refund text also fits. The final 320 layout screenshot includes this correction. Other screenshots document the preceding functional pass; behavior is unchanged.

Verified by actual interactions and persisted model state:

- All eleven construction tools, category access, and rotation. Clicking controls does not build through to the map.
- Real road placement at the renderer's mapped tile between the rails; tutorial stays visible and nonmodal. Live desktop wide/portrait changes preserve the town and maintain correct placement coordinates.
- Pan, zoom, Town, expansion dialog cancellation, and Report open/close preserve construction.
- A fixture funded explicitly with $10,000 completes a real simulated shopping visit. Its ready mission reward is collected once and remains claimed after reload; subsequent tutorial guidance returns. This fixture is not evidence about starter-budget balance.
- A disconnected saved town at 59.5 simulated seconds and $0 remains unchanged while paused. Resuming across the 60-second stall deadline automatically displays the mayor's waiver and Free Home/Store/Road prices. No Free Help, acceptance button, or prebuilt layout appears.
- Ordinary canvas input places the waived home with `paid: 0` and unchanged funds. Removing it refunds zero. Reload preserves the consumed home allowance and remaining store allowance. Home returns to $200, Clinic remains $800 and unaffordable; attempting it leaves the town unchanged.
- No browser page errors in the final run.

Earlier failures were diagnosed rather than accepted: one harness selector still used the previous Report close label; source/test/docs writes caused Vite reloads during checks; a late specialist overwrite removed the economy grant owner and was restored by integration. The final run uses the corrected selector and isolated, restored source.

Run the harness with `CITY_URL` and `CITY_SCREENSHOT_DIR` pointing to an isolated server/output directory. The script uses mounted module URLs, fresh browser contexts, and the actual local save envelope. Files named `layout-*`, `claimed-*`, `switched-*`, and `waiver-*` are final evidence. An older `browser-failure.png`, if retained, represents an earlier failed run, not the final state.

Limits: this pass checks layout, control access, actual construction, mission payout, and introductory waiver persistence. It does not claim the economy is fun or prove the complete emergency tutorial arc; model and earlier simulation suites cover those separately.
