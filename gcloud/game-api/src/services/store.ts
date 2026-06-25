import fs from "fs/promises";
import path from "path";
import type { ChatMessage, GameDoc, GameFile } from "../types.js";
import { config } from "../config.js";
import { nowIso } from "../utils.js";

export interface GameStore {
  listSlugs(): Promise<string[]>;
  getGame(id: string): Promise<GameDoc | null>;
  getGameBySlug(slug: string): Promise<GameDoc | null>;
  saveGame(game: GameDoc): Promise<void>;
  deleteGame(id: string): Promise<void>;
  listPublished(): Promise<GameDoc[]>;
  listByOwner(ownerUid: string): Promise<GameDoc[]>;
  getFiles(gameId: string): Promise<GameFile[]>;
  saveFile(gameId: string, file: GameFile): Promise<void>;
  saveFiles(gameId: string, files: GameFile[]): Promise<void>;
  deleteFiles(gameId: string): Promise<void>;
  getChat(gameId: string): Promise<ChatMessage[]>;
  addChat(gameId: string, message: ChatMessage): Promise<void>;
}

class FileGameStore implements GameStore {
  private root = config.dataRoot;

  private gamePath(id: string) {
    return path.join(this.root, "games", id);
  }

  private async ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
  }

  async listSlugs(): Promise<string[]> {
    await this.ensureDir(path.join(this.root, "games"));
    const dirs = await fs.readdir(path.join(this.root, "games"));
    const slugs: string[] = [];
    for (const id of dirs) {
      const game = await this.getGame(id);
      if (game) slugs.push(game.slug);
    }
    return slugs;
  }

  async getGame(id: string): Promise<GameDoc | null> {
    try {
      const raw = await fs.readFile(
        path.join(this.gamePath(id), "meta.json"),
        "utf8"
      );
      return JSON.parse(raw) as GameDoc;
    } catch {
      return null;
    }
  }

  async getGameBySlug(slug: string): Promise<GameDoc | null> {
    await this.ensureDir(path.join(this.root, "games"));
    const dirs = await fs.readdir(path.join(this.root, "games"));
    for (const id of dirs) {
      const game = await this.getGame(id);
      if (game?.slug === slug) return game;
    }
    return null;
  }

  async saveGame(game: GameDoc): Promise<void> {
    const dir = this.gamePath(game.id);
    await this.ensureDir(dir);
    await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(game, null, 2));
  }

  async deleteGame(id: string): Promise<void> {
    await fs.rm(this.gamePath(id), { recursive: true, force: true });
  }

  async listPublished(): Promise<GameDoc[]> {
    await this.ensureDir(path.join(this.root, "games"));
    const dirs = await fs.readdir(path.join(this.root, "games"));
    const games: GameDoc[] = [];
    for (const id of dirs) {
      const game = await this.getGame(id);
      if (game?.status === "published") games.push(game);
    }
    return games.sort(
      (a, b) =>
        new Date(b.publishedAt ?? b.updatedAt).getTime() -
        new Date(a.publishedAt ?? a.updatedAt).getTime()
    );
  }

  async listByOwner(ownerUid: string): Promise<GameDoc[]> {
    await this.ensureDir(path.join(this.root, "games"));
    const dirs = await fs.readdir(path.join(this.root, "games"));
    const games: GameDoc[] = [];
    for (const id of dirs) {
      const game = await this.getGame(id);
      if (game?.ownerUid === ownerUid) games.push(game);
    }
    return games.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getFiles(gameId: string): Promise<GameFile[]> {
    const dir = path.join(this.gamePath(gameId), "files");
    try {
      const names = await fs.readdir(dir);
      const files: GameFile[] = [];
      for (const name of names) {
        const content = await fs.readFile(path.join(dir, name), "utf8");
        files.push({ path: name, content, updatedAt: nowIso() });
      }
      return files;
    } catch {
      return [];
    }
  }

  async saveFile(gameId: string, file: GameFile): Promise<void> {
    const dir = path.join(this.gamePath(gameId), "files");
    await this.ensureDir(dir);
    const safeName = file.path.replace(/\//g, "__");
    await fs.writeFile(path.join(dir, safeName), file.content, "utf8");
  }

  async saveFiles(gameId: string, files: GameFile[]): Promise<void> {
    for (const file of files) {
      await this.saveFile(gameId, file);
    }
  }

  async deleteFiles(gameId: string): Promise<void> {
    await fs.rm(path.join(this.gamePath(gameId), "files"), {
      recursive: true,
      force: true,
    });
  }

  async getChat(gameId: string): Promise<ChatMessage[]> {
    try {
      const raw = await fs.readFile(
        path.join(this.gamePath(gameId), "chat.json"),
        "utf8"
      );
      return JSON.parse(raw) as ChatMessage[];
    } catch {
      return [];
    }
  }

  async addChat(gameId: string, message: ChatMessage): Promise<void> {
    const messages = await this.getChat(gameId);
    messages.push(message);
    await this.ensureDir(this.gamePath(gameId));
    await fs.writeFile(
      path.join(this.gamePath(gameId), "chat.json"),
      JSON.stringify(messages, null, 2)
    );
  }
}

class FirestoreGameStore implements GameStore {
  private db: import("@google-cloud/firestore").Firestore;

  constructor(db: import("@google-cloud/firestore").Firestore) {
    this.db = db;
  }

  async listSlugs(): Promise<string[]> {
    const snap = await this.db.collection("games").select("slug").get();
    return snap.docs.map((d) => d.data().slug as string);
  }

  async getGame(id: string): Promise<GameDoc | null> {
    const doc = await this.db.collection("games").doc(id).get();
    return doc.exists ? (doc.data() as GameDoc) : null;
  }

  async getGameBySlug(slug: string): Promise<GameDoc | null> {
    const snap = await this.db
      .collection("games")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return snap.docs[0]!.data() as GameDoc;
  }

  async saveGame(game: GameDoc): Promise<void> {
    await this.db.collection("games").doc(game.id).set(game, { merge: true });
  }

  async deleteGame(id: string): Promise<void> {
    const files = await this.db.collection("games").doc(id).collection("files").get();
    const batch = this.db.batch();
    files.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(this.db.collection("games").doc(id));
    const chat = await this.db.collection("games").doc(id).collection("chat").get();
    chat.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async listPublished(): Promise<GameDoc[]> {
    const snap = await this.db
      .collection("games")
      .where("status", "==", "published")
      .get();
    return snap.docs
      .map((d) => d.data() as GameDoc)
      .sort(
        (a, b) =>
          new Date(b.publishedAt ?? b.updatedAt).getTime() -
          new Date(a.publishedAt ?? a.updatedAt).getTime()
      );
  }

  async listByOwner(ownerUid: string): Promise<GameDoc[]> {
    const snap = await this.db
      .collection("games")
      .where("ownerUid", "==", ownerUid)
      .get();
    return snap.docs
      .map((d) => d.data() as GameDoc)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }

  async getFiles(gameId: string): Promise<GameFile[]> {
    const snap = await this.db
      .collection("games")
      .doc(gameId)
      .collection("files")
      .get();
    return snap.docs.map((d) => d.data() as GameFile);
  }

  async saveFile(gameId: string, file: GameFile): Promise<void> {
    const safeId = file.path.replace(/\//g, "__");
    await this.db
      .collection("games")
      .doc(gameId)
      .collection("files")
      .doc(safeId)
      .set(file);
  }

  async saveFiles(gameId: string, files: GameFile[]): Promise<void> {
    const batch = this.db.batch();
    for (const file of files) {
      const safeId = file.path.replace(/\//g, "__");
      const ref = this.db
        .collection("games")
        .doc(gameId)
        .collection("files")
        .doc(safeId);
      batch.set(ref, file);
    }
    await batch.commit();
  }

  async deleteFiles(gameId: string): Promise<void> {
    const snap = await this.db
      .collection("games")
      .doc(gameId)
      .collection("files")
      .get();
    const batch = this.db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async getChat(gameId: string): Promise<ChatMessage[]> {
    const snap = await this.db
      .collection("games")
      .doc(gameId)
      .collection("chat")
      .orderBy("createdAt", "asc")
      .get();
    return snap.docs.map((d) => d.data() as ChatMessage);
  }

  async addChat(gameId: string, message: ChatMessage): Promise<void> {
    await this.db
      .collection("games")
      .doc(gameId)
      .collection("chat")
      .doc(message.id)
      .set(message);
  }
}

let storeInstance: GameStore | null = null;

export async function getStore(): Promise<GameStore> {
  if (storeInstance) return storeInstance;

  if (config.useFirestore) {
    const { Firestore } = await import("@google-cloud/firestore");
    storeInstance = new FirestoreGameStore(new Firestore({ projectId: config.gcpProject }));
  } else {
    storeInstance = new FileGameStore();
  }
  return storeInstance;
}

export async function filePathToGameFile(
  workspaceDir: string,
  relativePath: string
): Promise<GameFile | null> {
  try {
    const content = await fs.readFile(
      path.join(workspaceDir, relativePath),
      "utf8"
    );
    return { path: relativePath, content, updatedAt: nowIso() };
  } catch {
    return null;
  }
}

export async function syncWorkspaceToStore(
  store: GameStore,
  gameId: string,
  workspaceDir: string,
  patterns: string[] = ["engine.ts", "renderer.ts", "types.ts", "constants.ts"]
): Promise<GameFile[]> {
  const files: GameFile[] = [];
  for (const pattern of patterns) {
    const file = await filePathToGameFile(workspaceDir, pattern);
    if (file) files.push(file);
  }
  const entries = await fs.readdir(workspaceDir).catch(() => [] as string[]);
  for (const name of entries) {
    if (patterns.includes(name)) continue;
    if (name.endsWith(".ts") || name.endsWith(".json")) {
      const file = await filePathToGameFile(workspaceDir, name);
      if (file) files.push(file);
    }
  }
  await store.saveFiles(gameId, files);
  return files;
}

export async function loadFilesToWorkspace(
  store: GameStore,
  gameId: string,
  workspaceDir: string
): Promise<void> {
  await fs.mkdir(workspaceDir, { recursive: true });
  const files = await store.getFiles(gameId);
  for (const file of files) {
    const dest = path.join(workspaceDir, file.path);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, file.content, "utf8");
  }
}
