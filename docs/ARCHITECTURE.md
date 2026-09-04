# Architecture

## Delivery

HACS and manual installation both deliver a single browser bundle: `zepp2hass-cards.js`.

The current project intentionally keeps the working baseline as one file. Do not perform a broad source-layout rewrite during the initial GitHub publication pass.

## Cards

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
