# docs

Documentation site at docs.reflection.network. Only document what exists — no aspirational content.

## Stack

Astro 5, Starlight, TypeScript.

## Site structure

Starlight sidebar:
- **Concepts:** Architecture
- **Guides:** Getting started, Building containers, Adapters, Dev launcher

Custom theme with PostHog analytics (`m.reflection.network` proxy).

## Deployment

GitHub Pages, triggered on push to `master` (note: `master`, not `main`). Build: `npm ci && npm run build`.
