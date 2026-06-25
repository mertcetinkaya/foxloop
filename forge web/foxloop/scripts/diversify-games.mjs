#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { EMBED_DIR, GAMES_JSON, ROOT, readJson, writeJson } from "./lib/game-utils.mjs";

const PERSONAS = [
  {
    id: "retro",
    wins: ["NEW HIGH SCORE", "STAGE CLEAR", "BONUS ROUND", "ARCADE LEGEND"],
    loses: ["GAME OVER", "TRY AGAIN", "INSERT COIN", "NO CONTINUES"],
    scores: ["SCORE:", "PTS:", "HIGH:"],
  },
  {
    id: "casual",
    wins: ["Nice work!", "Well done!", "Great job!", "Customers loved it."],
    loses: ["So close!", "Almost had it.", "Give it another go.", "Not this time."],
    scores: ["Score:", "Points:", "Total:"],
  },
  {
    id: "hardcore",
    wins: ["Sector cleared.", "Objective complete.", "Hostiles neutralized.", "Extraction ready."],
    loses: ["Mission failed.", "KIA.", "Sector lost.", "Abort recommended."],
    scores: ["Score:", "Tally:", "Rating:"],
  },
  {
    id: "kids",
    wins: ["You did it!", "Awesome!", "Super star!", "Way to go!"],
    loses: ["Oops!", "Try again!", "Keep going!", "Almost there!"],
    scores: ["Score:", "Stars:", "Points:"],
  },
  {
    id: "sports",
    wins: ["What a finish!", "Champions!", "Match point!", "Gold medal run!"],
    loses: ["Tough break.", "Close one.", "Next match awaits.", "Shake it off."],
    scores: ["Score:", "Points:", "Result:"],
  },
];

const GENERIC_WINS = new Set([
  "level completed",
  "level completed!",
  "you win",
  "win",
  "victory",
  "complete",
  "all flows connected!",
]);

const GENERIC_LOSES = new Set([
  "game over",
  "try again!",
  "try again",
  "defeated",
  "you lose",
  "time's up!",
  "times up!",
  "your score:",
  "final score:",
]);

const GENERIC_HTP = new Set([
  "how to play",
  "survive 60 seconds.",
  "how to play:",
]);

const TITLE_OVERRIDES = {
  "2048": "Classic 2048",
  "puzzle-2048": "Tile Merge Rush",
  "platformer-mario": "Plumber Rush",
  "arcade-pacman": "Maze Chomper",
  "word-quiz-wordle": "Five Letters",
  "word-quiz-words-of-wonder": "Letter Garden",
  "casual-candy-crush": "Sweet Match",
  "casual-candy-crusher": "Sugar Smash",
  "penalty-fever": "Spot Kick Showdown",
  "eat-smaller-fish": "Ocean Feast",
  "arrow-out": "Arrow Escape",
  "wrath-of-passchendaele": "Fields of Mud",
  peglinko: "Peg Drop",
  tetris: "Block Cascade",
  "puzzle-tetris": "Stack Master",
  "custom-tetris": "Block Stack Pro",
  snake: "Trail Worm",
  "arcade-snake": "Pixel Worm",
  chess: "Royal Board",
  "board-chess": "Grandmaster Duel",
  "platformer-doodle-jump": "Sky Hopper",
  "platformer-flip-jump": "Flip Tower",
  "puzzle-6oct": "Hex Grid Six",
  "arcade-abhita": "Neon Abhita",
  "sports-basketball": "Court Kings",
  "casual-cooking": "Kitchen Rush",
  "casual-buttermilk": "Mixology Bar",
  "puzzle-link": "Pipe Link",
  "arcade-collector": "Relic Runner",
  "arcade-stick-game": "Stick Hero",
};

