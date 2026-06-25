import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
export const SCRIPTS_DIR = path.join(ROOT, "scripts");
export const PUBLIC_DIR = path.join(ROOT, "public");
export const EMBED_DIR = path.join(PUBLIC_DIR, "embed");
export const COVERS_DIR = path.join(PUBLIC_DIR, "games", "covers");
export const GAMES_JSON = path.join(ROOT, "src", "data", "games.json");
export const TMP_DIR = path.join(ROOT, ".tmp", "game-imports");

export const ALLOWED_LICENSES = [
  "mit",
  "apache",
  "bsd",
  "isc",
  "unlicense",
  "cc0",
  "wtfpl",
];

export const BACKEND_PATTERNS = [
  /require\s*\(\s*['"]express['"]/i,
  /from\s+['"]express['"]/i,
  /require\s*\(\s*['"]socket\.io['"]/i,
  /from\s+['"]socket\.io['"]/i,
  /\bfetch\s*\(\s*['"]https?:\/\//i,
  /mongoose|mongodb|postgres|mysql/i,
];

export function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function parseArgs(argv) {
  const args = { from: null, limit: null, smoke: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--from") args.from = argv[++i];
    else if (arg === "--limit") args.limit = Number(argv[++i]);
    else if (arg === "--smoke") args.smoke = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function titleCase(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function run(command, options = {}) {
  execSync(command, {
    stdio: options.silent ? "pipe" : "inherit",
    cwd: options.cwd ?? ROOT,
    encoding: "utf8",
  });
}

export function runCapture(command, options = {}) {
  return execSync(command, {
    stdio: "pipe",
    cwd: options.cwd ?? ROOT,
    encoding: "utf8",
  }).trim();
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function rmDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

export function dirSizeBytes(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;

  let total = 0;
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else {
        try {
          total += fs.statSync(fullPath).size;
        } catch {
          // Skip broken symlinks or removed files during shallow clones.
        }
      }
    }
  }

  return total;
}

export function listFilesRecursive(dirPath, maxFiles = 5000) {
  const files = [];
  if (!fs.existsSync(dirPath)) return files;

  const stack = [dirPath];
  while (stack.length > 0 && files.length < maxFiles) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else files.push(fullPath);
    }
  }

  return files;
}

export function findIndexHtml(rootDir) {
  const direct = path.join(rootDir, "index.html");
  if (fs.existsSync(direct)) return direct;

  const buildIndex = path.join(rootDir, "build", "index.html");
  if (fs.existsSync(buildIndex)) return buildIndex;

  const distIndex = path.join(rootDir, "dist", "index.html");
  if (fs.existsSync(distIndex)) return distIndex;

  return null;
}

export function detectLicense(rootDir) {
  const candidates = [
    "LICENSE",
    "LICENSE.md",
    "LICENSE.txt",
    "License",
    "COPYING",
  ];

  for (const name of candidates) {
    const licensePath = path.join(rootDir, name);
    if (!fs.existsSync(licensePath)) continue;
    const content = fs.readFileSync(licensePath, "utf8").toLowerCase();
    if (content.includes("mit")) return "MIT";
    if (content.includes("apache")) return "Apache-2.0";
    if (content.includes("bsd")) return "BSD";
    if (content.includes("isc")) return "ISC";
    if (content.includes("unlicense") || content.includes("cc0")) {
      return "Unlicense";
    }
    return "Unknown";
  }

  return null;
}

export function isAllowedLicense(license) {
  if (!license) return false;
  const normalized = license.toLowerCase();
  return ALLOWED_LICENSES.some((allowed) => normalized.includes(allowed));
}

export function hasBackendDependencies(rootDir) {
  const files = listFilesRecursive(rootDir).filter((file) =>
    /\.(js|ts|jsx|tsx|json)$/i.test(file)
  );

  for (const file of files.slice(0, 200)) {
    const content = fs.readFileSync(file, "utf8");
    if (BACKEND_PATTERNS.some((pattern) => pattern.test(content))) {
      return true;
    }
  }

  return false;
}

export function hasFragileBuild(rootDir) {
  const packageJsonPath = path.join(rootDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) return false;

  const pkg = readJson(packageJsonPath);
  const deps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };

  return Boolean(deps["node-sass"] || deps["react-scripts"] === "4.0.0");
}

export function parseRepoUrl(repoUrl) {
  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/i);
  if (!match) {
    throw new Error(`Unsupported repo URL: ${repoUrl}`);
  }

  return { owner: match[1], name: match[2] };
}

export function cloneRepo(repoUrl, targetDir) {
  ensureDir(path.dirname(targetDir));
  rmDir(targetDir);
  run(
    `git -c core.hooksPath=/dev/null clone --depth 1 "${repoUrl}" "${targetDir}"`,
    { silent: true }
  );
}

export function copyDirectory(sourceDir, targetDir) {
  ensureDir(targetDir);
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if ([".git", "node_modules", ".github"].includes(entry.name)) continue;

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) copyDirectory(sourcePath, targetPath);
    else fs.copyFileSync(sourcePath, targetPath);
  }
}

export function rewriteEmbeddedPaths(targetDir, slug) {
  const basePath = `/embed/${slug}/`;
  const files = listFilesRecursive(targetDir).filter((file) =>
    /\.(html?|js|css|json)$/i.test(file)
  );

  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    let updated = content;

    updated = updated.replace(
      /(["'=])\/react-[^/"']+\//g,
      `$1${basePath}`
    );
    updated = updated.replace(/(["'=])\/[^/"']+\/(static|assets)\//g, `$1${basePath}$2/`);

    if (updated !== content) {
      fs.writeFileSync(file, updated);
    }
  }
}

export function findCoverImage(sourceDir) {
  const imageFiles = listFilesRecursive(sourceDir)
    .filter((file) => /\.(png|jpe?g|webp|gif)$/i.test(file))
    .map((file) => ({
      file,
      size: fs.statSync(file).size,
    }))
    .sort((a, b) => b.size - a.size);

  const preferred = imageFiles.find(({ file }) =>
    /(cover|logo|icon|screenshot|preview|banner)/i.test(file)
  );

  return preferred?.file ?? imageFiles[0]?.file ?? null;
}

export function copyCoverImage(sourceDir, slug) {
  ensureDir(COVERS_DIR);
  const coverSource = findCoverImage(sourceDir);
  const coverTarget = path.join(COVERS_DIR, `${slug}.jpg`);

  if (!coverSource) {
    return `/games/covers/${slug}.jpg`;
  }

  fs.copyFileSync(coverSource, coverTarget);
  return `/games/covers/${slug}.jpg`;
}

export function loadCatalog() {
  return readJson(GAMES_JSON, { forge: [], native: [], embed: [] });
}

export function saveCatalog(catalog) {
  writeJson(GAMES_JSON, catalog);
}

export function extractGithubLinksFromReadme(
  readmePath,
  sectionStart = "# Browser-Based",
  sectionEnd = "# Native"
) {
  const content = fs.readFileSync(readmePath, "utf8");
  const start = content.indexOf(sectionStart);
  if (start === -1) return [];

  const end = content.indexOf(sectionEnd, start + sectionStart.length);
  const section =
    end === -1 ? content.slice(start) : content.slice(start, end);

  const links = new Set();
  const regex = /https:\/\/github\.com\/[^)\s]+/gi;

  for (const match of section.matchAll(regex)) {
    let url = match[0]
      .replace(/\/tree\/.*$/i, "")
      .replace(/\/blob\/.*$/i, "")
      .replace(/[#?].*$/, "")
      .replace(/\/+$/, "");

    const repoMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (!repoMatch) continue;

    links.add(`https://github.com/${repoMatch[1]}/${repoMatch[2]}`);
  }

  return [...links];
}

export function hasBuildScript(rootDir) {
  const packageJsonPath = path.join(rootDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) return false;
  const pkg = readJson(packageJsonPath);
  return Boolean(pkg.scripts?.build);
}

export function getImportedEmbedIds() {
  const catalog = loadCatalog();
  return new Set(catalog.embed.map((game) => game.id));
}

export function upsertEmbedGame(entry) {
  const catalog = loadCatalog();
  catalog.embed = catalog.embed.filter((game) => game.id !== entry.id);
  catalog.embed.push(entry);
  catalog.embed.sort((a, b) => a.title.localeCompare(b.title));
  saveCatalog(catalog);
}
