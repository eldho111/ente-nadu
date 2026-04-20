import { execFileSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const nextBin = join(__dirname, "node_modules", "next", "dist", "bin", "next");
await import(nextBin);
