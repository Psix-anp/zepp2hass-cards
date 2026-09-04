# AGENTS.md

## Project

`zepp2hass-cards` is a GUI-first Home Assistant dashboard-card bundle for the community Zepp2Hass integration.
Target repository: `Psix-anp/zepp2hass-cards`, default branch `main`.

## Non-negotiable behavior

- Keep one HACS-delivered root bundle: `zepp2hass-cards.js`.
- The cards must remain usable from Home Assistant's graphical card editor; YAML is an advanced/manual override.
- Never hard-code a specific watch model or `amazfit_balance_*` entity IDs in discovery logic.
- Discover Zepp2Hass entities primarily by `platform=zepp2hass` and the same `config_entry_id`; use `device_id` only as a fallback/tie-breaker.
- Explicit user-selected entity mappings always override automatic discovery.
- Home Assistant may suffix entity IDs (`distance_2`, etc.); do not derive companion IDs by blind string replacement when registry data is available.
- Family Activity ranking is ALWAYS absolute step count. Personal goal percentage is display-only and never changes rank.
- Family Activity accepts arbitrary Home Assistant step sensors and must not require Zepp2Hass.
- Sleep hypnogram stages are the graph-shape source. For the current night, companion sleep-duration entities are preferred for exact summary totals when available.
- Do not claim historical companion durations are loaded unless the implementation actually fetches their history.
- Sleep graph interactions must remain touch-friendly: wheel/pinch zoom, pan while zoomed, hover/tap inspection, double-click/double-tap reset.
- RU and EN localization must be supported; `language: auto` follows Home Assistant/browser locale.
- Do not add medical diagnosis/interpretation. Health values are device telemetry only.

## Privacy

Never commit real Home Assistant exports, HAR files, webhook URLs, tokens, private hostnames, MAC addresses, config-entry IDs, device IDs, or raw payloads. Use sanitized fixtures only.

## Development discipline

Before changing behavior:
1. add a failing regression/unit test;
2. run it and confirm the expected failure;
3. implement the smallest fix;
4. run `npm run check`;
5. inspect the resulting diff.

Do not restructure the entire bundle before the first public baseline is safely on GitHub. Refactors into `src/` + build tooling are allowed later only with behavior-preserving tests.

## Release/versioning

When public behavior changes, keep these aligned:
- `Z2H_VERSION` in `zepp2hass-cards.js`;
- `package.json` version;
- `CHANGELOG.md`.

Do not create a GitHub release until Actions are green and the user has tested the candidate in Home Assistant.
