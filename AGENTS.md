# Agent instructions

This repository contains the Helix Note public website.

## Working rules

- Preserve the site's existing static-site architecture unless a governed change explicitly replaces it.
- Keep changes small, coherent, and recoverable.
- Commit and push incrementally at meaningful recovery boundaries.
- Do not wait for remote CI after every push. Continue independent in-scope work while CI batches or runs.
- Inspect remote CI at the final implementation boundary by default.
- Inspect it earlier only when its result gates the next action, protects a high-risk boundary, or is required for merge/publication.
- Never treat queued, cancelled, unavailable, or unobserved CI as passing.

## CI batching

Ordinary commit-driven validation uses a 10-minute quiet-period debounce and cancels superseded waiting work for the same ref. Explicit publication or command/control operations remain immediate unless they use a separate cancellable pre-side-effect debounce gate.
