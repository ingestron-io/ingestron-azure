# Authentication and private access

Profile J supports two ingress modes:

- `disabled` is the customer-private target. Public network access is disabled;
  the customer supplies the approved private networking and runner path.
- `entra-public` permits public routing only behind App Service authentication,
  one exact audience, and one exact calling-application allow-list. It is useful
  for bounded ADF integration when a private runner is unavailable.

Both modes use managed identities for Azure services. Storage shared keys and
anonymous Blob access are disabled. The Function deployment helper requests a
short-lived Azure identity token through the operator's existing Azure CLI
session; no password, connection string, token, or SAS is written to CLI config
or lock files.

Treat every tenant, subscription, application, principal and network choice as a
customer security decision. The preview does not make either ingress mode
appropriate for a particular production or regulated workload.
