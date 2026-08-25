# Ingestron Azure engineering instructions

This public repository owns the Apache-2.0 customer-managed Azure Bicep and
digest-pinned Profile J deployment bundle authorised by PB-041/PD-066 in the
Ingestron programme repository.

Keep Azure resource semantics here. The Ingestron CLI may verify and orchestrate
the bundle but must not recreate these resources imperatively. Runtime object
code is separately distributed under `LICENSE-RUNTIME-PREVIEW.md`; Apache-2.0
does not apply to that runtime.

Do not add private proof evidence, tenant/subscription identifiers, deployment
outputs, customer data, credentials, hosted-service source, or production/SLA
claims. Examples must use obvious placeholders or synthetic names. Public
contributions are reviewed but not accepted until the contribution policy is
explicitly changed.

Use Node.js 22 and pnpm. Run `pnpm validate`. Work on `codex/` or other
backlog-scoped branches and submit a pull request.