const TOKEN_ALIASES = {
  alien: ["Xeno", "Star", "Cosmic", "Orbital"],
  battle: ["Clash", "Siege", "Strike", "War"],
  bird: ["Sky", "Wing", "Feather", "Aerial"],
  shooter: ["Hunt", "Shot", "Blast", "Range"],
  bomb: ["Blast", "Boom", "Detonate", "Burst"],
  blast: ["Burst", "Boom", "Shock", "Blast"],
  bubble: ["Pop", "Fizz", "Sphere", "Float"],
  candy: ["Sweet", "Sugar", "Treat", "Candy"],
  color: ["Hue", "Chroma", "Tint", "Shade"],
  dash: ["Rush", "Sprint", "Bolt", "Dash"],
  demon: ["Fiend", "Shadow", "Inferno", "Demon"],
  jump: ["Leap", "Hop", "Bounce", "Jump"],
  mario: ["Plumber", "Block", "Pipe", "Jump"],
  pacman: ["Maze", "Dot", "Chomp", "Ghost"],
  pirate: ["Sea", "Corsair", "Treasure", "Captain"],
  puzzle: ["Mind", "Logic", "Grid", "Brain"],
  race: ["Rush", "Sprint", "Lap", "Drive"],
  road: ["Highway", "Route", "Lane", "Road"],
  shadow: ["Dark", "Night", "Shade", "Shadow"],
  snake: ["Worm", "Serpent", "Coil", "Trail"],
  space: ["Star", "Orbit", "Cosmos", "Void"],
  survivor: ["Last Stand", "Holdout", "Endure", "Survive"],
  tower: ["Spire", "Keep", "Fort", "Tower"],
  word: ["Letter", "Phrase", "Lex", "Word"],
  zombie: ["Undead", "Horde", "Night", "Walker"],
};

const PREFIX_ADJECTIVES = {
  shooter: ["Iron", "Neon", "Silent", "Turbo", "Shadow"],
  puzzle: ["Logic", "Crystal", "Brain", "Grid", "Mind"],
  arcade: ["Retro", "Hyper", "Pixel", "Turbo", "Neon"],
  racing: ["Turbo", "Drift", "Speed", "Nitro", "Rapid"],
  platformer: ["Sky", "Jump", "Block", "Cloud", "Peak"],
  casual: ["Cozy", "Sunny", "Sweet", "Easy", "Chill"],
  board: ["Classic", "Royal", "Family", "Tabletop", "Grand"],
  sports: ["Pro", "Golden", "Elite", "All-Star", "Prime"],
  word: ["Clever", "Quick", "Daily", "Smart", "Word"],
  default: ["Super", "Mega", "Ultra", "Hyper", "Neo"],
};

const SYNONYM_RULES = [
  [/\bDrag\b/g, ["Pull", "Slide", "Move", "Grab"]],
  [/\bdrag\b/g, ["pull", "slide", "move", "grab"]],
  [/\bShoot\b/g, ["Fire at", "Blast", "Take down", "Hit"]],
  [/\bshoot\b/g, ["fire at", "blast", "take down", "hit"]],
  [/\bAvoid\b/g, ["Dodge", "Steer clear of", "Watch out for", "Evade"]],
  [/\bavoid\b/g, ["dodge", "steer clear of", "watch out for", "evade"]],
  [/\bConnect\b/g, ["Link", "Join", "Pair", "Match"]],
  [/\bconnect\b/g, ["link", "join", "pair", "match"]],
  [/\bCollect\b/g, ["Gather", "Pick up", "Grab", "Snag"]],
  [/\bcollect\b/g, ["gather", "pick up", "grab", "snag"]],
  [/\bTap\b/g, ["Press", "Hit", "Touch", "Click"]],
  [/\btap\b/g, ["press", "hit", "touch", "click"]],
  [/\bSwipe\b/g, ["Flick", "Slide", "Sweep", "Swipe"]],
  [/\bswipe\b/g, ["flick", "slide", "sweep", "swipe"]],
  [/\bbefore time runs out\b/gi, [
    "before the clock hits zero",
    "while you still have time",
    "before time expires",
    "against the countdown",
  ]],
  [/\bTry Again\b/g, ["Play Again", "One More Run", "Retry", "Go Again"]],
  [/\bGame Over\b/g, ["Run Over", "Round Lost", "Out of Lives", "Session End"]],
  [/\bScore:\b/g, ["Points:", "Total:", "Tally:"]],
];

