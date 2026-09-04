# Installation and cache refresh

## HACS custom repository

Use `https://github.com/Psix-anp/zepp2hass-cards` as a custom Dashboard/Plugin repository in HACS.

## Manual installation

Copy the root `zepp2hass-cards.js` file to:

```text
/config/www/zepp2hass-cards/zepp2hass-cards.js
```

Add exactly one JavaScript Module resource:

```text
/local/zepp2hass-cards/zepp2hass-cards.js
```

When testing a new local build, a query suffix can force cache invalidation, for example:

```text
/local/zepp2hass-cards/zepp2hass-cards.js?v=101
```

Remove obsolete duplicate resource entries and hard-refresh the browser after changing the bundle.
