# Coding Standards

<!-- Customize this file with your project's coding standards.
     The reviewer agent loads it during code review via @.sandcastle/CODING_STANDARDS.md
     so these standards are enforced during review without costing tokens during implementation. -->

## Style

<!-- Example:
- Use camelCase for variables and functions
- Use PascalCase for classes and types
- Prefer named exports over default exports
-->

- Split frontend UI into focused components, with each component in its own file when the split improves readability or testability.

## Testing

<!-- Example:
- Every public function must have at least one test
- Use descriptive test names that explain the expected behavior
-->

- Changes to local startup must preserve a working `pnpm dev` authenticated todo path across real service processes.
- Reviewers should run or justify not running the local workflow checks when scripts, service auth, or frontend API wiring changes.

## Architecture

<!-- Example:
- Keep modules focused on a single responsibility
- Prefer composition over inheritance
-->

- Frontend components depend on frontend-owned models and API adapters, not contract Resource types or raw oRPC calls.
- Keep contract-to-UI mapping inside the frontend adapter layer.
- Check `README.md`, `CONTEXT.md`, `docs/adr/0011-use-real-service-processes-in-dev-and-fakes-in-focused-tests.md`, and `docs/adr/0006-use-frontend-api-adapter-above-orpc.md` before changing local development workflow or frontend seam behavior.
