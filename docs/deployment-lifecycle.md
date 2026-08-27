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

The CLI does not create or retain customer storage credentials. Operators remain
responsible for Azure subscription policy, provider registration, quota, budget,
regional availability, identity approval, monitoring, backup, and data retention.
