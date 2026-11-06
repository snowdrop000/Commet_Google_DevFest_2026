import { z } from "zod";

export const starCharacter = "f";
const characters = z.enum(["a", "b", "c", "d", "e", starCharacter]);
export const statKeys = ["empathy", "criticalThinking", "resilience"] as const;
const commonEquipmentKeys = ["skin", "hat", "badge"] as const;
const starEquipmentKeys = ["eyes", "mouth", "head", "prop", "pattern"] as const;
export const equipmentKeys = [...commonEquipmentKeys, ...starEquipmentKeys] as const;
type Stat = (typeof statKeys)[number];
type Equipment = (typeof equipmentKeys)[number];
type Progress = "supportive" | "constructive" | "respectful" | "contextual" | "balanced";
type Requirement =
  | { type: "level" | "allStats"; value: number }
  | { type: "stat"; key: Stat; value: number }
  | { type: "progress"; key: Progress; value: number };
type Item = {
  slot: Equipment;
  name: string;
  icon: string;
  hint: string;
  requirement?: Requirement;
  character?: z.infer<typeof characters>;
};

export const CATEGORY_RULES = Object.freeze({
  abusive: {
    label: "だれかを傷つける表現",
    mood: "cry",
    deltas: { empathy: -8, criticalThinking: -4, resilience: -3, xp: 0 },
  },
  unconstructive_criticism: {
    label: "改善につながりにくい批判",
    mood: "sad",
    deltas: { empathy: -3, criticalThinking: -2, resilience: 0, xp: 0 },
  },
  constructive_criticism: {
    label: "適切で建設的な批判",
    mood: "proud",
    deltas: { empathy: 2, criticalThinking: 6, resilience: 2, xp: 10 },
  },
  supportive: {
    label: "思いやりのある投稿",
    mood: "happy",
    deltas: { empathy: 6, criticalThinking: 1, resilience: 2, xp: 8 },
  },
  neutral: {
    label: "穏やかな投稿",
    mood: "idle",
    deltas: { empathy: 1, criticalThinking: 1, resilience: 1, xp: 2 },
  },
  context_required: {
    label: "文脈が足りないため判定保留",
    mood: "idle",
    deltas: { empathy: 0, criticalThinking: 0, resilience: 0, xp: 0 },
  },
} as const);

export const CHARACTER_TYPES = Object.freeze({
  a: Object.freeze({ name: "バウンシーコア", description: "弾んで気持ちを表す、素直なコア型" }),
  b: Object.freeze({ name: "メルティドロップ", description: "伸びたり溶けたりするジェル型" }),
  c: Object.freeze({ name: "ピクセルブロック", description: "周囲のピクセルが反応するデジタル型" }),
  d: Object.freeze({ name: "ストレッチモチ", description: "長い腕で感情を伝えるモチ型" }),
  e: Object.freeze({ name: "ボイスバブル", description: "言葉の力が見える吹き出し型" }),
  f: Object.freeze({ name: "ほしもち（試作）", description: "星を揺らして歩く、もちもちのキャラ" }),
});

