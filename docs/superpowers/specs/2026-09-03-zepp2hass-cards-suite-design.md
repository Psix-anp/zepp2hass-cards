# Zepp2Hass Cards Suite — Design Specification

Date: 2026-09-03
Status: Approved design, pending implementation plan

## 1. Scope

Extend the existing HACS-compatible `zepp2hass-cards` project from the current `custom:amazfit-sleep-card` into a coherent dashboard suite with graphical Home Assistant card editors.

Target cards:

1. `custom:amazfit-sleep-card` — existing v6, add/standardize graphical editor.
2. `custom:amazfit-activity-card` — personal activity dashboard.
3. `custom:amazfit-health-card` — health/training dashboard.
4. `custom:family-activity-card` — family step competition.

The suite remains a single HACS Dashboard/plugin bundle (`zepp2hass-cards.js`). YAML remains supported, but normal configuration should be possible without hand-editing YAML.

## 2. Shared architecture

### 2.1 Home Assistant integration boundary

Cards use Home Assistant public frontend/state APIs only. They do not require changes to Zepp2Hass.

Entity discovery must not depend solely on generated entity IDs. The tested Home Assistant installation has a real example where Distance is `sensor.amazfit_balance_distance_2` while the Zepp2Hass unique-id suffix is `distance`.

Therefore Zepp-specific cards use this precedence:

1. explicit user override in card config;
2. entity-registry discovery for entities on the same Zepp2Hass device/config entry;
3. conservative prefix/name fallback only when registry metadata is unavailable.

Manual overrides are never overwritten by rediscovery unless the user explicitly resets them.

### 2.2 Shared graphical editor patterns

All cards expose Home Assistant graphical configuration through `getConfigElement()` and dedicated editor custom elements where dynamic UI is required. Editors emit `config-changed` events.

Shared editor sections:

- Data source / device
- Auto-discovery status
- Entity mappings
- Display options
- Period/history options
- Advanced overrides

Shared actions:

- `Auto-detect` / `Re-detect`
- Reset one mapping to auto
- Reset all mappings to auto

Editors show mapping health with simple states such as found / unavailable / missing / overridden.

### 2.3 Shared visual language

Keep the current Sleep Card visual direction:

- Zepp-like compact metric tiles
- Home Assistant light/dark theme compatibility
- restrained purple accent
- touch-friendly controls
- `Today/Night`, `7 days`, `30 days` segmented navigation where applicable
- responsive layout for phone, tablet and desktop

The package should feel like one product rather than unrelated custom cards.

### 2.4 Shared history rules

History is sourced from Home Assistant Recorder/history/statistics APIs.

For total-increasing daily activity sensors, period totals must be computed from appropriate statistics/state-change semantics, not by naively summing arbitrary snapshots.

Cards must gracefully handle:

- entity excluded from Recorder;
- sparse history;
- unavailable/unknown states;
- renamed entities;
- missing optional metrics.

Missing optional data hides or disables the relevant block instead of rendering misleading zeroes.

## 3. Sleep Card editor

Existing card behavior remains intact.

The editor exposes:

- Sleep Score entity
- language: auto / ru / en
- chart height
- show score
- show summary
- show percentages
- show quality
- optional target sleep minutes
- show naps when present
- history controls
- companion entity overrides:
  - Sleep Total
  - Sleep Deep
  - Sleep Light
  - Sleep REM
  - Sleep Awake

Auto-discovery should resolve companion entities from registry/device metadata first.

`attributes.stages` remains the hypnogram source. Companion sleep duration sensors remain preferred for current-night summary values when available.

## 4. Activity Card

### 4.1 Purpose

Personal activity overview matching the Sleep Card visual style.

### 4.2 Metrics

Primary:

- Steps
- Step target

Secondary, optional:

- Distance
- Calories
- Fat-burning minutes
- Stands

### 4.3 Views

#### Today

- large steps value and target
- progress indicator
- secondary metric tiles
- optional progress through the day when history resolution allows it

#### 7 days

- seven calendar days, including explicit empty days
- daily step totals
- goal/reference line or equivalent target indication
- average steps
- best day
- count of goal-completion days

#### 30 days

- compact daily trend
- average daily steps
- best day
- number/percentage of days reaching target

### 4.4 Editor

- Zepp device/source selector
- Auto-detect entities toggle/status
- explicit entity selectors for each metric
- target mode:
  - entity attribute target
  - manual target
