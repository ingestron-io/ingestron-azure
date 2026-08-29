import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
  buildCustomerBundle,
  canonicalJson,
  sha256,
} from "../scripts/build-customer-bundle.mjs";

test("builds a digest-pinned Profile J bundle from authoritative Bicep", async () => {
  const { manifest, outputDirectory } = await buildCustomerBundle();
  assert.equal(manifest.contract, "ingestron.azure-bundle/v1");
  assert.equal(manifest.bundleVersion, "1.1.0");
  assert.equal(manifest.profile, "profile-j");
  assert.equal(manifest.changePolicy.deletionAllowed, false);
  assert.equal(manifest.parameters.secretsForbidden, true);
  assert.equal(manifest.applicationDeploymentHelper, "azure-one-deploy.mjs");
  assert.equal(
    manifest.applicationArtifacts.workerImage.sha256,
    "0e539a4bbf8d74b83e8b2e479c8e192376c5ebca66cb1cf2cc11b174004e7107",
  );
  assert.equal(manifest.licensing.source, "Apache-2.0");
  assert.equal(
    manifest.licensing.runtime,
    "LicenseRef-Ingestron-Runtime-Preview-1.0",
  );
  assert.equal(
    manifest.applicationArtifacts.jobsFunctions.sha256,
    "cd28333435a4fa68e528bf49334e3f2499d46ca615b0af395c4b9f6a6d73a340",
  );
  assert.match(
    manifest.applicationArtifacts.jobsFunctions.downloadUrl,
    /^https:\/\/github\.com\/(?:intentlabs-dev|ingestron-io)\/ingestron-azure\/releases\/download\//,
  );
  assert.deepEqual(manifest.outputs, [
    "endpoint",
    "audience",
    "tenantId",
    "storageAccount",
    "sourceContainer",
    "packageContainer",
  ]);

  for (const [fileName, expected] of Object.entries(manifest.files)) {
    const bytes = await readFile(join(outputDirectory, fileName));
    assert.equal(sha256(bytes), expected.sha256);
    assert.equal(bytes.byteLength, expected.size);
  }

  const runtime = JSON.parse(
    await readFile(join(outputDirectory, manifest.templates.runtime), "utf8"),
  );
  assert.ok(runtime.outputs.integration);
  assert.match(JSON.stringify(runtime.outputs.integration), /api:\/\//);
});

test("canonical JSON sorts object keys without reordering arrays", () => {
  assert.deepEqual(canonicalJson({ z: 1, a: { y: 2, b: 3 }, list: [2, 1] }), {
    a: { b: 3, y: 2 },
    list: [2, 1],
    z: 1,
  });
});

test("builds an explicit compatible no-op lifecycle candidate", async () => {
  const { manifest } = await buildCustomerBundle("1.1.1");
  assert.equal(manifest.bundleVersion, "1.1.1");
  assert.equal(manifest.rollback.requiresCompatibleBundle, true);
  assert.equal(
    manifest.applicationArtifacts.jobsFunctions.sha256,
    "cd28333435a4fa68e528bf49334e3f2499d46ca615b0af395c4b9f6a6d73a340",
  );
});

test("builds the product-owned namespace bundle without changing runtime code", async () => {
  const { manifest } = await buildCustomerBundle("1.2.0");
  assert.equal(manifest.bundleVersion, "1.2.0");
  assert.equal(manifest.minimumCliVersion, "0.3.1-preview.1");
  assert.equal(
    manifest.applicationArtifacts.workerImage.registry,
    "ghcr.io/ingestron-io",
  );
  assert.equal(
    manifest.applicationArtifacts.workerImage.sha256,
    "896991d8f565c8dda1224361a17e89ad405d0f49dee4e961eaa262e5d4db74e7",
  );
  assert.match(
    manifest.applicationArtifacts.jobsFunctions.downloadUrl,
    /^https:\/\/github\.com\/ingestron-io\/ingestron-azure\/releases\/download\//,
  );
});

test("builds a product-owned no-change upgrade and rollback candidate", async () => {
  const baseline = await buildCustomerBundle("1.2.0");
  const candidate = await buildCustomerBundle("1.2.1");
  assert.equal(candidate.manifest.bundleVersion, "1.2.1");
  assert.equal(candidate.manifest.minimumCliVersion, "0.3.2-preview.1");
  assert.deepEqual(candidate.manifest.templates, baseline.manifest.templates);
  assert.deepEqual(
    candidate.manifest.applicationArtifacts,
    baseline.manifest.applicationArtifacts,
  );
  for (const fileName of [
    "profile-j-foundation.json",
    "profile-j-runtime.json",
    "azure-one-deploy.mjs",
    "LICENSE-RUNTIME-PREVIEW.md",
  ]) {
    assert.deepEqual(
      candidate.manifest.files[fileName],
      baseline.manifest.files[fileName],
    );
  }
});

test("builds the landing-batch runtime bundle with immutable preview artefacts", async () => {
  const candidate = await buildCustomerBundle("1.3.0");
  assert.equal(candidate.manifest.bundleVersion, "1.3.0");
  assert.equal(candidate.manifest.minimumCliVersion, "0.3.5-preview.1");
  assert.equal(
    candidate.manifest.applicationArtifacts.jobsFunctions.version,
    "0.2.0-preview.1",
  );
  assert.equal(
    candidate.manifest.applicationArtifacts.jobsFunctions.sha256,
    "60cfc9426ec5ae8b38acf731d826481c059313439204808a1265717ed7d81f8a",
  );
  assert.match(
    candidate.manifest.applicationArtifacts.jobsFunctions.downloadUrl,
    /v0\.4\.3-preview\.1/,
  );
  assert.equal(
    candidate.manifest.applicationArtifacts.workerImage.sha256,
    "faf796416d76328b3e1a382fd4c1c236bbad524b8d52ad714581af0cafdf2532",
  );
});

test("builds the copy-reconciliation runtime bundle without new resources", async () => {
  const baseline = await buildCustomerBundle("1.3.0");
  const candidate = await buildCustomerBundle("1.4.0");
  assert.equal(candidate.manifest.bundleVersion, "1.4.0");
  assert.equal(candidate.manifest.minimumCliVersion, "0.3.6-preview.1");
  assert.equal(
    candidate.manifest.applicationArtifacts.jobsFunctions.version,
    "0.3.0-preview.1",
  );
  assert.equal(
    candidate.manifest.applicationArtifacts.jobsFunctions.sha256,
    "8db305318e8215ab1c2240b83992fae49a430b38b992e7bd592229ead7b81bd5",
  );
  assert.match(
    candidate.manifest.applicationArtifacts.jobsFunctions.downloadUrl,
    /v0\.4\.4-preview\.1/,
  );
  assert.deepEqual(candidate.manifest.templates, baseline.manifest.templates);
  assert.deepEqual(candidate.manifest.parameters, baseline.manifest.parameters);
  assert.deepEqual(candidate.manifest.outputs, baseline.manifest.outputs);
});
