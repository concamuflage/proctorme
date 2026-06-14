// This file is responsible for 
// figuring out the absolute path to the root `.env` file 
// and loading its variables into `process.env` so they can be used in the server code.
// used mainly by
// Playwright test helpers through testEnv.ts
// lib/server/database/pool.js

// Load Node's built-in `path` module so we can safely build file paths.
const path = require("path");

// Load the `dotenv` package so this file can read variables from `.env`.
const dotenv = require("dotenv");

// Get the folder where the current Node command was started.
// Example: running `npm run dev` from the app root returns `/Users/Mark_1/proctorme/proctorme`.
// Example: running tests from `playwright-tests` returns `/Users/Mark_1/proctorme/proctorme/playwright-tests`.
const cwd = process.cwd();

// List workspace folders that live one level below the real project root.
const childWorkspaces = new Set(["playwright-tests"]);

// `path.basename(cwd)` gets only the last folder name from the current folder.
// Example: `/Users/Mark_1/proctorme/proctorme/playwright-tests` becomes `playwright-tests`.
// `childWorkspaces.has(...)` checks whether that last folder is one of our child workspaces.
// If yes, `path.resolve(cwd, "..")` moves one folder up to the real project root.
// Example: `path.resolve("/Users/Mark_1/proctorme/proctorme/playwright-tests", "..")`
// becomes `/Users/Mark_1/proctorme/proctorme`.
// If no, the command already started from the project root, so use `cwd` as-is.
const projectRoot = childWorkspaces.has(path.basename(cwd)) ? path.resolve(cwd, "..") : cwd;

// Build the absolute path to the root `.env` file.
const rootEnvPath = path.resolve(projectRoot, ".env");

// Read the root `.env` file and copy its variables into `process.env`.
dotenv.config({ path: rootEnvPath, quiet: true });
