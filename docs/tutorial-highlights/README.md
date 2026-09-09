# Prominent tutorial control guidance

Implemented locally September 9, 2026 after the user requested mobile-game-style callouts and highlighting of the real Home $200 button. Installed Claude Code was assigned the UI task but returned its subscription session limit before delivering changes. Codex implemented this focused request directly, preserving the existing interface layout and controls. The task's Claude output is not an implementation handoff.

## Behavior

- A prominent yellow callout sits directly above the objective. The actual next tool has a yellow outline, pointer and gentle pulse, distinct from its cyan selected state.
- On phones, when the target shelf is hidden, the relevant category is highlighted first. Browsing other categories remains possible; the guide never takes over the player's selection.
- Home → Store → Road follow actual first-visit construction/connectivity. The shared target resolver is also used by the first-visit objective. Once connected, the construction locator disappears while the player watches visits. Missing Park, junction controls and detour road-building also have bounded targets; passive lessons do not point at unrelated tools.
- When a tool is selected, the callout describes placement instead of repeatedly telling the player to select it. Prices remain the actual dock prices, including Free construction waivers.
- Dismissal lasts for the current lesson/tool context. The next construction context can show its own instruction. Skip/completion, inactive guidance, active incidents, claimable rewards and open dialogs suppress targeting. This explicit onboarding is separate from inactivity-gated manager advice.
- Callouts stay in normal flow within the existing measured footer or desktop rail. They do not dim/block the map. Reduced-motion users get a static outline; category accessible names stay stable despite the decorative pointer.

## Verification

[Browser harness](browser-check.mjs) passed at 320×640, 390×844, 1440×900 wide and forced portrait. Checks exercise real Home/Store/Road pointer placement, category discovery, advancing targets, dismissal, dialog suppression, a live Free waiver price, reduced motion, skip and map space. No horizontal overflow or page errors. Screenshots are saved beside the harness; [phone preview](initial-390-auto.png).

TypeScript and production build pass, with the existing bundle-size advisory. No model or save schema changed, and no personal saved town was accessed. This is local and not deployed. Phone hardware comfort and user acceptance remain to assess.
