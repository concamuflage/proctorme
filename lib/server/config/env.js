const path = require("path");
const dotenv = require("dotenv");

const cwd = process.cwd();
const childWorkspaces = new Set(["backend", "playwright-tests"]);
const projectRoot = childWorkspaces.has(path.basename(cwd)) ? path.resolve(cwd, "..") : cwd;
const rootEnvPath = path.resolve(projectRoot, ".env");

dotenv.config({ path: rootEnvPath, quiet: true });
