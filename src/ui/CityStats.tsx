import './cityStats.css'

export interface CityStatsProps {
  funds: number
  visitors: number
  onRoad: number
  fatalities: number
  elapsedSeconds: number
  weatherLabel: string
}

const VISITORS_TITLE = 'Currently parked shopping and leisure visitors.'
const ON_ROAD_TITLE =
  'Active civilian journeys, excluding visiting and crashed vehicles and emergency crews.'
const TIME_TITLE = 'Saved simulation elapsed time. Pausing freezes it.'
const WEATHER_TITLE = 'Visual atmosphere over the map. Pause freezes it. Does not change traffic. Turn it off in Settings.'

/** Exact currency text, always available to assistive technology. */
function exactFunds(funds: number): string {
  return `$${Math.round(funds).toLocaleString('en-US')}`
}

/** Short display text; large values abbreviate while the exact value stays accessible. */
function shortFunds(funds: number): string {
  const rounded = Math.round(funds)
  const sign = rounded < 0 ? '-' : ''
  const value = Math.abs(rounded)
  if (value >= 1_000_000) return `${sign}$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 100_000) return `${sign}$${Math.round(value / 1000)}k`
  return exactFunds(rounded)
}

/** HH:MM:SS with unbounded hours, so long cities keep reading truthfully. */
function formatElapsed(elapsedSeconds: number): string {
  const total = Math.max(0, Math.floor(elapsedSeconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function count(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('en-US')
}

/**
 * Top-bar statistics group: six left-aligned label/value pairs.
 * Presentational only; the caller supplies the model snapshot.
 * Counters update silently (no aria-live) so screen readers are not spammed.
 */
export default function CityStats({
  funds,
  visitors,
  onRoad,
  fatalities,
  elapsedSeconds,
  weatherLabel,
}: CityStatsProps) {
  const fundsShort = shortFunds(funds)
  const fundsExact = exactFunds(funds)
  return (
    <dl className="city-stats-bar">
      <div className="city-stat">
        <dt>Funds</dt>
        <dd className="city-stat-funds" title={fundsExact}>
          <span aria-hidden="true">{fundsShort}</span>
          <span className="city-stat-exact">{fundsExact}</span>
        </dd>
      </div>
      <div className="city-stat">
        <dt title={VISITORS_TITLE}>Visitors</dt>
        <dd title={VISITORS_TITLE}>{count(visitors)}</dd>
      </div>
      <div className="city-stat">
        <dt title={ON_ROAD_TITLE}>On Road</dt>
        <dd title={ON_ROAD_TITLE}>{count(onRoad)}</dd>
      </div>
      <div className="city-stat">
        <dt>Fatalities</dt>
        <dd className="city-stat-warn">{count(fatalities)}</dd>
      </div>
      <div className="city-stat">
        <dt title={TIME_TITLE}>Time</dt>
        <dd title={TIME_TITLE}>{formatElapsed(elapsedSeconds)}</dd>
      </div>
      <div className="city-stat">
        <dt title={WEATHER_TITLE}>Weather</dt>
        <dd className={weatherLabel === 'Off' ? 'city-stat-muted' : undefined} title={WEATHER_TITLE}>
          {weatherLabel}
        </dd>
      </div>
    </dl>
  )
}