export const ITEM_CATALOG: Record<string, Item> = Object.freeze({
  skin_base: { slot: "skin", name: "オリジナルカラー", icon: "●", hint: "最初から所持" },
  hat_none: { slot: "hat", name: "帽子なし", icon: "−", hint: "最初から所持" },
  badge_none: { slot: "badge", name: "アクセサリーなし", icon: "−", hint: "最初から所持" },
  skin_sunset: {
    slot: "skin",
    name: "サンセットスキン",
    icon: "◐",
    hint: "LV.2",
    requirement: { type: "level", value: 2 },
  },
  badge_star: {
    slot: "badge",
    name: "はじまりの星",
    icon: "★",
    hint: "LV.3",
    requirement: { type: "level", value: 3 },
  },
  skin_midnight: {
    slot: "skin",
    name: "ミッドナイトスキン",
    icon: "◆",
    hint: "LV.5",
    requirement: { type: "level", value: 5 },
  },
  hat_crown: {
    slot: "hat",
    name: "ことばの王冠",
    icon: "♛",
    hint: "LV.10",
    requirement: { type: "level", value: 10 },
  },
  hat_heart: {
    slot: "hat",
    name: "ハートハット",
    icon: "♥",
    hint: "応援・共感 3回",
    requirement: { type: "progress", key: "supportive", value: 3 },
  },
  hat_scholar: {
    slot: "hat",
    name: "研究者ハット",
    icon: "▰",
    hint: "建設的な批判 3回",
    requirement: { type: "progress", key: "constructive", value: 3 },
  },
  badge_dialogue: {
    slot: "badge",
    name: "対話上手バッジ",
    icon: "∞",
    hint: "敬意8以上 5回",
    requirement: { type: "progress", key: "respectful", value: 5 },
  },
  badge_context: {
    slot: "badge",
    name: "文脈マスターバッジ",
    icon: "↪",
    hint: "文脈を踏まえた返信 3回",
    requirement: { type: "progress", key: "contextual", value: 3 },
  },
  badge_balance: {
    slot: "badge",
    name: "ハーモニーエンブレム",
    icon: "◎",
    hint: "バランスのよい投稿 3回",
    requirement: { type: "progress", key: "balanced", value: 3 },
  },
  hat_halo: {
    slot: "hat",
    name: "やさしさの光輪",
    icon: "○",
    hint: "思いやり 70",
    requirement: { type: "stat", key: "empathy", value: 70 },
  },
  badge_book: {
    slot: "badge",
    name: "知恵の本",
    icon: "▣",
    hint: "考える力 70",
    requirement: { type: "stat", key: "criticalThinking", value: 70 },
  },
  badge_shield: {
    slot: "badge",
    name: "しなやかシールド",
    icon: "◇",
    hint: "しなやかさ 70",
    requirement: { type: "stat", key: "resilience", value: 70 },
  },
  skin_aurora: {
    slot: "skin",
    name: "オーロラスキン",
    icon: "✦",
    hint: "3ステータスすべて70",
    requirement: { type: "allStats", value: 70 },
  },
  skin_star_mint: {
    slot: "skin",
    name: "ミントもち",
    icon: "●",
    hint: "ほしもち用・試作",
    character: starCharacter,
  },
  skin_star_night: {
    slot: "skin",
    name: "夜空もち",
    icon: "●",
    hint: "ほしもち用・試作",
    character: starCharacter,
  },
  hat_star_beret: {
    slot: "hat",
    name: "すみれベレー",
    icon: "●",
    hint: "ほしもち用・試作",
    character: starCharacter,
  },
  hat_star_pin: {
    slot: "hat",
    name: "そら色の星ピン",
    icon: "★",
    hint: "ほしもち用・試作",
    character: starCharacter,
  },
  eyes_default: { slot: "eyes", name: "まるい目", icon: "●", hint: "ほしもち用" },
  eyes_glimmer: {
    slot: "eyes",
    name: "うるうる目",
    icon: "✧",
    hint: "ほしもち用",
    character: starCharacter,
  },
  mouth_default: { slot: "mouth", name: "ちいさなW口", icon: "ω", hint: "ほしもち用" },
  mouth_smile: {
    slot: "mouth",
    name: "にっこり口",
    icon: "◡",
    hint: "ほしもち用",
    character: starCharacter,
  },
  head_gold: { slot: "head", name: "金の星飾り", icon: "★", hint: "ほしもち用" },
  head_moon: {
    slot: "head",
    name: "月の飾り",
    icon: "☽",
    hint: "ほしもち用",
    character: starCharacter,
  },
  head_none: {
    slot: "head",
    name: "飾りなし",
    icon: "−",
    hint: "ほしもち用",
    character: starCharacter,
  },
  prop_book: { slot: "prop", name: "星の本", icon: "▣", hint: "学習中に表示" },
  prop_none: {
    slot: "prop",
    name: "手持ちなし",
    icon: "−",
    hint: "ほしもち用",
    character: starCharacter,
  },
  pattern_none: { slot: "pattern", name: "柄なし", icon: "−", hint: "ほしもち用" },
  pattern_stars: {
    slot: "pattern",
    name: "星柄",
    icon: "✦",
    hint: "ほしもち用",
    character: starCharacter,
  },
});