- show/hide each secondary metric
- enable/disable 7-day and 30-day tabs

## 5. Health Card

### 5.1 Purpose

Concise health/training status card, not a medical diagnostic dashboard.

### 5.2 Metrics

Heart:

- current HR
- resting HR
- max HR

Wellness:

- stress
- SpO2
- body temperature
- PAI

Training:

- training load
- full recovery time
- VO2 Max when meaningful/nonzero

### 5.3 Behavior

- unavailable optional metrics are hidden by default;
- user can opt to show unavailable placeholders;
- stress `last_week` and PAI history attributes may be used when present;
- training load/recovery should be grouped as a training-status block;
- no medical interpretation or diagnosis language.

### 5.4 Editor

- source/device selector
- entity auto-discovery
- per-metric visibility toggles
- explicit overrides
- `hide unavailable metrics` option, default on
- selectable compact/expanded density if implementation cost remains modest

## 6. Family Activity Card

### 6.1 Purpose

Family step competition that works with arbitrary Home Assistant entities, not only Zepp2Hass.

### 6.2 Ranking rule

**Ranking is based only on absolute step count for the selected period.**

Personal target percentage is display-only and does not affect rank.

Examples:

- Adult: 15,000-step target, 12,000 achieved
- Child: 8,000-step target, 9,000 achieved

The adult ranks above the child because 12,000 > 9,000, even though the child exceeded the personal target.

### 6.3 Periods

- Today
- Week
- Month

Week/month totals are absolute accumulated steps in the selected period.

### 6.4 Presentation

Default display is ranked horizontal rows/bars, not a podium.

Each row:

- rank
- participant name
- absolute steps
- proportional bar
- optional personal-target percentage

Expanded/tapped participant details may include:

- period average
- best day
- goal-completion days
- gap to leader / gap to previous participant

### 6.5 Participants

Each participant configuration supports:

- name
- steps entity (required)
- distance entity (optional)
- calories entity (optional)
- personal target source:
  - entity attribute
  - manual value
  - none
- optional avatar/icon later, not required for initial version

### 6.6 Editor

Requires a custom dynamic editor.

Functions:

- add participant
- remove participant
- edit participant
- reorder configuration entries for administration clarity
- entity pickers
- period toggles
- optional target display toggle

Runtime ranking ignores configuration order and always sorts by absolute selected-period steps.

## 7. Registration and HACS packaging

The bundle registers:

- `amazfit-sleep-card`
- `amazfit-sleep-card-editor`
- `amazfit-activity-card`
- `amazfit-activity-card-editor`
- `amazfit-health-card`
- `amazfit-health-card-editor`
- `family-activity-card`
- `family-activity-card-editor`

User-facing cards are added to `window.customCards` so they appear in Home Assistant's card picker.

Keep one HACS-installed bundle:

`zepp2hass-cards.js`

Do not split HACS installation into four separate repositories or resources in this phase.

## 8. Testing strategy

### Unit tests

Test pure logic independently:

- entity discovery and override precedence
- unit normalization
- daily aggregation
- 7-day calendar slot generation
- 30-day aggregation
- family ranking
- tie behavior
- target-percentage display not affecting rank
- unavailable/unknown handling

### Editor tests

Test config serialization/events:

- selected entity persists
- auto-discovery does not overwrite manual overrides
- participant add/edit/remove
- participant configuration order is preserved
- `config-changed` detail contains complete valid config

### Rendering tests

Check important generated markup/state for:

- missing optional metric hiding
- correct selected period
- family ranking order
- empty history days
- Russian/English labels

### Real Home Assistant acceptance

Before calling a card finished:

- phone screenshot
- tablet/desktop screenshot
- light theme
- dark theme
- graphical editor screenshot
- touch interaction where applicable

## 9. Implementation order

1. Shared entity discovery/config utilities
2. Sleep Card graphical editor
3. Activity Card + editor
4. Health Card + editor
5. Shared history/statistics helpers
6. Family Activity Card + dynamic editor
7. HACS bundle integration and full regression pass
8. Real Home Assistant visual acceptance screenshots

## 10. Explicit non-goals for this phase

- no changes to Zepp2Hass integration code;
- no upstream issue/PR to Zepp2Hass maintainer yet;
- no cloud backend;
- no family account service;
- no medical recommendations;
- no podium-only family UI;
- no rank normalization by personal target;
- no dependency on raw Zepp payload for normal operation.
