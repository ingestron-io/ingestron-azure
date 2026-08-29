#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { bicepPath } from "./lib/bicep.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
export const bundleVersions = Object.freeze([
  "1.1.0",
  "1.1.1",
  "1.2.0",
  "1.2.1",
  "1.3.0",
  "1.4.0",
  "1.5.0",
  "1.6.0",
]);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalJson(child)]),
    );
  }
  return value;
}

async function writeCanonicalJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(canonicalJson(value), null, 2)}\n`);
}

function sourceRevision() {
  if (process.env.INGESTRON_AZURE_SOURCE_REVISION) {
    return process.env.INGESTRON_AZURE_SOURCE_REVISION;
  }
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
}

export async function buildCustomerBundle(bundleVersion = "1.1.0") {
  if (!bundleVersions.includes(bundleVersion)) {
    throw new Error(`Unsupported customer bundle version: ${bundleVersion}.`);
  }
  const definitionPath = resolve(
    root,
    `bundles/profile-j/${bundleVersion}/bundle-definition.json`,
  );
  const outputDirectory = resolve(
    root,
    `build/customer-bundle/profile-j/${bundleVersion}`,
  );
  const definition = JSON.parse(await readFile(definitionPath, "utf8"));
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  const templateSources = {
    foundation: resolve(root, "infra/profile-j/foundation.bicep"),
    runtime: resolve(root, "infra/profile-j/main.bicep"),
  };
  const files = {};
  for (const [name, source] of Object.entries(templateSources)) {
    const fileName = definition.templates[name];
    const target = resolve(outputDirectory, fileName);
    execFileSync(
      bicepPath,
      ["build", source, "--outfile", target, "--no-restore"],
      { cwd: root, stdio: "inherit" },
    );
    const bytes = await readFile(target);
    files[fileName] = { sha256: sha256(bytes), size: bytes.byteLength };
  }

  const definitionTarget = resolve(outputDirectory, "bundle-definition.json");
  await cp(definitionPath, definitionTarget);
  const definitionBytes = await readFile(definitionTarget);
  files["bundle-definition.json"] = {
    sha256: sha256(definitionBytes),
    size: definitionBytes.byteLength,
  };
  const helperName = definition.applicationDeploymentHelper;
  const helperTarget = resolve(outputDirectory, helperName);
  await cp(resolve(root, "scripts/azure-one-deploy.mjs"), helperTarget);
  const helperBytes = await readFile(helperTarget);
  files[helperName] = {
    sha256: sha256(helperBytes),
    size: helperBytes.byteLength,
  };
  const runtimeLicenseName = definition.licensing.runtimeLicenseFile;
  const runtimeLicenseTarget = resolve(outputDirectory, runtimeLicenseName);
  await cp(resolve(root, runtimeLicenseName), runtimeLicenseTarget);
  const runtimeLicenseBytes = await readFile(runtimeLicenseTarget);
  files[runtimeLicenseName] = {
    sha256: sha256(runtimeLicenseBytes),
    size: runtimeLicenseBytes.byteLength,
  };

  const manifest = {
    ...definition,
    source: {
      repository: "ingestron-io/ingestron-azure",
      revision: sourceRevision(),
    },
    generatedAt: "1980-01-01T00:00:00.000Z",
    files,
  };
  await writeCanonicalJson(resolve(outputDirectory, "manifest.json"), manifest);
  return { manifest, outputDirectory };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const version of bundleVersions) {
    const result = await buildCustomerBundle(version);
    console.log(
      `Built ${result.manifest.contract} ${result.manifest.bundleVersion} at ${result.outputDirectory}.`,
    );
  }
}
