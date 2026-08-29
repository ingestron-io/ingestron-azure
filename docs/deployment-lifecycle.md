# Deployment lifecycle

Use the Ingestron CLI for the supported preview workflow:

```text
ingestron azure init
ingestron azure plan
ingestron azure install
ingestron azure status
ingestron azure verify
ingestron azure upgrade
ingestron azure rollback
ingestron azure adf-config
ingestron azure plan-uninstall
ingestron azure uninstall
```

The CLI discovers the active Azure context, writes secret-free intent, verifies
the exact bundle/runtime digests, and runs Azure what-if before mutation. Install
uploads the pinned Function ZIP, imports the pinned public worker image into the
customer registry, deploys Profile J, and records exact owned resource IDs.

Upgrade and rollback are explicit. The previous verified lock remains available
until the replacement verifies. Uninstall previews and removes only the locked
resource group and any separately recorded CLI-created directory object; drift
or unrelated ownership fails closed.

Bundle `1.2.1` intentionally pins the same templates and runtime artefacts as
`1.2.0`. It exists to prove the public no-change upgrade and rollback lifecycle
without implying a runtime capability change.

Bundle `1.3.0` changes only the immutable Function and worker artefacts needed by
the `landing.batch-contract-gate` outcome. It creates no additional Azure
resource. The outcome is accepted only by the customer-managed runtime and uses
the same Entra, Queue, Table, Blob and ADF lifecycle as the workbook job.

Bundle `1.4.0` changes only the immutable Function and worker artefacts needed by
`copy.batch-reconciliation-gate`. The child receives a digest-pinned control
manifest and does not read either copied dataset. It uses the same resources and
customer-managed lifecycle; no new standing access or Hosted Jobs route is
introduced.

The CLI does not create or retain customer storage credentials. Operators remain
responsible for Azure subscription policy, provider registration, quota, budget,
regional availability, identity approval, monitoring, backup, and data retention.
