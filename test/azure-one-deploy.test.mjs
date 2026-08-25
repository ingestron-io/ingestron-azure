import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  delegationExpiry,
  packageSha256,
  parseArguments,
  retryImmutableUpload,
} from "../scripts/azure-one-deploy.mjs";

const validArguments = [
  "--resource-group",
  "rg-test",
  "--function-app",
  "func-test",
  "--storage-account",
  "storage",
  "--container",
  "packages",
  "--package",
  "release.zip",
  "--sha256",
  "a".repeat(64),
  "--expected-function",
  "json-to-yaml",
  "--subscription-name",
  "Labs",
  "--execute",
  "azure-one-deploy",
];

test("requires an explicit execution phrase and complete live target", () => {
  const defaulted = parseArguments(validArguments);
  assert.equal(defaulted["function-app"], "func-test");
  assert.equal(defaulted.profile, "developer");
  assert.equal(defaulted["ingress-mode"], "disabled");
  assert.equal(defaulted.lifecycle, "developer");
  assert.equal(
    parseArguments(["--", ...validArguments])["function-app"],
    "func-test",
  );
  assert.throws(
    () =>
      parseArguments(
        validArguments.with(validArguments.indexOf("azure-one-deploy"), "yes"),
      ),
    /must be exactly azure-one-deploy/,
  );
  assert.throws(
    () => parseArguments(validArguments.slice(0, -2)),
    /Missing --execute/,
  );
});

test("accepts only the reviewed Profile J ingress combinations", () => {
  const profileJ = parseArguments([
    ...validArguments,
    "--profile",
    "profile-j",
    "--ingress-mode",
    "entra-public",
    "--expected-api-client-id",
    "11111111-1111-4111-8111-111111111111",
    "--expected-caller-client-id",
    "22222222-2222-4222-8222-222222222222",
  ]);
  assert.equal(profileJ.profile, "profile-j");
  assert.equal(profileJ["ingress-mode"], "entra-public");
  assert.equal(profileJ.lifecycle, "temporary-proof");
  const demo = parseArguments([
    ...validArguments,
    "--profile",
    "profile-j",
    "--lifecycle",
    "persistent-demo",
    "--ingress-mode",
    "entra-public",
    "--expected-api-client-id",
    "11111111-1111-4111-8111-111111111111",
    "--expected-caller-client-id",
    "22222222-2222-4222-8222-222222222222",
  ]);
  assert.equal(demo.lifecycle, "persistent-demo");
  assert.throws(
    () => parseArguments([...validArguments, "--ingress-mode", "entra-public"]),
    /Developer profile permits only disabled ingress/,
  );
  assert.throws(
    () => parseArguments([...validArguments, "--profile", "unknown"]),
    /developer or profile-j/,
  );
  assert.throws(
    () => parseArguments([...validArguments, "--profile", "profile-j"]),
    /expected-api-client-id/,
  );
  assert.throws(
    () =>
      parseArguments([
        ...validArguments,
        "--profile",
        "profile-j",
        "--lifecycle",
        "persistent-demo",
      ]),
    /conflict/,
  );
});

test("calculates the package digest before any Azure mutation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ingestron-one-deploy-"));
  const path = join(directory, "release.zip");
  await writeFile(path, "synthetic package");
  assert.equal(
    await packageSha256(path),
    "e0e038fa991956be71c217d9b46be3e6ff31febaf704d9f33d752597d3252e9b",
  );
});

test("limits the user-delegation package URL to 30 minutes", () => {
  assert.equal(
    delegationExpiry(new Date("2026-08-15T00:00:00Z")),
    "2026-08-15T00:30:00Z",
  );
});

test("retries immutable upload until Blob write permission propagates", async () => {
  let attempts = 0;
  let clock = 0;
  assert.equal(
    await retryImmutableUpload({
      expectedHash: "a".repeat(64),
      upload: async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("authorization pending");
      },
      readExisting: async () => undefined,
      now: () => clock,
      wait: async (milliseconds) => {
        clock += milliseconds;
      },
      timeoutMs: 30_000,
    }),
    "uploaded",
  );
  assert.equal(attempts, 3);
});

test("accepts a committed matching upload and rejects conflicting metadata", async () => {
  const expectedHash = "a".repeat(64);
  assert.equal(
    await retryImmutableUpload({
      expectedHash,
      upload: async () => {
        throw new Error("response unavailable");
      },
      readExisting: async () => ({
        metadata: { ingestron_sha256: expectedHash },
      }),
    }),
    "reused",
  );
  await assert.rejects(
    retryImmutableUpload({
      expectedHash,
      upload: async () => {
        throw new Error("conflict");
      },
      readExisting: async () => ({
        metadata: { ingestron_sha256: "b".repeat(64) },
      }),
    }),
    /conflicting metadata/,
  );
});

test("requires programme and monthly ceiling ownership tags", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile("scripts/azure-one-deploy.mjs", "utf8"),
  );
  assert.match(source, /ingestron:programme/);
  assert.match(source, /ingestron:monthly-cost-ceiling-usd/);
});
