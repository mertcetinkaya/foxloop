import { execFile } from "child_process";
import { promisify } from "util";
import { config } from "../config.js";

const exec = promisify(execFile);

async function runGit(args: string[], cwd = config.repoRoot) {
  return exec("git", args, {
    cwd,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

export async function gitPublishCommit(message: string): Promise<string | undefined> {
  await runGit([
    "add",
    "-A",
    "forge web/foxloop/src/games",
    "forge web/foxloop/src/components/games",
    "forge web/foxloop/src/app/games",
    "forge web/foxloop/public/games",
  ]);

  const status = await runGit(["status", "--porcelain"]);
  if (!status.stdout.trim()) {
    return undefined;
  }

  await runGit(["commit", "-m", message]);

  if (config.githubToken) {
    const remote = await runGit(["remote", "get-url", "origin"]);
    let url = remote.stdout.trim();
    if (url.startsWith("https://github.com")) {
      url = url.replace(
        "https://github.com",
        `https://${config.githubToken}@github.com`
      );
      await runGit(["push", url, `HEAD:${config.githubBranch}`]);
    } else {
      await runGit(["push", "origin", config.githubBranch]);
    }
  } else {
    await runGit(["push", "origin", config.githubBranch]);
  }

  const sha = await runGit(["rev-parse", "HEAD"]);
  return sha.stdout.trim();
}

export async function gitConfigured(): Promise<boolean> {
  try {
    await runGit(["rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}
