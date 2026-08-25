# Security and data boundary

Customer-managed Profile J keeps workbook payloads, queue/table state, immutable
packages, logs, identities and Azure consumption in the customer's subscription.
It has no required Ingestron control-plane call, telemetry export, support access,
or hosted payload path.

The runtime accepts a minimal YAML recipe but resolves tenant, idempotency,
version, media type, physical storage references and content digests at the
trusted execution boundary. Queue messages contain identifiers and attempt data,
not credentials or workbook content. The worker rejects macros, external links,
credential-bearing URIs and bounded-workbook limit violations.

Profile J is a technical preview. Customers must independently review Azure
Policy, RBAC, networking, regional/data-residency requirements, logging,
retention, recovery, cost, dependency vulnerabilities, and incident response.
