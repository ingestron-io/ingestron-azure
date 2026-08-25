# Security policy

Privately report suspected vulnerabilities to `security@ingestron.io`. Do not
include customer data, credentials, access tokens, SAS URLs, tenant identifiers,
or production logs. There is no response-time or remediation SLA for this
technical preview.

The public Bicep disables storage shared-key access and anonymous Blob access,
uses managed identities and scoped roles, constrains worker scale, and supports a
private-network ingress mode. The optional Entra-public mode must be restricted
to an exact audience and calling-application allow-list.

The CLI verifies release and runtime digests, exact Azure context, ARM what-if
changes, ownership tags, and uninstall locks. These controls reduce risk but do
not replace the customer's Azure Policy, network, identity, monitoring, backup,
security review, or incident response.

Supported security fixes, coordinated disclosure, production suitability, and
security assurance remain uncommitted preview limitations.
