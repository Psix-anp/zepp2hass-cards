# Contributing

Contributions are welcome after the initial public baseline is established.

## Development

Requirements: Node.js 22+.

```bash
npm run check
```

No npm dependencies are currently required for the validation suite.

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
