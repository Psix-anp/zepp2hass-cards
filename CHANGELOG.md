# Changelog

## [Unreleased]

## [1.2.0] - 2026-09-06

### Added

- Optional achievements for Activity, Sleep, and Training: 27 badge families with Bronze, Silver, and Gold levels, progress, observed earning dates, and an expandable collection.
- Activity rewards include goal streaks, accumulated steps and distance, observed personal records, active weekends, and comebacks. Sleep rewards cover personal duration windows, score targets, and bedtime/wake consistency. Training rewards cover recorded sessions, variety, and personal weekly workout-day goals.
- Graphical settings to enable achievements, disable their category or individual badges, show or hide locked badges, configure personal targets, and opt into reward animations.
- Optional activity calendar with goal-based shading, selected-day hourly details, yesterday comparison at the same local time, summaries of the last two completed seven-day periods, entity update age, and compact display.
- New feature switches are off by default. Disabled optional sections do not request additional history. All new controls and labels support English and Russian.

### Fixed

- Fixed a false midnight spike in hourly activity caused by counting the recorder's initial state (the previous day's step total) as new steps.
- Hourly activity now includes only the selected day in the Home Assistant time zone. Attribute-only updates no longer carry stale step values into today's chart, while genuine steps after midnight remain visible.

### Development

- Split source code into focused modules while keeping the single ready-to-install HACS bundle. Added source/bundle parity checks and browser coverage for optional sections, touch, keyboard, and graphical settings.

### Data availability

- Achievements are recalculated from available records in a rolling 30-day window; they are not a permanent trophy archive. Missing records do not prove streaks or zero activity. Historical comparisons require sufficient recorded coverage.

## [1.1.1] - 2026-09-05

### Fixed

- Tap a day in the 7-day or 30-day activity chart to see its date, step count, and goal completion percentage. The full height of each bar is selectable, including days with no activity.
- Mouse hover and keyboard selection show the same details. The selected day is preserved during live updates, and selecting a day no longer rebuilds the card.
- Days with zero steps are clearly distinguished from days with missing history.

### Appearance

- Added selected-day highlighting, gradient bars, and a details panel below the activity chart.
- Improved date labels at the boundaries of the 30-day chart.

## [1.1.0] - 2026-09-04

### Added

- Zepp Overview Card: a compact current-day view for steps, Sleep Score, heart rate, PAI and recovery.
- Overview Card GUI editor with Zepp2Hass registry discovery and manual entity overrides.
- Tapping a metric opens its Home Assistant entity details.

## [1.0.3] - 2026-09-04

- Activity: tapping an hourly bar now shows the selected time range and step count on touch devices.

## [1.0.2] - 2026-09-04

### Fixed
- Activity graphical editor now exposes Auto / Русский / English language selection and persists it in card config.

## [1.0.1] - 2026-09-04

### Fixed
- Sleep hypnogram now has a dedicated left label gutter.
- Zoomed/panned sleep plot is clipped so stage lines cannot overlap labels.
- Sleep time-axis alignment follows the plot gutter.

## [1.0.0] - 2026-09-04

### Added
- Activity 24-hour step profile and best active hour.
- Sleep average bedtime/wake time and latest schedule deviation.
- Amazfit Training Card with GUI editor and config-entry discovery.

## [0.9.0] - 2026-09-03

### Added
- Family top-three CSS medals with competition ranking.
- Activity records, 7/30-day bests, averages and goal streaks.

## [0.8.2] - 2026-09-03

### Fixed
- Sleep hover rerender/flicker.
- Full hit areas for 7/30-day sleep drill-down.

### Added
- Sleep wheel/pinch zoom, pan, and zoom reset gestures.
