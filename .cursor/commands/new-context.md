# Add a Futrob hexagonal feature module

Use when a capability cannot belong to an existing module in `packages/<bc>`.

1. Confirm ownership in `docs/architecture/module-boundaries.md`. Prefer extending an existing module.
2. Create `packages/<context>/src/` with `domain`, `application`, and public `index.ts`. Add product adapters in `apps/api/src/adapters/<context>/` and web presentation/BFF in `apps/web/src/modules/<context>/` as needed.
3. Add `apps/api/src/di/<context>.module.ts` and wire it from `apps/api/src/di/create-modules.ts`.
4. Keep provider names and D1/R2 types in adapters; keep domain pure.
5. Cross-module only via public API, reader ports/bridges, or versioned events declared in the producer BC; keep the web event catalog aligned without importing app code into packages.
6. Update module-boundaries + dependency-graph if the DAG changes; ADR if material.
7. Follow `.cursor/skills/futrob-hexagonal-module/SKILL.md`.
8. Add focused domain/application tests with fake ports.
