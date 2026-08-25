#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = path.join(root, "release");
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const archiveName = `ingestron-azure-${pkg.version}.zip`;
const archiveRoot = `ingestron-azure-${pkg.version}`;
const fixedDate = new Date("2000-01-01T00:00:00Z");

await rm(release, { recursive: true, force: true });
await mkdir(release, { recursive: true });
const zip = new JSZip();
const inputFiles = [
  "LICENSE",
  "LICENSE-RUNTIME-PREVIEW.md",
  "LICENSING.md",
  "COMPATIBILITY.md",
  ...(await filesUnder("build/customer-bundle")),
].sort();
for (const relative of inputFiles) {
  zip.file(
    `${archiveRoot}/${relative}`,
    await readFile(path.join(root, relative)),
    {
      createFolders: false,
      date: fixedDate,
      unixPermissions: 0o100644,
    },
  );
}
const archive = await zip.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
  compressionOptions: { level: 9 },
  platform: "UNIX",
});
const archiveDigest = sha256(archive);
await writeFile(path.join(release, archiveName), archive);

const manifests = await Promise.all(
  ["1.1.0", "1.1.1"].map(async (version) =>
    JSON.parse(
      await readFile(
        path.join(
          root,
          `build/customer-bundle/profile-j/${version}/manifest.json`,
        ),
        "utf8",
      ),
    ),
  ),
);
const runtime = manifests[0].applicationArtifacts;
const sbom = {
  spdxVersion: "SPDX-2.3",
  dataLicense: "CC0-1.0",
  SPDXID: "SPDXRef-DOCUMENT",
  name: `ingestron-azure-${pkg.version}`,
  documentNamespace: `https://ingestron.io/sbom/${archiveDigest}`,
  creationInfo: {
    created: "2000-01-01T00:00:00Z",
    creators: ["Tool: ingestron-azure-release-builder"],
  },
  packages: [
    {
      SPDXID: "SPDXRef-Azure",
      name: pkg.name,
      versionInfo: pkg.version,
      downloadLocation: "NOASSERTION",
      filesAnalyzed: false,
      licenseConcluded: "Apache-2.0",
      licenseDeclared: "Apache-2.0",
      copyrightText: "Copyright 2026 the Ingestron project owner",
      checksums: [{ algorithm: "SHA256", checksumValue: archiveDigest }],
    },
    {
      SPDXID: "SPDXRef-Functions",
      name: "Ingestron Profile J Functions",
      versionInfo: runtime.jobsFunctions.version,
      downloadLocation: runtime.jobsFunctions.downloadUrl,
      filesAnalyzed: false,
      licenseConcluded: runtime.jobsFunctions.license,
      licenseDeclared: runtime.jobsFunctions.license,
      copyrightText: "Copyright 2026 the Ingestron project owner",
      checksums: [
        { algorithm: "SHA256", checksumValue: runtime.jobsFunctions.sha256 },
      ],
    },
    {
      SPDXID: "SPDXRef-Worker",
      name: "Ingestron Profile J worker",
      versionInfo: "0.1.0-preview.1",
      downloadLocation: `${runtime.workerImage.registry}/${runtime.workerImage.repository}@sha256:${runtime.workerImage.sha256}`,
      filesAnalyzed: false,
      licenseConcluded: runtime.workerImage.license,
      licenseDeclared: runtime.workerImage.license,
      copyrightText: "Copyright 2026 the Ingestron project owner",
      checksums: [
        { algorithm: "SHA256", checksumValue: runtime.workerImage.sha256 },
      ],
    },
  ],
  relationships: [
    {
      spdxElementId: "SPDXRef-DOCUMENT",
      relationshipType: "DESCRIBES",
      relatedSpdxElement: "SPDXRef-Azure",
    },
    ...["SPDXRef-Functions", "SPDXRef-Worker"].map((relatedSpdxElement) => ({
      spdxElementId: "SPDXRef-Azure",
      relationshipType: "DEPENDS_ON",
      relatedSpdxElement,
    })),
  ],
  hasExtractedLicensingInfos: [
    {
      licenseId: "LicenseRef-Ingestron-Runtime-Preview-1.0",
      name: "Ingestron Runtime Preview Licence 1.0",
      extractedText: "See LICENSE-RUNTIME-PREVIEW.md in the release archive.",
    },
  ],
};
const sbomName = `ingestron-azure-${pkg.version}.spdx.json`;
const sbomBytes = Buffer.from(`${JSON.stringify(sbom, null, 2)}\n`);
await writeFile(path.join(release, sbomName), sbomBytes);
const provenance = {
  contract: "ingestron.azure-provenance/v1",
  package: pkg.name,
  version: pkg.version,
  archive: { name: archiveName, sha256: archiveDigest },
  sbom: { name: sbomName, sha256: sha256(sbomBytes) },
  bundles: manifests.map((manifest) => ({
    version: manifest.bundleVersion,
    source: manifest.source,
    runtime: manifest.applicationArtifacts,
    licensing: manifest.licensing,
  })),
};
const provenanceName = `ingestron-azure-${pkg.version}.provenance.json`;
const provenanceBytes = Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`);
await writeFile(path.join(release, provenanceName), provenanceBytes);
await writeFile(
  path.join(release, "SHA256SUMS"),
  [
    `${archiveDigest}  ${archiveName}`,
    `${sha256(sbomBytes)}  ${sbomName}`,
    `${sha256(provenanceBytes)}  ${provenanceName}`,
    "",
  ].join("\n"),
);
process.stdout.write(`Built ${archiveName} (${archiveDigest}).\n`);

async function filesUnder(relativeRoot) {
  const output = [];
  async function visit(relative) {
    const entries = await readdir(path.join(root, relative), {
      withFileTypes: true,
    });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) output.push(child);
    }
  }
  await visit(relativeRoot);
  return output;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