const CATEGORY_HTP = {
  shooter:
    "Use movement controls to stay alive. Fire at threats before they overwhelm you.",
  puzzle:
    "Study the board, plan your moves, and solve each challenge before time runs out.",
  arcade:
    "React fast, stay focused, and chase the highest score you can manage.",
  racing:
    "Steer through traffic, keep your speed up, and survive as long as possible.",
  platformer:
    "Jump across platforms, dodge hazards, and reach the end of each stage.",
  casual:
    "Follow the on-screen cues, keep your rhythm, and rack up points quickly.",
  board:
    "Take turns, read the board, and outplay your opponent to win the match.",
  sports:
    "Time your actions carefully and outscore the other side before the final whistle.",
  word:
    "Find the hidden words or letters using the clues and the board in front of you.",
  default: "Use the controls shown on screen and complete the objective before time runs out.",
};

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick(list, seed) {
  return list[seed % list.length];
}

function getPersona(slug) {
  return pick(PERSONAS, hashString(slug));
}

function getPrefix(slug) {
  return slug.split("-")[0] || "default";
}

function titleCase(words) {
  return words
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function generateCreativeTitle(slug, currentTitle) {
  if (TITLE_OVERRIDES[slug]) return TITLE_OVERRIDES[slug];

  const seed = hashString(slug);
  const prefix = getPrefix(slug);
  const tokens = slug.split("-").slice(1);
  if (tokens.length === 0) return currentTitle.trim();

  const aliased = tokens.map((token, index) => {
    const aliases = TOKEN_ALIASES[token];
    if (!aliases) return token;
    return pick(aliases, seed + index * 17);
  });

  const adjectives = PREFIX_ADJECTIVES[prefix] || PREFIX_ADJECTIVES.default;
  const style = seed % 4;

  if (style === 0 && aliased.length >= 2) {
    return titleCase(`${aliased[0]} ${aliased.slice(1).join(" ")}`);
  }
  if (style === 1) {
    return titleCase(`${pick(adjectives, seed)} ${aliased[aliased.length - 1]}`);
  }
  if (style === 2) {
    return titleCase(`${aliased.join(" ")} ${pick(["Run", "Quest", "Rush", "Zone"], seed)}`);
  }

  const cleaned = currentTitle.trim();
  if (cleaned && cleaned.length > 2 && !/^\d+$/.test(cleaned)) {
    const words = cleaned.split(/\s+/);
    if (words.length === 1) {
      return titleCase(`${pick(adjectives, seed)} ${words[0]}`);
    }
    return titleCase(`${pick(adjectives, seed + 3)} ${words.slice(-2).join(" ")}`);
  }

  return titleCase(aliased.join(" "));
}

function isGeneric(value, genericSet) {
  if (!value || typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (genericSet.has(normalized)) return true;
  for (const entry of genericSet) {
    if (normalized === entry || normalized.startsWith(`${entry} `)) return true;
  }
  return false;
}

function paraphraseText(text, slug) {
  if (!text || typeof text !== "string") return text;
  const seed = hashString(slug);
  let output = text;

  for (const [pattern, replacements] of SYNONYM_RULES) {
    if (pattern.test(output)) {
      output = output.replace(pattern, () => pick(replacements, seed + output.length));
    }
  }

  return output.replace(/\s{2,}/g, " ").trim();
}

function isAssetPath(value) {
  return (
    /\.(png|jpe?g|gif|webp|mp3|wav|ogg|ttf|html|js|json)$/i.test(value) ||
    /^(assets\/|\.\/|\/embed\/|https?:\/\/)/i.test(value)
  );
}

function shouldDiversifyKey(key) {
  const normalized = key.toLowerCase();
  return /how|htp|play|win|lose|over|level|score|retry|btn|label|title|text|message|desc|timer|target|best|cleared|complete|fail|start|end/.test(
    normalized
  );
}

function shouldDiversifyString(key, value) {
  if (typeof value !== "string") return false;
  if (!value.trim() || isAssetPath(value)) return false;
  if (TEXT_KEYS.has(key) || shouldDiversifyKey(key)) return true;
  return (
    isGeneric(value, GENERIC_WINS) ||
    isGeneric(value, GENERIC_LOSES) ||
    isGeneric(value, GENERIC_HTP)
  );
}

const TEXT_KEYS = new Set([
  "how_to_play",
  "how_to_play1",
  "how_to_play2",
  "howToPlayTitle",
  "howToPlayDescription",
  "htp_description",
  "play_description",
  "win_title",
  "level_complete",
  "levelClearedLabel",
  "game_over_title",
  "gameover_title",
  "game_over",
  "gameOverLabel",
  "score_label",
  "scoreLabel",
  "make_label",
  "timer_label",
  "retry_message",
  "retry_button",
  "yourScoreLabel",
  "targetScoreLabel",
  "targetLabel",
  "bestLabel",
  "btn_play",
  "btn_replay",
  "btn_next",
  "label_start",
  "label_end",
]);

function diversifyString(key, value, slug) {
  const lowerKey = key.toLowerCase();

  if (isGeneric(value, GENERIC_WINS)) {
    return pick(getPersona(slug).wins, hashString(`${slug}-${key}-win`));
  }
  if (isGeneric(value, GENERIC_LOSES) || value.trim().toLowerCase() === "game over!") {
    return pick(getPersona(slug).loses, hashString(`${slug}-${key}-lose`));
  }
  if (isGeneric(value, GENERIC_HTP)) {
    const prefix = getPrefix(slug);
    if (lowerKey === "htp" || lowerKey.includes("title")) {
      return pick(["Quick Guide", "Rules", "Getting Started", "Instructions"], hashString(`${slug}-${key}`));
    }
    return CATEGORY_HTP[prefix] || CATEGORY_HTP.default;
  }

  if (lowerKey === "htp" || lowerKey === "howtoplay" || lowerKey === "howto_title" || lowerKey === "howtoplaytitle") {
    return pick(["Quick Guide", "Rules", "Getting Started", "Instructions"], hashString(`${slug}-${key}`));
  }

  if (lowerKey.includes("how") || lowerKey.includes("htp") || lowerKey === "play_description") {
    if (isGeneric(value, GENERIC_HTP)) {
      const prefix = getPrefix(slug);
      return CATEGORY_HTP[prefix] || CATEGORY_HTP.default;
    }
    return paraphraseText(value, `${slug}-${key}`);
  }

  if (lowerKey.includes("win") || lowerKey.includes("level_complete") || lowerKey.includes("levelcleared")) {
    if (isGeneric(value, GENERIC_WINS)) {
      return pick(getPersona(slug).wins, hashString(`${slug}-${key}`));
    }
    return paraphraseText(value, `${slug}-${key}-win`);
  }

  if (lowerKey.includes("game_over") || lowerKey.includes("gameover") || lowerKey.includes("retry")) {
    if (isGeneric(value, GENERIC_LOSES) || value.trim().toLowerCase() === "game over!") {
      return pick(getPersona(slug).loses, hashString(`${slug}-${key}`));
    }
    return paraphraseText(value, `${slug}-${key}-lose`);
  }

  if (lowerKey.includes("score") && lowerKey.includes("label")) {
    return `${pick(getPersona(slug).scores, hashString(`${slug}-${key}`)).replace(/ $/, "")}`;
  }

  if (lowerKey.startsWith("btn_") || lowerKey.includes("label_")) {
    return paraphraseText(value, `${slug}-${key}`);
  }

  return paraphraseText(value, `${slug}-${key}`);
}

function walkTextFields(node, slug) {
  if (Array.isArray(node)) {
    return node.map((item, index) => {
      if (typeof item === "string" && shouldDiversifyString(String(index), item)) {
        return diversifyString(String(index), item, `${slug}-${index}`);
      }
      return walkTextFields(item, slug);
    });
  }
  if (!node || typeof node !== "object") return node;

  const next = {};
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === "string" && shouldDiversifyString(key, value)) {
      next[key] = diversifyString(key, value, slug);
    } else if (value && typeof value === "object") {
      next[key] = walkTextFields(value, slug);
    } else {
      next[key] = value;
    }
  }
  return next;
}

