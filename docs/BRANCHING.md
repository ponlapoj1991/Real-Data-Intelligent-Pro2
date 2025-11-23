# Branching and PR Flow

This project uses a simple feature-branch workflow to keep changes isolated and reviewable.

## When to create a branch
- Start a new branch for each approved task or feature area.
- Name branches descriptively, e.g., `feature/pptx-import-tests` or `fix/report-drag-interaction`.
- Work on one task at a time; create the next branch only after the current task is merged.

## Why not many parallel branches
- Keeping a single active branch reduces merge conflicts and makes reviews faster.
- Finished branches are merged via PRs and then deleted to avoid clutter.

## Pull request expectations
- Each branch should open one PR focused on a clear scope.
- PR descriptions should summarize the user-facing change and list any tests run.
- After approval and CI success, merge the PR into the main branch.

## Communication
- Before starting work, announce which task you will address and the branch name.
- If requirements change mid-task, pause development and realign before continuing.

Following this flow keeps the repository organized while ensuring every change is reviewed and traceable.
