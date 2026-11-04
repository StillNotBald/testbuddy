# Services layer

Every data access in the UI goes through a typed service interface, never straight to
`pocketbase` or fixtures from a component.

- Interfaces live in `types.ts` next to the entity types (`CasesService`, `RunsService`, ...).
- Two implementations per service:
  - `mock`: in-memory fixtures. Used in Milestone 0 so UI can be built without a backend.
  - `pocketbase`: real implementation using `src/lib/pb.ts` (added from M1).
- `NEXT_PUBLIC_DATA_SOURCE=mock|pocketbase` (default `mock`) picks the implementation in one
  factory (e.g. `getServices()`), so components and React Query hooks stay identical.
- Components call hooks (React Query) that call the service; they do not know the source.
- Entity types in `types.ts` mirror `docs/database-schema.md`. Keep them in sync with it.
