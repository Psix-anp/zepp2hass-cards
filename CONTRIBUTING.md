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
