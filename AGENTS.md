# Repository Guide

`gh-base-repo` is a central template repository. It stores reusable templates that can be pushed into other repositories via a GitHub Actions workflow, rather than requiring each repository to be set up from scratch.

## Repository structure

```
.github/
  templates/          # Named template bundles (see below)
    docker-deploy/    # Docker build & deploy workflow
    nodejs/           # Node.js workspace monorepo scaffold
    npm-publish/      # NPM package publish workflow
    typescript/       # TypeScript/Node.js project with Mocha/Chai
  workflows/
    distribute.yml    # Workflow that pushes templates to target repos
```

## Templates

Each subdirectory of `.github/templates/` is a self-contained template bundle. The files inside mirror the path structure they should have in the target repository root. For example:

```
.github/templates/docker-deploy/.github/workflows/docker-deploy.yml
                  ^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                  template name  path in the target repo
```

### docker-deploy

Adds a Docker build and push workflow to a target repository.

**File:** `.github/workflows/docker-deploy.yml`

**Triggers:**
- `release` (published) — builds and pushes the image tagged with the release version (e.g. `v1.2.3`)
- `workflow_dispatch` — builds a release candidate tagged as `v<Major>.<Minor>.<Patch>-RC-<short-sha>`, with an optional `deploy` input to push it to the registry

**Configuration (set in the target repo):**

| Name | Type | Description |
|------|------|-------------|
| `DOCKER_REGISTRY` | Repository variable | Container registry host. Defaults to `ghcr.io` if not set |
| `REGISTRY_USERNAME` | Secret | Registry login username. Defaults to `github.actor` (works for GHCR) |
| `REGISTRY_PASSWORD` | Secret | Registry login password. Defaults to `GITHUB_TOKEN` (works for GHCR) |

### nodejs

Adds a root `package.json` configured for an npm workspace monorepo.

**File:** `package.json`

Includes `build`, `test`, `lint`, and `format` scripts that each delegate to every workspace via `npm run <script> --workspaces --if-present`. Add workspace package paths to the `workspaces` array as packages are added to the repository.

### npm-publish

Adds an NPM package publish workflow to a target repository.

**File:** `.github/workflows/npm-publish.yml`

**Triggers:**
- `release` (published) — strips the `v` prefix from the release tag, bumps `package.json` to that version, publishes to npm, packs a tarball, and attaches it to the GitHub release
- `workflow_dispatch` — builds a release candidate versioned as `<Major>.<Minor>.<Patch>-RC-<short-sha>` based on the latest git tag, with an optional `deploy` input to publish it

**Dist-tag logic** (carried through to `npm publish --tag`):

| Version format | Dist-tag |
|----------------|----------|
| `1.2.3` | `latest` |
| `1.2.3-alpha.1` | `alpha` |
| `1.2.3-RC-abc1234` | `RC` |
| `1.2.3-1` (numeric pre-release) | `next` |

**Configuration (set in the target repo):**

| Name | Type | Description |
|------|------|-------------|
| `NPM_REGISTRY_URL` | Repository variable | Registry URL. Defaults to `https://registry.npmjs.org` if not set |
| `NPM_REGISTRY_TOKEN` | Secret | Auth token for the registry. Required when `deploy` is true |

**Job summary** — each run writes a summary to the Actions tab showing the package name, version, publish status, dist-tag, and tarball filename.

### typescript

A TypeScript/Node.js project scaffold with Mocha and Chai for testing and ts-node for direct execution.

**Files:**

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript compiler config (CommonJS, ES2022, strict) |
| `.mocharc.yml` | Mocha config — registers ts-node and points at `test/**/*.test.ts` |
| `src/index.ts` | Entry point placeholder |
| `test/index.test.ts` | Example test demonstrating Mocha/Chai usage |

**Scripts:**

| Script | Command |
|--------|---------|
| `npm run build` | `tsc` — compiles to `dist/` |
| `npm test` | `mocha` — runs all `test/**/*.test.ts` files via ts-node |
| `npm start` | `ts-node src/index.ts` — runs the entry point directly |

After distributing, update `name` in `package.json` and run `npm install`.

## Distributing a template

Templates are pushed to target repositories using the **Distribute Template** workflow (`distribute.yml`), triggered manually from the Actions tab.

**Inputs:**

| Input | Description |
|-------|-------------|
| `target_repo` | The repository to push to, in `owner/repo` format |
| `template` | The template to distribute (`docker-deploy`, `nodejs`, `npm-publish`, or `typescript`) |

The workflow checks out both this repo and the target repo, copies all files from the chosen template bundle into the target root, and opens a pull request in the target repository for review before anything is merged.

**Required secret:** `DISTRIBUTION_TOKEN` — a Personal Access Token (or GitHub App token) with `repo` write access to any target repository you intend to distribute to. Set this in the settings of this repository.

> The distribute workflow always opens a PR rather than pushing directly, so the target repository owner can review what changed.

## Adding a new template

1. Create a new subdirectory under `.github/templates/<template-name>/`
2. Add files using the same path structure they should have in the target repo
3. Add `<template-name>` to the `options` list of the `template` input in `.github/workflows/distribute.yml`
