# Independent economy correctness audit

Scope: grant ownership, actual-payment refunds and save continuity. This is a code audit, not a balance endorsement. Initial review occurred while Grok's model integration was still being written; findings below concern the available `cityEconomy.ts` implementation only.

## Reproduced issues awaiting integration fixes

1. **Allowance has no owning lesson.** `grantAllowance` accepts the global remaining allowance when the current lesson appears anywhere in `waived`. An economy with receipts for `first-visit` and `rescue`, and one remaining rescue Clinic, grants a free Clinic if tutorial metadata resets to the first lesson. A read-only executable probe returned `constructionPriceForCity(city, 'hospital') === 0` in that state. Persist an allowance owner and require an exact match to the current active lesson; resetting the tutorial must not transfer grants.
2. **Consumption lacks the same eligibility guard.** `consumeGrant` decrements any remaining allowance even with tutorial status `skipped`. A direct probe consumed the Clinic from 1 to 0 while skipped. Consumption should resolve the same currently eligible allowance used for the quoted price, and refuse inactive or mismatched grants.
3. **Saved allowance is not bounded by its actual grant.** `parseEconomyProgress` accepts `{waived:['first-visit'],allowance:{hospital:32}}`. Validate the owning lesson has a persisted receipt and each tool/count belongs to its finite budget. Preserve exhausted zero counts and reject malformed accounting rather than renewing it.

Recommended representation: optional `allowanceLesson` independent of `stallLesson`; clearing the stall window must not erase or transfer grant ownership. An old in-development allowance without an explicit owner can be tied to the final recorded grant only when its tool/count shape fits that grant; otherwise reject rather than guess.

## Integration checks to add after the source owner finishes

- A malformed/reset tutorial cannot borrow a later grant; returning to the actual owner can use only its remaining budget.
- Skip, completion and mismatched lesson consumption leave balances/allowances unchanged.
- Zero-price placement decrements exactly once, failed placement decrements nothing, demolish refunds zero and never refills a grant.
- Paid construction refunds its actual charge, and legacy missing payment metadata retains catalog-price refunds.
- Reload preserves grant owner, remaining placements and zero refund provenance; malformed ownership/budget is rejected without resetting accounting.
- Scene accepts a successful zero-price placement even though the wallet does not change.

Status: initial issues reproduced; production code was not changed during concurrent model work.
