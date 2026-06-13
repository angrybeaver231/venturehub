# Signal Sources

Drop one file per source here, exporting an instance of a class extending `SignalIngestor`.
Each source must:

- Provide a unique `sourceKey`
- Belong to a category from `SIGNAL_SOURCE_CATEGORIES`
- Implement `execute(ctx)` returning the number of events created
- Use `this.recordEvent({ dedupeKey, ... })` for dedupe + storage
- Throw `MissingCredentialError` (via `requireCredential`) if config is missing — the base class will mark the source as `no_credentials`

Register each source from `server/signals/sources/index.ts` so `bootstrapSignals()` picks it up.
