import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("public repository has an explicit source/runtime licence split", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.license, "Apache-2.0");
  assert.equal(
    pkg.private,
    true,
    "npm publication remains intentionally disabled",
  );
  assert.match(await readFile("LICENSE", "utf8"), /Apache License/);
  assert.match(
    await readFile("LICENSE-RUNTIME-PREVIEW.md", "utf8"),
    /Runtime Preview Licence 1\.0/,
  );
  assert.equal(pkg.dependencies, undefined);
});

test("public tree excludes private proof and vendored runtime source", async () => {
  const root = await readdir(".");
  for (const forbidden of ["evidence", "proof", "vendor"])
    assert.ok(!root.includes(forbidden), forbidden);
  const tracked = JSON.stringify(root);
  assert.doesNotMatch(tracked, /private-archive/);
});

test("release workflow fetches the exact current runtime family", async () => {
  const release = await readFile(".github/workflows/release.yml", "utf8");
  assert.match(release, /ingestron-jobs-0\.4\.0-preview\.1-/);
  assert.doesNotMatch(release, /ingestron-jobs-0\.3\.0-preview\.1-/);
});
