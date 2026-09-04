# Roadmap

## First public baseline

- [ ] Add Activity graphical language selector (Auto / Русский / English).
- [ ] Keep all five editors stable during frequent Home Assistant `hass` updates.
- [ ] Run `npm run check`.
- [ ] Push baseline to `main`.
- [ ] Get GitHub Actions + HACS validation green.
- [ ] Install from GitHub/HACS custom repository in a real Home Assistant instance.
- [ ] Capture sanitized public screenshots.
- [ ] Create first release only after user acceptance.

## Near-term polish

- Family: winner of day/week/month, family record, per-person record, history of first places.
- Shared Zepp2Hass device picker/status summary in editors.
- Editor diagnostics: found/missing/unavailable metrics and last update.
- Compact / Full / Auto presentation modes.
- More expressive Health trends without medical interpretation.

## Later

- Optional unified/fullscreen Zepp dashboard composed from the cards.
- Consider splitting source into focused modules with a build step only after the public baseline is stable and tests preserve behavior.
