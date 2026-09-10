/**
 * First mechanics tuning surface. Values are provisional, not new balance changes.
 * Change targets/rewards here; mission IDs remain stable in cityMissions.ts.
 * Earned completion/claim and land-level receipts are permanent: tuning must not
 * revoke them. A changed reward affects only a future, still-unclaimed reward.
 * Other simulation prices/timing are not yet centralized in this first slice.
 */
export const CITY_RULES = {
  missions: {
    firstShoppers: 1,
    neighbourhoodShoppers: 3,
    parkHouseholds: 3,
    townShoppers: 6,
    networkMinimumHomes: 3,
    rewards: {first: 100, neighbourhood: 200, park: 200, town: 400},
  },
  routing: {civilianReplanSeconds: 8, minimumHoldSeconds: 2, queueCapSeconds: 12, signalEstimateSeconds: 3,
    queryCooldownSeconds: 8, queriesPerTick: 2, responseQueriesPerTick: 2, minimumSavingSeconds: 2, minimumSavingFraction: 0.2, emergencyBackupSeconds: 10, sceneReturnRecoverySeconds: 8},
  policePatrol: {radiusTiles: 6, stationRestSeconds: 4},
  diagnostics: {stoppedSeconds: 2},
} as const;
