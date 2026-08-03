---
name: Auto Trades feature flag
description: The autoTrades tab is gated by isDomainFeatureEnabled('autoTrades'). Default is false, must be changed for dev visibility.
---

# Auto Trades feature flag

The `autoTrades` feature is gated in `src/components/shared/utils/config/config.ts`.

**The rule:** `DEFAULT_DOMAIN_FEATURES.autoTrades` must be `true` for the Auto Trades tab to appear in the Replit dev preview (and any hostname not listed in DOMAIN_CONFIG).

**Why:** `getDomainConfig()` falls back to `DEFAULT_DOMAIN_FEATURES` for unrecognized hostnames including all `*.replit.dev` / `*.picard.replit.dev` previews. The original default was `false`.

**How to apply:** When a new dev environment shows no Auto Trades tab, check `DEFAULT_DOMAIN_FEATURES` in config.ts first before investigating routing.
