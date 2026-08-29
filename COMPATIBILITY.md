# Compatibility

| Azure bundle | Minimum CLI       | Profile J runtime | Status                                       |
| ------------ | ----------------- | ----------------- | -------------------------------------------- |
| `1.1.0`      | `0.3.0-preview.1` | `0.1.0-preview.1` | Initial public preview                       |
| `1.1.1`      | `0.3.0-preview.1` | `0.1.0-preview.1` | Compatible rollback/upgrade proof candidate  |
| `1.2.0`      | `0.3.1-preview.1` | `0.1.0-preview.1` | Product-owned GitHub namespace               |
| `1.2.1`      | `0.3.2-preview.1` | `0.1.0-preview.1` | Public no-change upgrade/rollback candidate  |
| `1.3.0`      | `0.3.5-preview.1` | `0.2.0-preview.1` | Durable CSV/JSON landing-batch contract gate |
| `1.4.0`      | `0.3.6-preview.1` | `0.3.0-preview.1` | Durable post-Copy reconciliation gate        |
| `1.5.0`      | `0.3.7-preview.1` | `0.4.0-preview.1` | Durable schema baseline compatibility gate   |

Both bundles target Azure CLI with Bicep `0.46.1`, Node.js 22 Functions Flex
Consumption, Azure Container Apps Jobs, Basic ACR, Storage, Table, Queue, Blob,
managed identities, and Australia East-compatible resources. Region/provider
availability and price are customer preflight responsibilities.

Preview versions may change incompatibly. Upgrade and rollback require an exact
bundle version and digest; automatic upgrades are not supported.
