// 前端单位换算表，必须与后端 src/modules/cooking/unit-converter.ts 保持一致
// 用户录入任意单位 → canonical (g / ml / count)，方便后续扣库存逻辑直接对齐

export type CanonicalUnit = "g" | "ml" | "count";

export interface NormalizedAmount {
  amount: number;        // 已换算到 canonical 单位的数值
  unit: CanonicalUnit;
}

const WEIGHT_TO_G: Record<string, number> = {
  g: 1, gram: 1, grams: 1, 克: 1,
  kg: 1000, 千克: 1000, 公斤: 1000,
  mg: 0.001, 毫克: 0.001,
  斤: 500, 市斤: 500,
  两: 50, 钱: 5,
  lb: 453.592, pound: 453.592,
  oz: 28.3495, ounce: 28.3495,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1, 毫升: 1,
  l: 1000, 升: 1000,
  cl: 10,
  tsp: 5, 茶匙: 5, 小勺: 5,
  tbsp: 15, 汤匙: 15, 大勺: 15, 勺: 15,
  cup: 240, 杯: 240,
};

const COUNT_UNITS = new Set([
  "个", "只", "颗", "粒", "块", "片", "根", "条", "瓣", "朵", "把", "束",
  "pcs", "piece", "pieces",
]);

function clean(u: string | null | undefined): string {
  return (u ?? "").toString().trim().toLowerCase();
}

export function normalizeUnit(amount: number, unit: string | null | undefined): NormalizedAmount | null {
  if (!isFinite(amount)) return null;
  const u = clean(unit);
  if (!u) return null;
  if (WEIGHT_TO_G[u] !== undefined) return { amount: amount * WEIGHT_TO_G[u], unit: "g" };
  if (VOLUME_TO_ML[u] !== undefined) return { amount: amount * VOLUME_TO_ML[u], unit: "ml" };
  if (COUNT_UNITS.has(u)) return { amount, unit: "count" };
  return null;
}

export function prettyAmount(n: NormalizedAmount): string {
  if (n.unit === "g") {
    if (n.amount >= 1000) return `${(n.amount / 1000).toFixed(2)}kg`;
    return `${Math.round(n.amount * 10) / 10}g`;
  }
  if (n.unit === "ml") {
    if (n.amount >= 1000) return `${(n.amount / 1000).toFixed(2)}L`;
    return `${Math.round(n.amount * 10) / 10}ml`;
  }
  return `${Math.round(n.amount * 10) / 10}个`;
}

/** 单位 label，给 UI 显示用 */
export function canonicalLabel(unit: CanonicalUnit): string {
  if (unit === "g") return "g";
  if (unit === "ml") return "ml";
  return "个";
}

/** 列出所有受支持单位，给 placeholder / 提示用 */
export const SUPPORTED_UNITS_HINT = "支持：g / kg / 斤 / 两 / ml / L / 勺 / 个 / 片 / 根…";
