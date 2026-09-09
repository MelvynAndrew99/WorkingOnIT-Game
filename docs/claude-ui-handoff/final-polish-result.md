# Final polish — Remove label overflow at 320px

One-line change in `src/ui/BuildPalette.tsx`. Nothing else touched.

## Change

The bulldoze entry's visible label goes from `Remove` (79px measured, 75px scrollWidth,
in a 71px card) to **`Clear`** — five characters with a narrow `l`, so it fits the card
without wrapping or shrinking type.

Deliberately unchanged:

- `tool: 'bulldoze'` — tool identity, so every keyboard shortcut (`4`), coach/objective
  selection, `categoryOf` lookup and store round-trip behaves exactly as before.
- `name: 'Remove, full refund'` — this is what `fullName()` returns, so the accessible
  name (`aria-label`), the tooltip (`4: Remove, full refund`) and the selection message
  all still say "Remove". Only the 17.6px glyph on the card face is shorter.
- The price cell still reads `Refund`, and the note still explains that removal returns
  what you paid.

So the word "Remove" is still the one a screen reader announces and the one the tooltip
shows; "Clear" is purely the visible short form, in the same way `Stops`, `Lights` and
`Divert` are short forms of their full names.

## Verification

Not run — I have no shell or browser in this session. This is a string change to a single
array entry with no layout, CSS or logic edits, so the risk is confined to whether `Clear`
also measures under 71px at 320px. Please confirm that in the same measurement you used
for `Remove`, and that the accessible name still reads "Remove, full refund".
