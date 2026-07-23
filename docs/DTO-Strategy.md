# Hason — DTO Strategy

Product models never equal storage documents. Mapping happens once, at the infrastructure boundary, in the storage-to-product direction only.

## The product models

`EventExperienceContent` (slug, title, brandName, navigation, scenes) and `SceneData` (id, type, title, enabled, content) are the experience contract; `StudioCreator` (id, name — never empty, email) is the identity model; `AttendeeExperienceContent` is the companion contract; `EventHealth` and `Finding` are computed domain models; `ComposerSnapshot` is the persistence DTO-to-be. All are plain, serializable, storage-ignorant TypeScript — which is precisely what makes mobile/API/AI consumers possible.

## Rules

1. `@/payload-types` is an infrastructure-only import; generated storage types never appear in a product signature.
2. Each adapter owns its mapper (`toSceneData`, `toStudioCreator`) — small, pure, unit-tested where behavior exists (name fallback, id normalization).
3. No product→storage mapping exists yet by design; it arrives inside `ComposerPersistence` (S4) and will live in the same adapter files.
4. DTOs carry product language: `brandName` not `organization.name`, `creator` not `user`, `scenes` not `docs`.
5. No duplicate mapping: one mapper per document type per adapter; services pass DTOs through untouched (Objective 10 — zero re-mapping allocations above the boundary).
