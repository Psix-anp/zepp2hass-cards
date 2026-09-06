# Architecture

## Delivery

HACS and manual installation both deliver a single browser bundle: `zepp2hass-cards.js`.

`npm run build` assembles `src/core.js`, `src/optional-shared.js`,
`src/achievements.js`, and `src/activity-extras.js` in that order. The committed
bundle is checked for exact parity during validation. No runtime imports or new
installation resources are required.

Optional sections use a shared adapter that preserves the base card's DOM and
event handlers. Extensions add controls through the existing graphical editor.
History caches are bounded, in memory, and scoped by entity and time zone.

## Cards

- `amazfit-overview-card`: current-day overview.
- `amazfit-sleep-card`: Sleep Score/stages/history and interactive hypnogram.
- `amazfit-activity-card`: steps/targets/history/records/hourly profile.
- `amazfit-health-card`: health and recovery telemetry.
- `amazfit-training-card`: workout/training summary and history.
- `family-activity-card`: generic absolute-step leaderboard.

Each card has a corresponding custom graphical editor.

## Discovery

Zepp2Hass-aware cards use Home Assistant's entity registry. The primary grouping boundary is the Zepp2Hass `config_entry_id`. This is more robust than model-specific entity prefixes and more complete than `device_id` alone.

Manual mapping always wins over discovery.

## History

The frontend uses Home Assistant WebSocket APIs for entity registry, Recorder history and statistics. Historical calculations must use Recorder/statistics semantics instead of summing arbitrary state snapshots.

## Sleep totals

Stage attributes are appropriate for drawing the hypnogram. For the current-night summary, explicitly exposed companion duration entities can be more accurate and are preferred when available.
