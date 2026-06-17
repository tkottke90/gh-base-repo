# gh-base-repo

A central template repository for bootstrapping GitHub projects. Instead of setting up the same workflows and project scaffolding from scratch each time, distribute reusable templates to any target repository with a single GitHub Actions run.

## Available templates

| Template | What it adds | Typical use |
|----------|-------------|-------------|
| `docker-deploy` | `.github/workflows/docker-deploy.yml` | Any repo that builds and pushes a Docker image |
| `npm-publish` | `.github/workflows/npm-publish.yml` | npm packages that publish to a registry on release |
| `nodejs` | `package.json` | Monorepo roots that need npm workspace script delegation |
| `typescript` | `package.json`, `tsconfig.json`, `.mocharc.yml`, `src/`, `test/` | New TypeScript packages with Mocha/Chai testing |

## Distributing a template

1. Go to **Actions → Distribute Template → Run workflow**
2. Fill in the inputs:
   - **Target repository** — the repo to push to, e.g. `tkottke90/my-project`
   - **Template** — choose from the list above
   - **Path** _(optional)_ — subdirectory inside the target repo to place the files, e.g. `packages/my-lib`. Leave blank to copy to the repo root. Most useful with `nodejs` and `typescript`.
3. Click **Run workflow**

A pull request is opened in the target repository. Review the diff before merging — nothing is written directly to any branch.

**Required setup (one time):** create a secret named `DISTRIBUTION_TOKEN` in this repository containing a Personal Access Token with `repo` write access to every target repository you intend to distribute to.

## Template configuration

Each template may require variables or secrets to be set in the **target** repository after the PR is merged.

### docker-deploy

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `DOCKER_REGISTRY` | Variable | No | Registry host. Defaults to `ghcr.io` |
| `REGISTRY_USERNAME` | Secret | No | Login username. Defaults to the actor running the workflow (works for GHCR) |
| `REGISTRY_PASSWORD` | Secret | No | Login password. Defaults to `GITHUB_TOKEN` (works for GHCR) |

### npm-publish

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `NPM_REGISTRY_URL` | Variable | No | Registry URL. Defaults to `https://registry.npmjs.org` |
| `NPM_REGISTRY_TOKEN` | Secret | Yes* | Auth token for publishing. *Required only when deploying |

### nodejs / typescript

No configuration needed. After the PR merges, update the `name` field in `package.json` and run `npm install`.

## Release versioning

Both deploy workflows (`docker-deploy`, `npm-publish`) follow the same versioning pattern:

- **On release (published):** the GitHub release tag is used as the version. Docker tags keep the `v` prefix (`v1.2.3`); npm versions strip it (`1.2.3`).
- **On manual trigger (`workflow_dispatch`):** a release candidate is built as `<latest-tag>-RC-<short-sha>` (e.g. `v1.2.3-RC-a1b2c3d`). Publishing is gated behind a `deploy` checkbox that defaults to off, so triggering manually is a safe dry run.

## Adding a new template

1. Create a directory under `.github/templates/<template-name>/`
2. Add files at the paths they should occupy in the target repo root — the distributor copies the directory contents verbatim
3. Add the template name to the `options` list of the `template` input in `.github/workflows/distribute.yml`

For deploy-style templates, follow the versioning pattern described above and refer to `AGENTS.md` for implementation details.
