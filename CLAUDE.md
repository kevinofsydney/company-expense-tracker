# Claude Code Adapter

Follow the shared policy in `AGENTS.md` as the primary engineering policy for this repository.

## Claude-specific behavior
- At the start of a task, read `AGENTS.md` and align with its rules before making changes.
- Use the repository’s existing scripts first.
- After code changes, proactively run the relevant checks from `AGENTS.md` without waiting to be asked.
- If a required linting or dead-code tool is missing, install it using the repo’s existing package manager or environment manager, then continue.
- Do not stop at implementation; finish by validating with the relevant checks and cleaning dead/slop code.
- Keep edits minimal and coherent. Avoid broad unrelated refactors unless they are required to complete the task cleanly.
- If a check reports likely false positives, call them out explicitly rather than silently ignoring them.

## Preferred validation order
For JavaScript / TypeScript:
1. typecheck
2. lint
3. knip
4. fast lint pass if configured

For Python:
1. ruff check
2. ruff format --check
3. vulture

## Completion rule
A task is not complete until the relevant checks pass, or any remaining failures are clearly explained with concrete reasons and next steps.