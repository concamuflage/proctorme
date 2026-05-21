const path = require("path");
const dotenv = require("dotenv");

const cwd = process.cwd();
const projectRoot = path.basename(cwd) === "backend" ? path.resolve(cwd, "..") : cwd;
const rootEnvPath = path.resolve(projectRoot, ".env");

dotenv.config({ path: rootEnvPath, quiet: true });
