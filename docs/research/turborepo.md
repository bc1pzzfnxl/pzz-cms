# Turborepo for pzz-cms — research

Research note, primary sources only. Question: does adopting Turborepo pay off
for a bun-workspaces monorepo with two Astro apps (`apps/site`, `apps/cms`) and
one shared package (`packages/core`), deployed on Cloudflare Workers, CI on
GitHub Actions?

## Context

Today the repo is a single package: no `workspaces` field yet. The two-app split
is the planned target state. Deployment is Workers through `wrangler` (see
`docs/adr/0002-deploy-on-workers.md`), not Pages. CI runs on GitHub Actions
(`.github/workflows/ci.yml`).

## What bun already gives for free

Bun workspaces plus `bun run --filter` cover most of the task-orchestration
surface, documented in [Workspaces](https://bun.com/docs/pm/workspaces) and
[bun --filter](https://bun.com/docs/pm/filter):

- Package selection by name glob, `./path` glob, `{dir}` directory selector,
  and dependency relations (`foo...`, `...foo`, `...^foo`) — [bun --filter](https://bun.com/docs/pm/filter).
- Parallel script execution across selected packages with a terminal UI:
  `bun --filter '*' dev` runs all matching `dev` scripts in parallel
  ([bun --filter](https://bun.com/docs/pm/filter)).
- Dependency-ordered execution: `bun --filter '*' build` only starts `foo`
  after `bar` is done when `foo` depends on `bar`
  ([bun --filter](https://bun.com/docs/pm/filter)). Bun's `--parallel` and
  `--sequential` flags run without respecting dependency order
  ([Bun v1.3.9](https://bun.com/blog/bun-v1.3.9)).
- Failure tolerance (`--no-exit-on-error`) and skipping packages without the
  script (`--if-present`)
  ([bun --filter](https://bun.com/docs/pm/filter)).
- Hoisted, de-duplicated installs across workspaces
  ([Workspaces](https://bun.com/docs/pm/workspaces)).

So bun already provides: selection, parallelism, and dependency ordering. It
has no task-level cache of any kind: every run re-executes every task.

## What Turborepo adds

1. **Local incremental cache.** Tasks are fingerprinted from inputs (source
   files, lockfile, `package.json`, `turbo.json`, declared env vars); on a hit
   Turbo restores task outputs and logs instead of re-running. "Never do the
   same work twice" ([Caching](https://turborepo.com/docs/crafting-your-repository/caching)).
   Second runs complete in milliseconds ("FULL TURBO")
   ([Add to an existing repository](https://turborepo.com/docs/getting-started/add-to-existing-repository)).
   The docs themselves list cases where caching is slower than executing: very
   fast tasks, enormous outputs, scripts with their own caching
   ([Caching](https://turborepo.com/docs/crafting-your-repository/caching)).
   **At this size:** real but modest. Only the re-run of an untouched app or of
   `packages/core` skips work; a 3-package `check`/`build` re-run is cheap to
   begin with.

2. **Remote cache.** By default the cache is only local, so CI re-executes
   everything; remote caching shares one cache across machines. The docs frame
   the payoff as avoiding "duplicated work across your entire organization",
   and state you can speed up workflows without it
   ([Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)).
   **At this size:** ~no gain. One maintainer, one CI machine class. See
   CI options below.

3. **Task graph (DAG).** `turbo.json` declares task-to-task dependencies
   (`dependsOn: ["^build"]`), transit nodes, and root tasks; `turbo run build
   test lint` interleaves multiple tasks in one run
   ([Package and Task Graph](https://turborepo.com/docs/core-concepts/package-and-task-graph),
   [Running tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)).
   **At this size:** marginal. Bun already orders package→package; a 2-app,
   1-package graph has little interleaving to win.

4. **Source-control-aware filtering.** `--filter=[HEAD^1]`,
   `--filter=[main...feature]`, and `--affected` run only tasks in changed
   packages; `--affected` detects GitHub Actions from `GITHUB_BASE_REF`
   ([Running tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks),
   [Constructing CI](https://turborepo.com/docs/crafting-your-repository/constructing-ci)).
   **At this size:** CI is fast enough that skipping whole apps rarely matters.

5. **Package inference.** Global `turbo` run inside a package directory scopes
   to that package automatically; bun needs an explicit filter
   ([Running tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)).
   Convenience, not a capability gap.

6. **`turbo prune`** for Docker images — irrelevant here: deploys are
   `wrangler deploy`, no container
   ([Constructing CI](https://turborepo.com/docs/crafting-your-repository/constructing-ci)).

## Local dev ergonomics

- `dev`: Turbo registers `dev` as `"cache": false, "persistent": true` with a
  terminal UI and watch mode
  ([Developing applications](https://turborepo.com/docs/crafting-your-repository/developing-applications)).
  Bun's `bun --filter '*' dev` already runs both dev servers in parallel with
  its own TUI ([bun --filter](https://bun.com/docs/pm/filter)). Turbo's own
  guide says `dev` "doesn't provide much value in a single-package workspace"
  because dev outputs aren't cached ([Add to an existing repository](https://turborepo.com/docs/getting-started/add-to-existing-repository)).
  For two Astro dev servers the delta is the terminal UI, not speed.
- `build`/`check`/`test`: here Turbo's local cache is the only ergonomic win —
  repeated runs skip unchanged packages. Bun re-runs everything, every time.
- Cost: a `turbo.json`, `.turbo` in `.gitignore`, a `devEngines.packageManager`
  declaration, and a pinned `turbo` devDependency
  ([Add to an existing repository](https://turborepo.com/docs/getting-started/add-to-existing-repository)).

## CI

Baseline (bun scripts, no turbo): `oven-sh/setup-bun` + `bun install` +
`bun run check`/`build`/`test`, then `bunx wrangler deploy`. Turbo's GitHub
Actions guide shows the equivalent turbo workflow with `oven-sh/setup-bun`
([GitHub Actions guide](https://turborepo.com/docs/guides/ci-vendors/github-actions)).
The difference is only cache persistence between runs:

| Option                      | Setup                                                                                                                                                                                                                                                                                                 | Maintenance cost                                                                                                                                                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| None                        | —                                                                                                                                                                                                                                                                                                     | Zero. Turbo caches within a single run only.                                                                                                                                                                                                                                |
| `actions/cache` of `.turbo` | Documented in Turbo's own GH Actions guide: `path: .turbo`, key on `runner.os` + SHA, `restore-keys: ${{ runner.os }}-turbo-`                                                                                                                                                                         | Zero servers. Subject to GitHub cache limits: 10 GB per repo default, 7-day eviction, branch-scoped restore ([GitHub caching reference](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows)). |
| Self-hosted HTTP cache      | Any server implementing the Remote Cache API (OpenAPI spec, `v8` endpoints); login via `turbo login --manual`; community implementations: `turbo-cache-server`, `turborepo-remote-cache`, `tapico-turborepo-remote-cache` ([Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)) | Run and patch a server, manage tokens, availability. Hard to justify for a solo repo.                                                                                                                                                                                       |
| Vercel Remote Cache         | `TURBO_TOKEN`/`TURBO_TEAM`; OIDC via `vercel/setup-turborepo-remote-cache-action`, or a PAT ([GitHub Actions guide](https://turborepo.com/docs/guides/ci-vendors/github-actions))                                                                                                                     | Zero maintenance, but "free on all plans, even if you do not host your applications on Vercel" still means a Vercel account ([Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)) — an odd dependency for a repo otherwise fully on Cloudflare.       |

Cache-safety caveats, relevant to a public repo: GitHub's cache is scoped per
branch and read-only for untrusted triggers to prevent cache poisoning
([GitHub caching reference](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows));
Turborepo treats logs as cache artifacts and offers HMAC-SHA256 artifact
signing (`TURBO_REMOTE_CACHE_SIGNATURE_KEY`)
([Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)).

Cloudflare plays no role in any of this: Workers deploys go through `wrangler`
from CI, so neither Pages' monorepo features (root dir, build watch paths, max
5 projects per repo) nor Turbo's PaaS integrations apply. Pages' own monorepo
page says Pages "does not provide specialized tooling for dependency
management in monorepos" and points at Turborepo/NX/Lerna as bring-your-own
options ([Cloudflare Pages — Monorepos](https://developers.cloudflare.com/pages/configuration/monorepos/)).

## Scaling: when does it pay for itself?

No documented package-count threshold exists. The signals:

- Turbo's own starter ships 2 apps + 3 libraries — the size where its docs
  start to make sense ([Installation](https://turborepo.com/docs/getting-started/installation)).
- The caching docs warn caching is slower than executing for very fast tasks
  ([Caching](https://turborepo.com/docs/crafting-your-repository/caching)).
- Remote cache and `--affected` are pitched at "large repositories" and
  "your entire organization"
  ([Constructing CI](https://turborepo.com/docs/crafting-your-repository/constructing-ci),
  [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)).

Practical reading: Turbo starts paying when (a) contributor count × repeated
CI runs makes cross-machine cache hits frequent, or (b) package count grows to
where change-based skipping (`--affected`) avoids real work. Three packages
and one maintainer clear neither bar.

## Simplicity and risk

- **Extra config**: `turbo.json`, `devEngines.packageManager` (Turbo 2.0+
  expects a package-manager declaration; the repo only has `engines.bun`),
  `.turbo` in `.gitignore`, `turbo` pinned as a root devDependency
  ([Add to an existing repository](https://turborepo.com/docs/getting-started/add-to-existing-repository),
  [Upgrading to 2.0](https://turborepo.com/docs/crafting-your-repository/upgrading)).
- **Version pinning**: docs recommend pinning per-repo; a global binary defers
  to the local one ([Installation](https://turborepo.com/docs/getting-started/installation)).
  Major upgrades historically required codemods (`@turbo/codemod migrate`,
  [Upgrading to 2.0](https://turborepo.com/docs/crafting-your-repository/upgrading)).
- **Lockfile interplay with bun**: bun is "Stable" in Turbo's support policy
  (bun 1.2+), and Turbo 2.6 added granular `bun.lock` analysis so a dependency
  change in one app no longer busts the other's cache ([Support policy](https://turbo.build/docs/getting-started/support-policy),
  [Turbo 2.6](https://turborepo.com/blog/turbo-2-6)). Residual risk is
  documented by Turborepo itself: bun's lockfile "isn't part of its public
  API" and already broke Turbo's parser once (v0→v1)
  ([Turbo 2.6](https://turborepo.com/blog/turbo-2-6)); any root-lockfile change
  also misses every task's cache ([Caching](https://turborepo.com/docs/crafting-your-repository/caching)).
  Turbo also requires a lockfile to behave predictably
  ([Structuring a repository](https://turbo.build/docs/guides/workspaces)).
- **Structural constraint**: nested workspaces (`apps/**`) are not supported
  ([Structuring a repository](https://turbo.build/docs/guides/workspaces)).
- **Adoption with bun is first-class**: `bun install turbo --dev`, `bunx
  create-turbo@latest`, and a bun variant in the GitHub Actions guide
  ([Installation](https://turborepo.com/docs/getting-started/installation),
  [GitHub Actions guide](https://turborepo.com/docs/guides/ci-vendors/github-actions)).

## Verdict for pzz-cms

**Defer.** At two apps plus one package with a single maintainer, bun's
`--filter` already gives parallel, dependency-ordered task execution for free
while Turbo's headline wins — shared remote cache and change-based CI skipping —
need more contributors and more packages than exist here, and its real costs
(turbo.json, version pinning, lockfile coupling with bun) are immediate
([bun --filter](https://bun.com/docs/pm/filter),
[Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching),
[Caching](https://turborepo.com/docs/crafting-your-repository/caching)).
