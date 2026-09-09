# Display mode verification

September 9, 2026. Local browser verification passed using `nix develop -c node docs/display-mode/browser-check.mjs` against Vite on port 5177. This verifies display behavior, not acceptance of the separately delegated interface layout.

- Desktop 1440×900: Automatic and Desktop/wide use a 1440×900 frame and canvas. Mobile/portrait uses a 506.25×900 frame with a 506×900 canvas; the quarter-pixel difference is normal renderer rounding.
- Phone 390×844: Automatic, wide and portrait all retain a 390×844 frame and canvas.
- Changing the actual Game display setting to portrait or wide survives a page reload. Menus retain their portrait composition.
- Live display switches preserve the entire paused city. Roads placed through real pointer input survive Settings changes and reloads; existing buildings and funds are preserved except for the intentional road construction costs.
- Actual center and adjacent-tile clicks work after switching. Wide mode keeps 48 CSS pixels per tile at zoom 1; portrait scales those tiles by its frame width / 720. A wide view reveals more world instead of enlarging every sprite.
- No browser page errors occurred. Runtime files were not edited by this verification task.

The initial Settings check used an exact accessible label of `Game display`. The wrapping HTML label also includes the select's option text, so that locator matched no element despite the dialog being open. DOM inspection established the cause; matching `/Game display/` passes the actual UI flow. An earlier suspicion of concurrent hot reload was not supported by that evidence. No Settings runtime fix was necessary.

Screenshots: `desktop-auto.png`, `desktop-wide.png`, `desktop-portrait.png`, `mobile-auto.png`, and `settings.png`. Physical-device performance and player preference remain unmeasured.

Reusable lesson: CSS-only frame changes need renderer resize observation, and verification must include actual input after resizing. Matching visual canvas width alone does not establish correct camera scale or pointer mapping.
