import { z } from "zod";

export const starCharacter = "f";
const characters = z.enum(["a", "b", "c", "d", "e", starCharacter]);
export const statKeys = ["empathy", "criticalThinking", "resilience"] as const;
export const statLabels = {
  empathy: "やさしさ",
  criticalThinking: "ひらめき",
  resilience: "ゆうき",
} as const;
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
  acquisition?: "level";
};

function starItem(slot: Equipment, name: string, icon: string, hint = "ほしもち用・試作"): Item {
  return { slot, name, icon, hint, character: starCharacter };
}
function levelItem(slot: Equipment, name: string, icon: string, level: number): Item {
  return {
    ...starItem(slot, name, icon, `LV.${level}で解放`),
    acquisition: "level",
    requirement: { type: "level", value: level },
  };
}
// Seasonal sets. The hint records the theme; availability is the same as other gacha items.
const halloween = "ハロウィン";
const christmas = "クリスマス";

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
    hint: `${statLabels.empathy} 70`,
    requirement: { type: "stat", key: "empathy", value: 70 },
  },
  badge_book: {
    slot: "badge",
    name: "知恵の本",
    icon: "▣",
    hint: `${statLabels.criticalThinking} 70`,
    requirement: { type: "stat", key: "criticalThinking", value: 70 },
  },
  badge_shield: {
    slot: "badge",
    name: "しなやかシールド",
    icon: "◇",
    hint: `${statLabels.resilience} 70`,
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
  skin_level_sunrise: levelItem("skin", "ひだまりもち", "☀", 2),
  hat_level_ribbon: levelItem("hat", "はじまりのリボン", "⋈", 3),
  skin_level_twilight: levelItem("skin", "ゆうやけもち", "◒", 5),
  badge_level_bloom: levelItem("badge", "成長のしるし", "✿", 7),
  skin_level_aurora: levelItem("skin", "オーロラもち", "✦", 10),
  hat_level_tiara: levelItem("hat", "星のティアラ", "♛", 15),
  skin_level_moonlight: levelItem("skin", "月あかりもち", "☽", 20),
  skin_star_night: {
    slot: "skin",
    name: "夜空もち",
    icon: "●",
    hint: "ほしもち用・試作",
    character: starCharacter,
  },
  skin_star_pixel: starItem("skin", "ドットほしもち", "▪"),
  skin_star_sakura: starItem("skin", "さくらもち", "●"),
  skin_star_lemon: starItem("skin", "レモンもち", "●"),
  skin_star_sky: starItem("skin", "そらいろもち", "●"),
  skin_star_lavender: starItem("skin", "ラベンダーもち", "●"),
  skin_star_matcha: starItem("skin", "抹茶もち", "●"),
  skin_star_galaxy: starItem("skin", "銀河もち", "✦"),
  skin_star_soda: starItem("skin", "ソーダもち", "○"),
  skin_star_strawberry: starItem("skin", "いちご大福もち", "♥"),
  skin_star_toast: starItem("skin", "こんがり焼きもち", "▧"),
  skin_star_kintsugi: starItem("skin", "金継ぎもち", "◇"),
  skin_star_choco: starItem("skin", "チョコがけもち", "◓"),
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
  hat_star_crown: starItem("hat", "ちいさな王冠", "♛"),
  hat_star_wizard: starItem("hat", "星読みのとんがり帽", "✦"),
  hat_star_sailor: starItem("hat", "セーラー帽", "⚓"),
  hat_star_knit: starItem("hat", "ぽんぽんニット帽", "●"),
  hat_star_cap: starItem("hat", "ミントキャップ", "◒"),
  hat_star_top: starItem("hat", "夜会のシルクハット", "▰"),
  hat_star_pumpkin: starItem("hat", "かぼちゃ帽", "●", halloween),
  hat_star_mushroom: starItem("hat", "きのこのかさ", "●"),
  hat_star_rain: starItem("hat", "雨の日バケット", "◆"),
  hat_star_graduate: starItem("hat", "卒業の角帽", "◇"),
  hat_star_santa: starItem("hat", "ほしぞらサンタ帽", "△", christmas),
  eyes_default: { slot: "eyes", name: "まるい目", icon: "●", hint: "ほしもち用" },
  eyes_glimmer: {
    slot: "eyes",
    name: "うるうる目",
    icon: "✧",
    hint: "ほしもち用",
    character: starCharacter,
  },
  eyes_star_shine: starItem("eyes", "星のひとみ", "✦"),
  eyes_star_heart: starItem("eyes", "ハート目", "♥"),
  eyes_star_sleepy: starItem("eyes", "とろん目", "◒"),
  eyes_star_odd: starItem("eyes", "オッドアイ", "◉"),
  eyes_star_digital: starItem("eyes", "デジタル目", "▪"),
  eyes_star_wink: starItem("eyes", "ウインク", "◠"),
  mouth_default: { slot: "mouth", name: "ちいさなW口", icon: "ω", hint: "ほしもち用" },
  mouth_smile: {
    slot: "mouth",
    name: "にっこり口",
    icon: "◡",
    hint: "ほしもち用",
    character: starCharacter,
  },
  mouth_star_fang: starItem("mouth", "ちらっと八重歯", "▿"),
  head_gold: { slot: "head", name: "金の星飾り", icon: "★", hint: "ほしもち用" },
  head_moon: {
    slot: "head",
    name: "月の飾り",
    icon: "☽",
    hint: "ほしもち用",
    character: starCharacter,
  },
  head_star_bunny: starItem("head", "うさ耳", "♧"),
  head_star_cat: starItem("head", "ねこ耳", "△"),
  head_star_cloud: starItem("head", "わたぐも耳", "☁"),
  head_star_sprout: starItem("head", "ふたば耳", "♧"),
  head_star_ice: starItem("head", "氷の結晶耳", "❄"),
  head_star_antler: starItem("head", "トナカイのつの", "Ψ", christmas),
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
  prop_star_cocoa: starItem("prop", "ほしマシュマロココア", "☕", christmas),
  pattern_none: { slot: "pattern", name: "柄なし", icon: "−", hint: "ほしもち用" },
  pattern_stars: {
    slot: "pattern",
    name: "星柄",
    icon: "✦",
    hint: "ほしもち用",
    character: starCharacter,
  },
  pattern_star_border: starItem("pattern", "マリンボーダー", "≡"),
  badge_star_clover: starItem("badge", "よつばのおまもり", "♣"),
  skin_star_pumpkin: starItem("skin", "かぼちゃもち", "●", halloween),
  hat_star_witch: starItem("hat", "まじょのとんがり帽", "▲", halloween),
  badge_star_ghost: starItem("badge", "おばけのおまもり", "◓", halloween),
  eyes_star_jack: starItem("eyes", "ランタンの目", "▴", halloween),
  mouth_star_jack: starItem("mouth", "ギザギザスマイル", "◡", halloween),
  head_star_bat: starItem("head", "こうもりの羽", "⌒", halloween),
  prop_star_candy: starItem("prop", "おかしバケツ", "◍", halloween),
  pattern_star_ghost: starItem("pattern", "おばけ柄", "◓", halloween),
  skin_star_franken: starItem("skin", "フランケンもち", "▦", halloween),
  head_star_bolt: starItem("head", "フランケンのボルト", "⊣", halloween),
  skin_star_mummy: starItem("skin", "ミイラもち", "≋", halloween),
  skin_star_zombie: starItem("skin", "ゾンビもち", "◩", halloween),
  eyes_star_spiral: starItem("eyes", "ぐるぐる目", "@", halloween),
  skin_star_ghost: starItem("skin", "おばけもち", "◓", halloween),
  mouth_star_ghost: starItem("mouth", "ひゅ〜口", "o", halloween),
  skin_star_ginger: starItem("skin", "ジンジャーもち", "●", christmas),
  hat_star_tree: starItem("hat", "ツリーのぼうし", "▲", christmas),
  badge_star_bell: starItem("badge", "ベルのおまもり", "◒", christmas),
  eyes_star_snow: starItem("eyes", "ゆきのひとみ", "❄", christmas),
  mouth_star_cane: starItem("mouth", "キャンディケイン", "J", christmas),
  head_star_holly: starItem("head", "ひいらぎ飾り", "♧", christmas),
  prop_star_gift: starItem("prop", "プレゼントばこ", "▣", christmas),
  pattern_star_snow: starItem("pattern", "ゆきもよう", "❄", christmas),
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
export const starterItems: readonly string[] = [
  ...Object.values(defaultEquipment),
  "head_none",
  "prop_none",
];

export function withStarterItems(pet: Profile): Profile {
  return { ...pet, unlockedItems: [...new Set([...pet.unlockedItems, ...starterItems])] };
}

export function visibleEquipment(character: z.infer<typeof characters>) {
  return character === starCharacter ? equipmentKeys : commonEquipmentKeys;
}

export function canEquip(character: z.infer<typeof characters>, slot: Equipment, id: string) {
  const item = ITEM_CATALOG[id];
  if (item?.slot !== slot) return false;
  if (item.character) return item.character === character;
  return character !== starCharacter || slot === "badge" || id === defaultEquipment[slot];
}

export function ownedEquipment(
  character: z.infer<typeof characters>,
  current: Profile["equippedItems"],
  owned: readonly string[],
): Profile["equippedItems"] {
  const equipped = { ...current };
  for (const slot of equipmentKeys) {
    if (!owned.includes(equipped[slot]) || !canEquip(character, slot, equipped[slot]))
      equipped[slot] = defaultEquipment[slot];
  }
  return equipped;
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
  characterType: z.literal(starCharacter),
  equippedItems,
});
export const profile = appearance.extend({
  // Archived character IDs remain readable; new appearance writes only accept Hoshimoti.
  characterType: characters,
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
    // Old item/rarity balances stay readable until the account migration combines them.
    shards: z.union([integer, z.record(z.string(), integer)]),
  }),
});
export type Profile = z.infer<typeof profile>;
export type Appearance = z.infer<typeof appearance>;

export function totalShards(shards: Profile["gacha"]["shards"]): number {
  return typeof shards === "number"
    ? shards
    : Object.values(shards).reduce((sum, count) => sum + count, 0);
}

/** Presentation only: keep the saved legacy profile and inventory intact. */
export function asStarProfile(pet: Profile): Profile {
  return {
    ...pet,
    characterType: starCharacter,
    equippedItems: ownedEquipment(starCharacter, pet.equippedItems, pet.unlockedItems),
  };
}

export function newProfile(): Profile {
  return {
    name: "ほしもち",
    characterType: starCharacter,
    equippedItems: { ...defaultEquipment },
    unlockedItems: [...starterItems],
    level: 1,
    xp: 0,
    empathy: 10,
    criticalThinking: 10,
    resilience: 10,
    progress: { supportive: 0, constructive: 0, respectful: 0, contextual: 0, balanced: 0 },
    mood: "idle",
    totalPosts: 0,
    streak: 0,
    lastActiveDate: null,
    confirmedCoins: 0,
    gacha: { draws: 0, sinceSR: 0, sinceUR: 0, shards: 0 },
  };
}

export const xpNeeded = (level: number) => 30 + (Math.max(1, level) - 1) * 15;
