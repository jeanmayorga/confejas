<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-git-workflow -->

# Git workflow

- Always start new work on a new branch created from the latest `main`.
- If related work is already in progress on a branch whose pull request has not been merged, continue on that branch.
- Once a branch's pull request has been merged, do not keep working on that branch; create a fresh branch from the latest `main`.
- For every requested feature, commit and push the changes, then provide a pull request targeting `main`.

<!-- END:project-git-workflow -->
