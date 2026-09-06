# Contributing

Contributions are welcome after the initial public baseline is established.

## Development

Requirements: Node.js 22+.

```bash
npm run build
npm run check
```

No npm dependencies are currently required for the validation suite.

Edit `src/core.js` for the existing cards, `src/achievements.js` for achievements,
and `src/activity-extras.js` for optional activity sections. Their shared card/editor
adapter is in `src/optional-shared.js`. The build produces the single
`zepp2hass-cards.js` file installed by HACS; do not edit the generated file directly.
Validation checks that the committed bundle exactly matches these sources.

For browser checks, install Playwright and Chromium in your development environment,
then run `npm run test:browser`. Alternatively, set `PLAYWRIGHT_MODULE` to the absolute
path of an existing Playwright module. Tests use synthetic records, not a live Home Assistant server.

## Pull requests

- Keep changes focused.
- Add/adjust tests for behavior changes before implementation.
- Preserve GUI-first Home Assistant configuration.
- Do not hard-code watch model prefixes or user-specific entity IDs.
- Never include Home Assistant exports, HAR files, tokens, webhook URLs, private hostnames, MAC addresses, device IDs, or other private telemetry.
- Update `CHANGELOG.md` for user-visible changes.

## Release notes

- Write each new version's changelog entry and GitHub Release description in English.
- Describe user-visible changes in plain language; do not use a commit hash or a raw commit list as the release description.
- The release workflow publishes the matching `CHANGELOG.md` section. Keep unreleased features out of notes for an already published version.
- To correct an existing release description without changing its tag or files, run the **Update release notes** workflow with the existing release tag.
