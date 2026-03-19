# Bug: installer fails on modern Node/Corepack with `Cannot find matching keyid`

## Summary

The install/update script can fail during the dependency step on machines where `pnpm` resolves to an older Corepack shim. In that case the script reaches:

```text
▸ Installing dependencies...
.../corepack.cjs:21535
Error: Cannot find matching keyid
```

The failure happens before project dependencies are installed. It is not caused by `Research-Claw` dependencies themselves; it is caused by Corepack failing to verify the current npm registry signing key for `pnpm`.

## Environment

- OS: macOS (Apple Silicon)
- Node observed in reports: `v23.3.0`, `v24.14.0`
- Corepack observed in failing environment: `0.29.4`
- Project package manager: `pnpm@9.15.0`
- Project commit observed while reproducing: `0f297a4`

## Reproduction

1. Use a system where `pnpm` is provided by an older bundled Corepack.
2. Run the installer on an existing checkout:

```bash
cd ~/research-claw
bash scripts/install.sh
```

3. The script updates the repo and then fails at dependency installation with:

```text
Error: Cannot find matching keyid: {"signatures":[...],"keys":[...]}
```

## Why this happens

- `package.json` pins `packageManager: "pnpm@9.15.0"`.
- The installer only checks whether `pnpm` exists in `PATH`.
- On some machines `pnpm` is actually a Corepack shim backed by an older Corepack release.
- Older Corepack versions do not recognize the newer npm registry signing key and fail when fetching/verifying `pnpm`.
- The installer then aborts at `pnpm install`, even though the project itself is otherwise installable.

There is a second usability issue here: the installer runs `git reset --hard HEAD` during update. That means any local workaround in `scripts/install.sh` is erased on the next run unless the fix is committed.

## Suggested fix

The installer should not trust `command -v pnpm` alone. It should:

1. Validate that `pnpm --version` actually works.
2. If it fails, install a project-local standalone `pnpm` (for example under `.tools/pnpm`).
3. Resolve and store the absolute `pnpm` path once.
4. Use that resolved binary for:
   - `pnpm install`
   - `pnpm build`
   - `pnpm build:dashboard`
   - `pnpm rebuild better-sqlite3`
   - any reinstall/rebuild fallback path

This avoids broken Corepack shims and also keeps the install/update flow self-contained.

## Local patch result

With a local patch that:

- falls back to a standalone `pnpm@9.15.0`
- stores the resolved binary in `PNPM_BIN`
- uses `"$PNPM_BIN"` for all install/build/rebuild operations

the following commands completed successfully on the same machine:

```bash
/Users/air/research-claw/.tools/pnpm/bin/pnpm install --frozen-lockfile
/Users/air/research-claw/.tools/pnpm/bin/pnpm build
```

## Actual / Expected

Actual:

- installer updates repo
- dependency installation fails with Corepack `Cannot find matching keyid`

Expected:

- installer should recover from broken/outdated Corepack
- dependencies and build should complete without requiring users to debug package-manager signature issues

## Relevant error excerpt

```text
Error: Cannot find matching keyid: {"signatures":[{"sig":"...","keyid":"SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U"}],"keys":[{"expires":null,"keyid":"SHA256:jl3bwswu80PjjokCgh0o2w5c2U4LhQAE57gj9cz1kzA",...}]}
```
