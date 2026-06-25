#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  SCRIPTS_DIR,
  TMP_DIR,
  cloneRepo,
  detectLicense,
  dirSizeBytes,
  findIndexHtml,
  getImportedEmbedIds,
  hasBackendDependencies,
  hasBuildScript,
  hasFragileBuild,
  isAllowedLicense,
  parseArgs,
  parseRepoUrl,
  readJson,
  rmDir,
  slugify,
  titleCase,
  writeJson,
} from "./lib/game-utils.mjs";

const SOURCES_PATH = path.join(SCRIPTS_DIR, "sources.json");
const CANDIDATES_PATH = path.join(SCRIPTS_DIR, "candidates.json");
const APPROVED_PATH = path.join(SCRIPTS_DIR, "approved.json");

function printHelp() {
  console.log(`
Discover browser games from configured sources.

Usage:
  node scripts/discover-games.mjs [--limit 200] [--smoke]

Options:
  --limit N    Stop after collecting N new candidates
  --smoke      Also write passing candidates to scripts/approved.json
  --help       Show this help message
`);
}

function evaluateCandidate({
  id,
  title,
  repoUrl,
  subpath = "",
  rootDir,
  defaultLicense = null,
}) {
  const reasons = [];
  const gameRoot = subpath ? path.join(rootDir, subpath) : rootDir;

  if (!fs.existsSync(gameRoot)) {
    return { accepted: false, reasons: ["missing game directory"] };
  }

  const indexHtml = findIndexHtml(gameRoot);
  const buildRequired = hasBuildScript(gameRoot);

  if (!indexHtml && !buildRequired) {
    reasons.push("missing index.html");
  }

  const license =
    detectLicense(gameRoot) ??
    detectLicense(rootDir) ??
    defaultLicense ??
    null;

  if (!isAllowedLicense(license)) {
    reasons.push(`license not allowed (${license ?? "none"})`);
  }

  const sizeBytes = dirSizeBytes(gameRoot);
  const maxSizeBytes = readJson(SOURCES_PATH).maxSizeBytes ?? 5 * 1024 * 1024;
  if (sizeBytes > maxSizeBytes) {
    reasons.push(`size too large (${Math.round(sizeBytes / 1024)} KB)`);
  }

  if (hasBackendDependencies(gameRoot)) {
    reasons.push("backend dependency detected");
  }

  if (hasFragileBuild(gameRoot)) {
    reasons.push("fragile build toolchain");
  }

  const files = fs.existsSync(gameRoot)
    ? fs.readdirSync(gameRoot, { withFileTypes: true })
    : [];
  if (files.length === 0) {
    reasons.push("empty directory");
  }

  return {
    accepted: reasons.length === 0,
    reasons,
    candidate: {
      id,
      title,
      repoUrl,
      subpath,
      license,
      indexPath: indexHtml
        ? path.relative(rootDir, indexHtml).replace(/\\/g, "/")
        : null,
      sizeBytes,
      buildRequired,
      discoveredAt: new Date().toISOString(),
    },
  };
}

function addCandidate(results, candidate, skipIds) {
  if (skipIds.has(candidate.id)) {
    return false;
  }

  if (results.some((entry) => entry.id === candidate.id)) {
    return false;
  }

  results.push(candidate);
  return true;
}