export const defaultEquipment = {
  skin: "skin_base",
  hat: "hat_none",
  badge: "badge_none",
  eyes: "eyes_default",
  mouth: "mouth_default",
  head: "head_gold",
  prop: "prop_book",
  pattern: "pattern_none",
} as const;
const starterItems = [
  ...Object.values(defaultEquipment),
  "skin_star_mint",
  "skin_star_night",
  "hat_star_beret",
  "hat_star_pin",
  "eyes_glimmer",
  "mouth_smile",
  "head_moon",
  "head_none",
  "prop_none",
  "pattern_stars",
];

export function withStarterItems(pet: Profile): Profile {
  return { ...pet, unlockedItems: [...new Set([...pet.unlockedItems, ...starterItems])] };
}

export function visibleEquipment(character: Appearance["characterType"]) {
  return character === starCharacter ? equipmentKeys : commonEquipmentKeys;
}

export function canEquip(character: Appearance["characterType"], slot: Equipment, id: string) {
  const item = ITEM_CATALOG[id];
  if (item?.slot !== slot) return false;
  if (item.character) return item.character === character;
  return character !== starCharacter || slot === "badge" || id === defaultEquipment[slot];
}

const integer = z.number().int().nonnegative();
const stat = integer.max(100);
const itemId = z.string().max(48);
const equippedItems = z.strictObject({
  skin: itemId,
  hat: itemId,
  badge: itemId,
  eyes: itemId.default(defaultEquipment.eyes),
  mouth: itemId.default(defaultEquipment.mouth),
  head: itemId.default(defaultEquipment.head),
  prop: itemId.default(defaultEquipment.prop),
  pattern: itemId.default(defaultEquipment.pattern),
});
export const appearance = z.strictObject({
  name: z.string().trim().min(1).max(12),
  characterType: characters,
  equippedItems,
});
export const profile = appearance.extend({
  unlockedItems: z.array(itemId),
  level: integer.min(1).max(99),
  xp: integer,
  empathy: stat,
  criticalThinking: stat,
  resilience: stat,
  progress: z.strictObject({
    supportive: integer,
    constructive: integer,
    respectful: integer,
    contextual: integer,
    balanced: integer,
  }),
  mood: z.enum(["idle", "happy", "sad", "cry", "proud", "levelup"]),
  totalPosts: integer,
  streak: integer,
  lastActiveDate: z.string().nullable(),
  confirmedCoins: integer,
  gacha: z.strictObject({
    draws: integer,
    sinceSR: integer,
    sinceUR: integer,
    shards: z.record(z.string(), integer),
  }),
});
export type Profile = z.infer<typeof profile>;
export type Appearance = z.infer<typeof appearance>;

export function newProfile(): Profile {
  return {
    name: "ココロ",
    characterType: "a",
    equippedItems: { ...defaultEquipment },
    unlockedItems: [...starterItems],
    level: 1,
    xp: 0,
    empathy: 50,
    criticalThinking: 50,
    resilience: 50,
    progress: { supportive: 0, constructive: 0, respectful: 0, contextual: 0, balanced: 0 },
    mood: "idle",
    totalPosts: 0,
    streak: 0,
    lastActiveDate: null,
    confirmedCoins: 0,
    gacha: { draws: 0, sinceSR: 0, sinceUR: 0, shards: {} },
  };
}

export const xpNeeded = (level: number) => 30 + (Math.max(1, level) - 1) * 15;
