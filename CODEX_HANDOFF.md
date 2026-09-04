# Codex Handoff — Zepp2Hass Cards

## Target

- GitHub: `Psix-anp/zepp2hass-cards`
- Visibility: public
- Default branch: `main`
- Repository was verified empty at handoff time (2026-09-04).
- Current local baseline bundle: **1.0.1**.

Read `AGENTS.md` before editing anything.

## First commands

```bash
npm run check
```

The baseline must pass before any edits. If it does not, stop and diagnose the actual failure before changing production code.

## Required work BEFORE the first public release

### 1. Fix Activity graphical language selector

Known current issue: `Amazfit Activity Card` supports `language: auto|ru|en` in config, but its graphical editor does not expose the language selector consistently with Sleep/Health/Training/Family.

Required behavior:
- GUI field: Auto / Русский / English;
- `auto` follows HA/browser language;
- existing YAML configs keep working;
- all Activity labels switch, including Today/7 days/30 days, Records, Best day, averages, streak, hourly-profile labels;
- add a regression test before implementation.

After this user-visible fix, bump patch version from `1.0.1` to `1.0.2` in bundle/package/changelog before release.

### 2. Verify all five graphical editors in a real Home Assistant UI

Cards:
- `custom:amazfit-sleep-card`
- `custom:amazfit-activity-card`
- `custom:amazfit-health-card`
- `custom:amazfit-training-card`
- `custom:family-activity-card`

Check that frequent `hass` updates do not destroy/open-close selectors while the user is interacting with the editor.

### 3. Refresh public screenshots

Do not reuse private/user screenshots containing personal names or real dashboard data. Capture sanitized/demo screenshots for:
- Sleep Night / 7 days / 30 days;
- Activity Today / 7 days / 30 days;
- Health;
- Training;
- Family;
- at least one graphical editor.

Only add README image references after those files exist.

## Current implemented baseline

### Sleep
- Sleep Score + stage summary;
- Night / 7 days / 30 days;
- historical-night drill-down;
- current-night companion-duration overrides;
- average bedtime / wake time and latest schedule deviation;
- optional sleep target/balance;
- wheel zoom 1x..8x, pinch zoom, pan, hover/tap inspect, double click/tap reset;
- full day/bar hit areas for 7/30-day drill-down;
- left label gutter and plot clipping so zoomed lines cannot overlap stage labels.

### Activity
- steps/target, distance, calories, fat-burning, stands;
- Today / 7 days / 30 days;
- daily Recorder statistics;
- current-day 24-hour step profile;
- best hour;
- averages, best days, goal-hit days, streak;
- all-time record from available HA statistics plus 7/30-day bests;
- registry-based discovery including suffixed entity IDs such as `distance_2`.

### Health
- heart rate current/resting/max;
- stress, SpO2, temperature, PAI;
- training load/recovery/VO2 when meaningful;
- hides unavailable optional metrics by default;
- compact/expanded density.

### Training
- last workout, duration/start;
- training load and recovery;
- VO2 Max when meaningful;
- recent workout list and workout count;
- same-config-entry discovery even when Zepp2Hass creates training entities under another HA `device_id`.

### Family
- Today / Week / Month;
- absolute-step ranking only;
- equal totals use competition ranking (`1, 1, 3`);
- CSS gold/silver/bronze medals for top 3;
- personal target percentage is secondary/display-only;
- arbitrary Home Assistant step sensors;
- participant editor contains only name, steps and optional personal target (no distance/calorie competition fields).

## Important data/discovery decisions

- Never assume a watch prefix or model name.
- Use entity registry and Zepp2Hass `config_entry_id` as the primary discovery scope.
- A real-world collision was observed where Distance became `sensor.…_distance_2`.
- A real Zepp2Hass installation also placed Training Load under a different HA `device_id` while retaining the same `config_entry_id`; this is why discovery must not be restricted to `device_id` alone.

The committed fixture in `tests/fixtures/zepp-registry.fixture.json` is sanitized and intentionally models both cases.

## GitHub publication sequence

1. Read `AGENTS.md` and this file.
2. Run `npm run check` on the untouched archive.
3. Fix the Activity language editor via TDD.
4. Bump to `1.0.2` and update `CHANGELOG.md`.
5. Run `npm run check` again.
6. Initialize/use git and connect to `Psix-anp/zepp2hass-cards`.
7. Push the baseline to `main`.
8. Inspect GitHub Actions (`Validate` + HACS validation) and fix only real failures.
9. Have the user test the GitHub/HACS-installed version in Home Assistant.
10. Only after user acceptance, create a GitHub Release/tag `v1.0.2`.

Suggested first commit after the language fix:

```text
feat: publish Zepp2Hass Cards 1.0.2 baseline
```

## Out of scope for this publication pass

Do not contact the upstream Zepp2Hass maintainer yet.
Do not submit this repository to HACS default repositories yet.
Do not perform a broad framework rewrite before the baseline is published and tested.
