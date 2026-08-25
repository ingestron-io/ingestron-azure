import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";

const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ["Azure storage key", /AccountKey=[A-Za-z0-9+/=]{40,}/],
  ["JWT", /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/],
];

const files = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const failures = [];

for (const file of files) {
  let metadata;
  try {
    metadata = await stat(file);
  } catch (error) {
    if (error?.code === "ENOENT") continue;
    throw error;
  }
  if (metadata.size > 1024 * 1024) continue;
  const contents = await readFile(file, "utf8");
  if (contents.includes("\0")) continue;
  for (const [label, pattern] of patterns) {
    if (pattern.test(contents)) failures.push(`possible ${label} in ${file}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("No recognised secrets found in version-controlled source files.");
