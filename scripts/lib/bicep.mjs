import { homedir } from "node:os";
import { join } from "node:path";

export const bicepPath = join(homedir(), ".azure", "bin", "bicep");