function discoverFromNestedSubdirs(source, repoDir, limit, results, skipIds) {
  const rootSubpath = source.rootSubpath ?? "";
  const rootDir = rootSubpath ? path.join(repoDir, rootSubpath) : repoDir;

  if (!fs.existsSync(rootDir)) {
    console.log(`✗ missing root subpath: ${rootSubpath}`);
    return;
  }

  const categories = source.categories
    ? source.categories
    : fs
        .readdirSync(rootDir, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isDirectory() &&
            !entry.name.startsWith(".") &&
            entry.name !== "node_modules"
        )
        .map((entry) => entry.name)
        .sort();

  for (const category of categories) {
    const categoryDir = path.join(rootDir, category);
    if (!fs.existsSync(categoryDir)) continue;

    const games = fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          entry.name !== "node_modules"
      )
      .map((entry) => entry.name)
      .sort();

    for (const gameName of games) {
      if (limit && results.length >= limit) return;

      const subpath = rootSubpath
        ? `${rootSubpath}/${category}/${gameName}`.replace(/\\/g, "/")
        : `${category}/${gameName}`.replace(/\\/g, "/");

      const id = slugify(`${category}-${gameName}`);
      if (!id) continue;

      const evaluation = evaluateCandidate({
        id,
        title: titleCase(gameName),
        repoUrl: source.repo,
        subpath,
        rootDir: repoDir,
        defaultLicense:
          source.defaultLicense ?? detectLicense(repoDir) ?? null,
      });

      if (evaluation.accepted) {
        if (addCandidate(results, evaluation.candidate, skipIds)) {
          console.log(`✓ ${evaluation.candidate.title}`);
        }
      } else {
        console.log(
          `✗ ${category}/${gameName}: ${evaluation.reasons.join(", ")}`
        );
      }
    }
  }
}

function discoverFromSubdirs(source, repoDir, limit, results, skipIds) {
  const scanDir = source.rootSubpath
    ? path.join(repoDir, source.rootSubpath)
    : repoDir;

  if (!fs.existsSync(scanDir)) {
    console.log(`✗ missing scan directory: ${source.rootSubpath ?? repoDir}`);
    return;
  }

  const entries = fs
    .readdirSync(scanDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules"
    )
    .map((entry) => entry.name)
    .sort();

  for (const entryName of entries) {
    if (limit && results.length >= limit) break;

    const id = slugify(entryName);
    if (!id) continue;

    const subpath = source.rootSubpath
      ? `${source.rootSubpath}/${entryName}`.replace(/\\/g, "/")
      : entryName;

    const evaluation = evaluateCandidate({
      id,
      title: titleCase(entryName),
      repoUrl: source.repo,
      subpath,
      rootDir: repoDir,
      defaultLicense: source.defaultLicense ?? detectLicense(repoDir) ?? null,
    });

    if (evaluation.accepted) {
      if (addCandidate(results, evaluation.candidate, skipIds)) {
        console.log(`✓ ${evaluation.candidate.title}`);
      }
    } else {
      console.log(`✗ ${entryName}: ${evaluation.reasons.join(", ")}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const config = readJson(SOURCES_PATH);
  if (!config) {
    throw new Error(`Missing sources config at ${SOURCES_PATH}`);
  }

  const skipIds = getImportedEmbedIds();
  console.log(`Skipping ${skipIds.size} already-imported embed games.`);

  rmDir(path.join(TMP_DIR, "discover"));
  const results = [];

  for (const source of config.sources) {
    if (args.limit && results.length >= args.limit) break;

    if (source.type === "github-nested-subdirs") {
      const { owner, name } = parseRepoUrl(source.repo);
      const repoDir = path.join(TMP_DIR, "discover", `${owner}-${name}`);
      console.log(`\nScanning nested game folders in ${source.repo}...`);
      cloneRepo(source.repo, repoDir);
      discoverFromNestedSubdirs(source, repoDir, args.limit, results, skipIds);
    }

    if (source.type === "github-subdirs") {
      const { owner, name } = parseRepoUrl(source.repo);
      const repoDir = path.join(TMP_DIR, "discover", `${owner}-${name}`);
      console.log(`\nScanning subdirectories in ${source.repo}...`);
      cloneRepo(source.repo, repoDir);
      discoverFromSubdirs(source, repoDir, args.limit, results, skipIds);
    }
  }

  writeJson(CANDIDATES_PATH, results);
  console.log(`\nSaved ${results.length} new candidates to ${CANDIDATES_PATH}`);

  if (args.smoke) {
    writeJson(APPROVED_PATH, results);
    console.log(`Saved ${results.length} approved entries to ${APPROVED_PATH}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
