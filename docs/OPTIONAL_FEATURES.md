# Optional features

All new main switches default to **off**, preserving existing dashboards. Use the
graphical editor; YAML names below are provided for advanced configuration.

## Activity sections

| Setting | Function |
|---|---|
| `show_day_details` | Select a date directly or tap a 7/30-day chart bar to inspect recorded hourly steps, distance, and calories when available. |
| `show_comparison` | Compare recorded steps today and yesterday at the same local clock time. Differences appear only with sufficient history coverage. |
| `show_calendar` | Current-month calendar with goal-based shading, zero/missing differentiation, and selectable days. Enable day details separately for hourly drill-down. |
| `show_weekly_summary` | Totals, goal days, and best day for the last seven completed days and the preceding seven days. Partial data is labelled. |
| `show_freshness` | Time since the Home Assistant step entity was updated; this is not the watch's synchronization time. |
| `compact_mode` | Denser spacing and collapsible optional sections. |

Calendar dates and comparisons follow the Home Assistant time zone. No historical
steps are invented to fill missing records. Hourly details show recorded increments;
the exact time of movement cannot be recovered from infrequent watch updates.

## Achievements

Available in Activity, Sleep, and Training. Each card displays its own category.

| Setting | Default | Function |
|---|---|---|
| `show_achievements` | `false` | Master switch. |
| `achievements_activity` / `achievements_sleep` / `achievements_training` | `true` | Category switch beneath the master switch; only the card's own category applies. |
| `show_locked_achievements` | `true` | Include unearned badges in the expandable collection. |
| `achievement_animation` | `false` | Animate newly observed levels; respects reduced-motion preferences. |
| `achievement_<badge_id>` | `true` | Show or hide an individual badge; all are listed in the editor. |
| `achievement_steps_target` | `10000` | Personal step threshold used for achievement calculations. |
| `achievement_sleep_target` | `480` | Personal sleep duration target in minutes. |
| `achievement_sleep_tolerance` | `30` | Allowed duration difference, in minutes, on either side of the target. |
| `achievement_sleep_score_target` | `80` | Personal Sleep Score threshold. |
| `achievement_training_weekly_target` | `2` | Target number of distinct workout days per calendar week. |

Targets are personal display settings, not medical recommendations. Changing a
target recalculates the available history. Longer sleep is not automatically better;
duration rewards require falling inside the configured window.

### Activity: 10 families

- `activity_goal_days`: days meeting the personal goal.
- `activity_goal_streak`: consecutive recorded goal days.
- `activity_moving_days`: days reaching half the goal.
- `activity_weekend`: weekend goal days.
- `activity_comeback`: a goal day immediately after a recorded below-goal day.
- `activity_steady`: consecutive days reaching half the goal.
- `activity_total_steps`: accumulated steps, with 50,000 / 100,000 / 250,000 milestones.
- `activity_distance`: 25 / 50 / 100 recorded kilometres; requires distance statistics with known units.
- `activity_records`: new maxima exceeding earlier observed step days.
- `activity_goal_month`: 10 / 20 / 25 goal days in the rolling window.

### Sleep: 8 families

- `sleep_window`: nights inside the personal duration window.
- `sleep_streak`: consecutive nights inside that window.
- `sleep_score`: nights reaching the selected Sleep Score.
- `sleep_bedtime`: adjacent recorded nights with bedtimes within 30 minutes.
- `sleep_wake`: adjacent recorded nights with wake times within 30 minutes.
- `sleep_balanced`: nights meeting both duration and score targets.
- `sleep_best`: scores exceeding earlier observed nights.
- `sleep_balanced_streak`: consecutive nights meeting duration and score targets.

### Training: 9 families

- `training_days`: distinct workout days.
- `training_variety`: different recorded workout types.
- `training_rhythm`: weeks containing at least two workout days.
- `training_short`: distinct days with a 10–45 minute recorded session.
- `training_weekend`: distinct weekend workout days.
- `training_return`: workout types repeated at least seven days apart.
- `training_sessions`: 5 / 10 / 25 distinct recorded sessions.
- `training_goal_weeks`: weeks meeting the personal workout-day target.
- `training_week_streak`: consecutive weeks meeting that target.

## History and privacy

Badges are derived from available records in the last **30 local dates**, including
today. They are not permanently stored and can disappear as records leave the
window. Dates mean the first observed attainment of the displayed level within
that window, not a lifetime first. Training uses the recent workouts and last
workout exposed by the integration, which may cover fewer than 30 days.

Missing days never count as recorded zeroes and cannot bridge a streak. A record
needs an earlier observation to beat. A reward based on observed positive evidence
can still be earned from partial history; this does not imply a complete archive.
Disabling achievements prevents their additional history requests. Everything is
calculated locally in the card; no new external service or persistent browser
storage is used.
