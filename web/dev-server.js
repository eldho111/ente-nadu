const fs = require("fs");
const path = require("path");

const scriptDir = __dirname;
const repoRoot = path.resolve(scriptDir, "..");
const webRoot = path.join(repoRoot, "web");
const webPackageJson = path.join(webRoot, "package.json");
const rootLayoutPath = path.join(webRoot, "app", "layout.tsx");
const currentWorkingDir = path.resolve(process.cwd());

if (currentWorkingDir !== repoRoot) {
  throw new Error(
    [
      "Civic Pulse web preview bootstrap failed.",
      `Current working directory: ${currentWorkingDir}`,
      `Expected repository root: ${repoRoot}`,
      "Run this command from repo root:",
      "  npm run preview:web",
    ].join("\n"),
  );
}

if (!fs.existsSync(webPackageJson) || !fs.existsSync(rootLayoutPath)) {
  throw new Error(
    [
      "Civic Pulse web preview bootstrap failed.",
      `Expected web root: ${webRoot}`,
      `Missing file check: ${webPackageJson} and/or ${rootLayoutPath}`,
      "Use this command from repo root:",
      "  npm run preview:web",
    ].join("\n"),
  );
}

process.chdir(webRoot);

if (!process.env.NEXT_DIST_DIR) {
  process.env.NEXT_DIST_DIR = ".next-dev";
}

// Ensure node is in PATH for any child processes Next.js spawns
const nodeDir = path.dirname(process.execPath);
process.env.PATH = nodeDir + ";" + (process.env.PATH || "");
process.env.NODE = process.execPath;

// Set argv so Next CLI thinks we ran "next dev"
process.argv = [process.execPath, "next", "dev"];

// Load the Next.js CLI directly
require(path.join(webRoot, "node_modules", "next", "dist", "bin", "next"));