function diversifyTexts(texts, slug) {
  const persona = getPersona(slug);
  const seed = hashString(slug);
  const prefix = getPrefix(slug);
  const next = { ...texts };

  if (!next.how_to_play || isGeneric(next.how_to_play, GENERIC_HTP)) {
    next.how_to_play = CATEGORY_HTP[prefix] || CATEGORY_HTP.default;
  } else {
    next.how_to_play = paraphraseText(next.how_to_play, slug);
  }

  if (next.how_to_play1) next.how_to_play1 = paraphraseText(next.how_to_play1, `${slug}-1`);
  if (next.how_to_play2) next.how_to_play2 = paraphraseText(next.how_to_play2, `${slug}-2`);

  if (!next.win_title || isGeneric(next.win_title, GENERIC_WINS)) {
    next.win_title = pick(persona.wins, seed);
  } else {
    next.win_title = paraphraseText(next.win_title, `${slug}-win`);
  }

  if (!next.game_over_title || isGeneric(next.game_over_title, GENERIC_LOSES)) {
    next.game_over_title = pick(persona.loses, seed + 3);
  } else {
    next.game_over_title = paraphraseText(next.game_over_title, `${slug}-lose`);
  }

  if (next.score_label) {
    next.score_label = pick(persona.scores, seed + 5);
    if (!next.score_label.endsWith(" ")) next.score_label += " ";
  }

  if (next.make_label) next.make_label = paraphraseText(next.make_label, `${slug}-make`);
  if (next.timer_label) next.timer_label = paraphraseText(next.timer_label, `${slug}-timer`);

  return next;
}

