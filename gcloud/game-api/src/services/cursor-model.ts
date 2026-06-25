import { config } from "../config.js";

export interface CursorModelParam {
  id: string;
  value: string;
}

export interface CursorModelSelection {
  id: string;
  params?: CursorModelParam[];
}

/** Composer 2.5 fast (matches Cursor UI "fast" toggle). */
const COMPOSER_25_FAST: CursorModelParam[] = [{ id: "fast", value: "true" }];

/** Opus 4.8 + thinking on + high effort (matches Cursor UI "thinking high"). */
const OPUS_48_THINKING_HIGH: CursorModelParam[] = [
  { id: "thinking", value: "true" },
  { id: "effort", value: "high" },
  { id: "context", value: "300k" },
  { id: "fast", value: "false" },
];

export function cursorModelSelection(): CursorModelSelection {
  const id = config.cursorModel;

  if (config.cursorModelParams.length > 0) {
    return { id, params: config.cursorModelParams };
  }

  if (id === "composer-2.5") {
    return { id, params: COMPOSER_25_FAST };
  }

  if (id === "claude-opus-4-8" && config.cursorOpusThinkingHigh) {
    return { id, params: OPUS_48_THINKING_HIGH };
  }

  return { id };
}
