import { readFileSync } from "node:fs";

interface PackageJson {
  version: string;
  engines: { node: string };
}

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as PackageJson;

/** This package's version. */
export const VERSION = pkg.version;

/** The oldest Node.js major version this package runs on, from `engines.node` (">=24"). */
export const MIN_NODE_MAJOR = Number(/^>=(\d+)/.exec(pkg.engines.node)?.[1] ?? 0);
