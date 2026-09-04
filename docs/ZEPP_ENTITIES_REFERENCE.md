# Sanitized Zepp2Hass Entity Reference

This file was generated from a real Zepp2Hass/Home Assistant installation, but values and private registry identifiers were removed. It exists only as a compatibility reference for card discovery and tests.

Important observed edge cases:

- Distance may receive a Home Assistant collision suffix such as `sensor.amazfit_balance_distance_2`; never assume the pretty entity ID.
- Training entities may share the same Zepp2Hass `config_entry_id` while Home Assistant associates them with another `device_id`.
- Raw payload entities are not required by these cards.

| Entity ID observed | Original name | Attribute keys | Disabled |
|---|---|---|---|
| `binary_sensor.amazfit_balance_is_charging` | Is Charging | `device_class`, `icon` | no |
| `binary_sensor.amazfit_balance_is_moving` | Is Moving | `device_class`, `icon` | no |
| `binary_sensor.amazfit_balance_is_sleeping` | Is Sleeping | `icon` | no |
| `binary_sensor.amazfit_balance_is_wearing` | Is Wearing | `device_class`, `icon` | no |
| `sensor.amazfit_balance_battery` | Battery | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_blood_oxygen` | Blood Oxygen | `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_body_temperature` | Body Temperature | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_calories` | Calories | `device_class`, `icon`, `state_class`, `target`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_device` | Device | `bar_height`, `ble_addr`, `bt_addr`, `device_color`, `device_source`, `height`, `icon`, `key_number`, `key_type`, `pixel_format`, `product_id`, `product_ver`, `screen_shape`, `sku_id`, `width`, `wifi_addr` | no |
| `sensor.amazfit_balance_distance_2` | Distance | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_fat_burning` | Fat Burning | `device_class`, `icon`, `state_class`, `target`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_heart_rate` | Heart Rate | `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_heart_rate_max` | Heart Rate Max | `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_heart_rate_resting` | Heart Rate Resting | `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_last_error` | Last Error | `icon` | no |
| `sensor.amazfit_balance_last_workout` | amazfit_balance Last Workout | `date`, `duration_minutes`, `icon`, `sport_type_id`, `start_time`, `time` | no |
| `sensor.amazfit_balance_pai` | PAI | `icon`, `last_week`, `state_class`, `today`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_raw_data` | Raw Data | — | yes |
| `sensor.amazfit_balance_record_time` | Record Time | — | yes |
| `sensor.amazfit_balance_screen_aod_mode` | Screen AOD Mode | `icon` | no |
| `sensor.amazfit_balance_screen_brightness` | Screen Brightness | `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_screen_status` | Screen Status | `icon` | no |
| `sensor.amazfit_balance_sleep_awake` | Sleep Awake | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_sleep_deep` | Sleep Deep | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_sleep_end` | Sleep End | `device_class`, `icon` | no |
| `sensor.amazfit_balance_sleep_light` | Sleep Light | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_sleep_rem` | Sleep REM | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_sleep_score` | Sleep Score | `icon`, `stages`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_sleep_start` | Sleep Start | `device_class`, `icon` | no |
| `sensor.amazfit_balance_sleep_total` | Sleep Total | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_stands` | Stands | `icon`, `state_class`, `target`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_steps` | Steps | `icon`, `state_class`, `target`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_stress` | Stress | `icon`, `last_week`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_training_load` | amazfit_balance Training Load | `full_recovery_time_hours`, `icon`, `state_class`, `unit_of_measurement`, `vo2_max` | no |
| `sensor.amazfit_balance_trigger_event` | Trigger Event | `icon` | no |
| `sensor.amazfit_balance_user` | User | `age`, `app_platform`, `app_version`, `birth_date`, `gender`, `height`, `icon`, `region`, `weight` | no |
| `sensor.amazfit_balance_workout_altitude` | Altitude | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_avg_cadence` | Avg Cadence | `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_avg_pace` | Avg Pace | `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_avg_speed` | Avg Speed | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_cadence` | Cadence | `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_calories` | Calories | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_count` | Count | `icon`, `recent_workouts`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_distance` | Distance | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_downhill_count` | Downhill Count | `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_duration` | Duration | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_pace` | Pace | `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_speed` | Speed | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_state` | State | `icon` | no |
| `sensor.amazfit_balance_workout_stride` | Stride | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_total_count` | Total Count | `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_total_downhill_distance` | Total Downhill Distance | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_total_up_altitude` | Total Up Altitude | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
| `sensor.amazfit_balance_workout_vertical_speed` | Vertical Speed | `device_class`, `icon`, `state_class`, `unit_of_measurement` | no |
