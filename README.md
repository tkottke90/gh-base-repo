# gh-base-repo

A central template repository for bootstrapping GitHub projects. Instead of setting up the same workflows and project scaffolding from scratch each time, distribute reusable templates to any target repository with a single GitHub Actions run.

## Available templates

| Template | What it adds | Typical use |
|----------|-------------|-------------|
| `docker-deploy` | `.github/workflows/docker-deploy.yml` | Any repo that builds and pushes a Docker image |
| `npm-app-docker` | `.github/actions/npm-app-docker/action.yml` | Composite action: npm ci → build → docker build/push |
| `npm-lib-publish` | `.github/actions/npm-lib-publish/action.yml` | Composite action: npm ci → build → version bump → publish |
| `npm-publish` | `.github/workflows/npm-publish.yml` | npm packages that publish to a registry on release |
| `nodejs` | `package.json` | Monorepo roots that need npm workspace script delegation |
| `ssh-deploy` | `.github/actions/ssh-deploy/action.yml` | Composite action: SSH into a server and run a command |
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

### npm-app-docker

Composite action — call it from a workflow step using `uses: ./.github/actions/npm-app-docker`.

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `node-version` | No | `24` | Node.js version |
| `registry` | No | `ghcr.io` | Container registry host |
| `image-tag` | Yes | — | Full image tag(s) to build and push (e.g. `ghcr.io/owner/repo:v1.0.0`) |
| `push` | No | `false` | Set to `'true'` to push the image |
| `registry-username` | No* | — | Registry login username. *Required when `push` is `true` |
| `registry-password` | No* | — | Registry login password or token. *Required when `push` is `true` |
| `context` | No | `.` | Docker build context path |
| `build-args` | No | — | Newline-separated `KEY=VALUE` Docker build arguments |
| `build-command` | No | `npm run build --workspaces --if-present` | Command used to build the application |
| `npm-registry` | No | — | Private NPM registry URL. Required when `npm-token` is set |
| `npm-token` | No | — | Auth token for the private NPM registry (store as a secret). Triggers `.npmrc` setup when set |

### npm-lib-publish

Composite action — call it from a workflow step using `uses: ./.github/actions/npm-lib-publish`.

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `node-version` | No | `24` | Node.js version |
| `version` | Yes | — | Package version to set (strip the `v` prefix, e.g. `1.2.3`) |
| `dist-tag` | No | `latest` | NPM dist-tag (e.g. `latest`, `next`, `beta`, `RC`) |
| `publish` | No | `false` | Set to `'true'` to publish to the registry |
| `registry-url` | No | `https://registry.npmjs.org` | NPM registry URL |
| `registry-token` | No* | — | Auth token for the registry. *Required when `publish` is `true`. Also configures `.npmrc` for `npm ci` when set |
| `build-command` | No | `npm run build --workspaces --if-present` | Command used to build the library |

**Output:** `tarball` — file name of the generated `.tgz` (e.g. `my-package-1.2.3.tgz`).

### npm-publish

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `NPM_REGISTRY_URL` | Variable | No | Registry URL. Defaults to `https://registry.npmjs.org` |
| `NPM_REGISTRY_TOKEN` | Secret | Yes* | Auth token for publishing. *Required only when deploying |

### nodejs / typescript

No configuration needed. After the PR merges, update the `name` field in `package.json` and run `npm install`.

### ssh-deploy

Composite action — call it from a workflow step using `uses: ./.github/actions/ssh-deploy`.

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `host` | Yes | — | SSH server hostname or IP address |
| `port` | No | `22` | SSH server port |
| `username` | Yes | — | SSH login username |
| `private-key` | Yes | — | SSH private key in PEM format (store as a secret) |
| `command` | Yes | — | Shell command to run on the remote server |
| `known-hosts` | No | — | `known_hosts` entry for the server (from `ssh-keyscan -H <host>`). Omitting falls back to TOFU — not recommended for production. |

## Release versioning

Both deploy workflows (`docker-deploy`, `npm-publish`) follow the same versioning pattern:

- **On release (published):** the GitHub release tag is used as the version. Docker tags keep the `v` prefix (`v1.2.3`); npm versions strip it (`1.2.3`).
- **On manual trigger (`workflow_dispatch`):** a release candidate is built as `<latest-tag>-RC-<short-sha>` (e.g. `v1.2.3-RC-a1b2c3d`). Publishing is gated behind a `deploy` checkbox that defaults to off, so triggering manually is a safe dry run.

## Adding a new template

1. Create a directory under `.github/templates/<template-name>/`
2. Add files at the paths they should occupy in the target repo root — the distributor copies the directory contents verbatim
3. Add the template name to the `options` list of the `template` input in `.github/workflows/distribute.yml`

For deploy-style templates, follow the versioning pattern described above and refer to `AGENTS.md` for implementation details.
