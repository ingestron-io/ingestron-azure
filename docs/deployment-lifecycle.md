# Deployment lifecycle

Use the Ingestron CLI for the supported preview workflow:

```text
ingestron azure init
ingestron azure plan
ingestron azure install
ingestron azure create
ingestron azure status
ingestron azure verify
ingestron azure pause --scope cost-bearing
ingestron azure resume --scope cost-bearing
ingestron azure upgrade
ingestron azure rollback
ingestron azure adf-config
ingestron azure plan-uninstall
ingestron azure uninstall
ingestron azure drop
```

`create` and `drop` are lifecycle names for the existing exact `install` and
`uninstall` boundaries. They always act on the complete Bicep-owned resource
group and retain the same plan, ownership-lock and explicit-confirmation gates.
Partial deletion is deliberately unsupported because it can remove retained
data or leave a deployment that Bicep can no longer reconcile safely.

Bundle `1.8.0` adds a versioned lifecycle policy for `pause` and `resume`.
The default `cost-bearing` scope stops only declared consumption-compute entry
points. `all` means every target that the bundle explicitly declares pausable;
it does not delete storage, registry, network or monitoring resources. Azure can
therefore continue to charge retention or usage costs while a deployment is
paused. Use `drop` after reviewing `plan-uninstall` when the complete owned
installation is no longer required.

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

Bundle `1.5.0` changes only the immutable Function and worker artefacts needed by
`schema.baseline-compatibility-gate`. The child reads one digest-pinned control
manifest and publishes compatibility decisions plus bounded change codes and
paths. It uses the same resources and customer-managed lifecycle; no schema
registry, new standing access or Hosted Jobs route is introduced.

Bundle `1.6.0` changes only the immutable Function and worker artefacts needed by
`dataset.quality-policy-gate`. The child reads one digest-pinned bounded JSON
control sample, applies explicit Core-compatible rules and publishes value-free
decision evidence. It uses the same resources and customer-managed lifecycle;
no automatic sampling, new standing access or Hosted Jobs route is introduced.

Bundle `1.7.0` likewise changes only the immutable Function and worker artefacts
needed by `dataset.reference-integrity-gate`. The child reads one digest-pinned
YAML/JSON key-control manifest, not either referenced dataset. Templates,
parameters, outputs and owned Azure resources are unchanged from `1.6.0`.

The CLI does not create or retain customer storage credentials. Operators remain
responsible for Azure subscription policy, provider registration, quota, budget,
regional availability, identity approval, monitoring, backup, and data retention.
