**Put remaining funds in the construction dock, pinned to the tool cluster—not the header, not the map, not Reset/Play.**

Budget is build-time cash: tools spend it, Clear refunds it, simulation never changes it. The header is chrome (title, Levels, Main menu). Reset/Play are simulation and already own the map’s bottom-right. A map overlay would fight build input. The dock already shows prices, so funds belong there as the parent of those prices.

**Desktop (1440×900):** Remove `Budget $140` from the header; leave title and nav. In the dock’s **right column**, add a single persistent funds row **above** the tool buttons, left-aligned with that column. Order: funds → priced tools → existing full-width status under both columns. Left objective/details stay unchanged and do not share the funds row.

**Narrow (390×844):** Same header removal. Do **not** add a dock row (36% height stays). Put a **sticky, non-scrolling chip on the left of the existing horizontal tool scroller**; tools scroll to its right. Status stays below. Reset and Play stay inside the map, bottom-right, 112×52, 8px gap, 12px insets, clear of the dock.

**Hierarchy:** Funds are a sibling of the tool strip and the parent of tool prices. Unrelated to pan/zoom/Town/Traffic/Rotate and to Reset/Play.

**Style:** Compact `Budget $140` on the existing navy/teal dock surface. Cream label, gold on `$` and the amount only, `font-variant-numeric: tabular-nums`, type at least 17.6px. Chip ~108–120px wide with 8–10px padding so the tool scroller still works. No animation, no new art, no other UI changes.
