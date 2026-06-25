#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  COVERS_DIR,
  EMBED_DIR,
  ROOT,
  SCRIPTS_DIR,
  TMP_DIR,
  cloneRepo,
  copyCoverImage,
  copyDirectory,
  ensureDir,
  findIndexHtml,
  getImportedEmbedIds,
  loadCatalog,
  parseArgs,
  parseRepoUrl,
  readJson,
  rewriteEmbeddedPaths,
  rmDir,
  run,
  saveCatalog,
  upsertEmbedGame,
  writeJson,
} from "./lib/game-utils.mjs";

const DEFAULT_INPUT = path.join(SCRIPTS_DIR, "approved.json");

function printHelp() {
  console.log(`
Import approved browser games into public/embed and update games.json.

Usage:
  node scripts/import-games.mjs --from scripts/approved.json [--limit 50]

Options:
  --from PATH  Input JSON file (default: scripts/approved.json)
  --limit N    Import at most N games
  --help       Show this help message
`);
}

function resolveStaticRoot(repoDir, candidate) {
  const candidateRoot = candidate.subpath
    ? path.join(repoDir, candidate.subpath)
    : repoDir;

  const directIndex = path.join(candidateRoot, "index.html");
  if (fs.existsSync(directIndex)) return candidateRoot;

  const buildIndex = path.join(candidateRoot, "build", "index.html");
  if (fs.existsSync(buildIndex)) return path.join(candidateRoot, "build");

  const distIndex = path.join(candidateRoot, "dist", "index.html");
  if (fs.existsSync(distIndex)) return path.join(candidateRoot, "dist");

  return null;
}

function tryBuild(candidateRoot) {
  const packageJsonPath = path.join(candidateRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) return null;

  const slug = path.basename(candidateRoot);
  console.log(`  building ${slug}...`);

  try {
    run("npm install --no-audit --no-fund", { cwd: candidateRoot, silent: false });
    run("npm run build", { cwd: candidateRoot, silent: false });
  } catch {
    return null;
  }

  return resolveStaticRoot(candidateRoot, { subpath: "" });
}

function importCandidate(candidate, repoDir) {
  const slug = candidate.id;
  const candidateRoot = candidate.subpath
    ? path.join(repoDir, candidate.subpath)
    : repoDir;

  let staticRoot = resolveStaticRoot(repoDir, candidate);

  if (!staticRoot && fs.existsSync(path.join(candidateRoot, "package.json"))) {
    staticRoot = tryBuild(candidateRoot);
  }

  if (!staticRoot && candidate.buildRequired) {
    staticRoot = tryBuild(candidateRoot);
  }

  if (!staticRoot) {
    throw new Error("no static index.html found");
  }

  const targetDir = path.join(EMBED_DIR, slug);
  rmDir(targetDir);
  copyDirectory(staticRoot, targetDir);
  rewriteEmbeddedPaths(targetDir, slug);

  if (!findIndexHtml(targetDir)) {
    throw new Error("index.html missing after import");
  }

  const image = copyCoverImage(staticRoot, slug);
  const entry = {
    id: slug,
    title: candidate.title,
    image,
    playCount: "0",
    playable: true,
    path: `/play/${slug}`,
    embedPath: `/embed/${slug}/index.html`,
    source: candidate.repoUrl,
    license: candidate.license ?? "Unknown",
  };

  upsertEmbedGame(entry);
  return entry;
}

function groupByRepo(candidates) {
  const groups = new Map();

  for (const candidate of candidates) {
    const key = candidate.repoUrl;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
  }

  return groups;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const inputPath = path.resolve(ROOT, args.from ?? DEFAULT_INPUT);
  const candidates = readJson(inputPath, []);

  if (!Array.isArray(candidates) || candidates.length === 0) {
    console.log(`No candidates found in ${inputPath}`);
    console.log("Run: node scripts/discover-games.mjs --smoke");
    return;
  }

  const importedIds = getImportedEmbedIds();
  const limitedCandidates = args.limit
    ? candidates.filter((c) => !importedIds.has(c.id)).slice(0, args.limit)
    : candidates.filter((c) => !importedIds.has(c.id));

  if (limitedCandidates.length === 0) {
    console.log("No new games to import — all candidates already in catalog.");
    return;
  }

  console.log(`Importing ${limitedCandidates.length} new games (${importedIds.size} already in catalog).`);

  ensureDir(TMP_DIR);
  ensureDir(EMBED_DIR);
  ensureDir(COVERS_DIR);

  const grouped = groupByRepo(limitedCandidates);
  const imported = [];
  const failed = [];

  for (const [repoUrl, repoCandidates] of grouped.entries()) {
    const { owner, name } = parseRepoUrl(repoUrl);
    const repoDir = path.join(TMP_DIR, "import", `${owner}-${name}`);

    console.log(`\nCloning ${repoUrl}...`);
    try {
      cloneRepo(repoUrl, repoDir);
    } catch (error) {
      for (const candidate of repoCandidates) {
        failed.push({ id: candidate.id, error: `clone failed: ${error.message}` });
        console.log(`✗ ${candidate.id}: clone failed`);
      }
      continue;
    }

    for (const candidate of repoCandidates) {
      try {
        const entry = importCandidate(candidate, repoDir);
        imported.push(entry);
        console.log(`✓ imported ${entry.title} → ${entry.embedPath}`);
      } catch (error) {
        failed.push({ id: candidate.id, error: error.message });
        console.log(`✗ ${candidate.id}: ${error.message}`);
      }
    }
  }

  writeJson(path.join(SCRIPTS_DIR, "import-report.json"), {
    importedAt: new Date().toISOString(),
    imported: imported.map((game) => game.id),
    failed,
  });

  console.log(`\nImported ${imported.length} games. Failed: ${failed.length}.`);
  if (failed.length > 0) {
    console.log("See scripts/import-report.json for details.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
