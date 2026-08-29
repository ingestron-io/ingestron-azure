# Ingestron Azure

Customer-managed Azure deployment tooling for the Ingestron Profile J technical
preview. This repository contains inspectable Bicep, deterministic bundle
assembly, change boundaries, and the guarded Function package deployment helper.

Most operators should use the [Ingestron CLI](https://github.com/ingestron-io/ingestron-cli),
which verifies these bundles and manages plan, install, status, verification,
upgrade, rollback, ADF hand-off, and exact uninstall.

## Build and validate

Requirements: Node.js 22, pnpm 10.15.0, Azure CLI, and the Bicep CLI version in
`toolchain.json`.

```sh
corepack enable
pnpm install --frozen-lockfile
az bicep install --version v0.46.1
pnpm validate
```

`pnpm bundle:build` writes deterministic Profile J bundles `1.1.0`, `1.1.1`,
`1.2.0`, `1.2.1` and `1.3.0`
under `build/customer-bundle/`. Every manifest pins the Bicep templates, guarded
deployment helper, Function ZIP, public worker image, applicable licences, and
their SHA-256 digests.

Bundle `1.3.0` adds the customer-managed durable landing-batch contract gate. It
does not enable the outcome in Hosted Jobs or add Azure resources.

## Licence boundary

Source in this repository is licensed under Apache-2.0. Released Profile J
Function object code and worker images are not Apache-licensed; they use the
separate Ingestron Runtime Preview Licence in `LICENSE-RUNTIME-PREVIEW.md`. See
`LICENSING.md` before downloading or deploying a runtime artefact.

This is an unsupported technical preview, not a production service, security
certification, warranty, indemnity, support agreement, or SLA. Customer-managed
deployment keeps data, storage, identity, logs, retention, and Azure consumption
in the operator's subscription.

See `docs/deployment-lifecycle.md`, `docs/security-and-data.md`,
`COMPATIBILITY.md`, and `SECURITY.md`.