function updateIndexTitle(slug, title) {
  const indexPath = path.join(EMBED_DIR, slug, "index.html");
  if (!fs.existsSync(indexPath)) return false;

  const html = fs.readFileSync(indexPath, "utf8");
  const escaped = title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const updated = html.replace(/<title>[^<]*<\/title>/i, `<title>${escaped}</title>`);
  if (updated !== html) {
    fs.writeFileSync(indexPath, updated);
    return true;
  }
  return false;
}

function updateConfig(slug) {
  const configPath = path.join(EMBED_DIR, slug, "config.json");
  if (!fs.existsSync(configPath)) return null;

  const raw = fs.readFileSync(configPath, "utf8").trim();
  if (!raw) return null;

  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    console.warn(`Skipping invalid JSON: ${configPath}`);
    return null;
  }

  if (!config || typeof config !== "object") return null;

  const before = JSON.stringify(config);

  if (config.texts && typeof config.texts === "object") {
    config.texts = diversifyTexts(config.texts, slug);
    config.texts = walkTextFields(config.texts, slug);
  }

  for (const [key, value] of Object.entries(config)) {
    if (key === "texts") continue;
    config[key] = walkTextFields(value, slug);
  }

  if (Array.isArray(config.gameplay?.recipes)) {
    config.gameplay.recipes = config.gameplay.recipes.map((recipe, index) => {
      if (!recipe?.name) return recipe;
      const renamed = paraphraseText(recipe.name, `${slug}-recipe-${index}`);
      return renamed === recipe.name
        ? {
            ...recipe,
            name: pick(
              ["House Special", "Chef Choice", "Daily Mix", "Classic Cup", "Signature Serve"],
              hashString(`${slug}-${index}`)
            ),
          }
        : { ...recipe, name: renamed };
    });
  }

  if (JSON.stringify(config) === before) return null;

  writeJson(configPath, config);
  return configPath;
}

function main() {
  const catalog = readJson(GAMES_JSON);
  const titleById = new Map();
  const report = {
    titlesUpdated: 0,
    configsUpdated: 0,
    indexTitlesUpdated: 0,
    duplicateTitles: [],
  };

  for (const section of ["forge", "native", "embed"]) {
    for (const game of catalog[section] || []) {
      const nextTitle = generateCreativeTitle(game.id, game.title || game.id);
      if (nextTitle !== game.title) {
        game.title = nextTitle;
        report.titlesUpdated += 1;
      }
      titleById.set(game.id, game.title);
    }
  }

  const seen = new Map();
  for (const [, title] of titleById) {
    seen.set(title, (seen.get(title) || 0) + 1);
  }
  report.duplicateTitles = [...seen.entries()].filter(([, count]) => count > 1);

  writeJson(GAMES_JSON, catalog);

  for (const game of catalog.embed || []) {
    const configResult = updateConfig(game.id);
    if (configResult) report.configsUpdated += 1;
    if (updateIndexTitle(game.id, game.title)) report.indexTitlesUpdated += 1;
  }

  for (const game of [...(catalog.forge || []), ...(catalog.native || [])]) {
    updateIndexTitle(game.id, game.title);
  }

  const reportPath = path.join(ROOT, "scripts", "diversify-report.json");
  writeJson(reportPath, report);
  console.log(JSON.stringify(report, null, 2));
}

main();
