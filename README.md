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
`1.2.0`, `1.2.1`, `1.3.0`, `1.4.0`, `1.5.0`, `1.6.0` and `1.7.0`
under `build/customer-bundle/`. Every manifest pins the Bicep templates, guarded
deployment helper, Function ZIP, public worker image, applicable licences, and
their SHA-256 digests.

Bundle `1.3.0` adds the customer-managed durable landing-batch contract gate. It
does not enable the outcome in Hosted Jobs or add Azure resources.

Bundle `1.4.0` adds the customer-managed durable copy-reconciliation gate. It
pins Jobs `0.3.0-preview.1`, reads only a control manifest and creates no new
Azure resource. Hosted Jobs remains unchanged.

Bundle `1.5.0` adds the customer-managed durable schema-baseline compatibility
gate. It pins Jobs `0.4.0-preview.1`, compares only the JSON Schemas declared in
one control manifest and creates no new Azure resource. Hosted Jobs remains
unchanged.

Bundle `1.6.0` adds the customer-managed durable dataset quality-policy gate.
It pins Jobs `0.5.0-preview.1`, evaluates only the bounded JSON control sample
inside one digest-pinned manifest and creates no new Azure resource. Hosted Jobs
remains unchanged.

Bundle `1.7.0` adds the customer-managed durable reference-integrity gate. It
pins Jobs `0.6.0-preview.1` and checks only the key tuples deliberately supplied
in one bounded control manifest. The result identifies duplicate entity keys and
orphan references by check name and input index without persisting key values.
The bundle adds no Azure resource, Hosted Jobs route, dataset reader or join
service.

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
