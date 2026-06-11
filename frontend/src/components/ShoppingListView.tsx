import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Check,
  Plus,
  Minus,
  Trash2,
  Share2,
  PackageCheck,
  X,
  Loader2,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import { Recipe } from "../types";
import { api } from "../api";
import FeatureHint from "./FeatureHint";

interface ShoppingListViewProps {
  onBack: () => void;
  onNavigate?: (view: string) => void;
  /** Pre-generated result (e.g. from meal-plan → shopping-list flow) */
  initialResult?: {
    groups: {
      categoryId: number | null;
      categoryName: string;
      categoryIcon: string | null;
      items: {
        ingredientId: number | null;
        name: string;
        amount: number;
        unit: string;
        cost: number | null;
        sourceRecipes: string[];
        inStock: boolean;
        stockAmount: number | null;
        deficit: number | null;
      }[];
    }[];
    totalCost: number | null;
    sourceRecipes: { recipeId: string; title: string; servings: number }[];
  } | null;
}

// ── Category icon mapping ──
const CATEGORY_ICONS: Record<string, string> = {
  蔬菜: "🥬",
  肉类: "🥩",
  海鲜: "🦐",
  调味料: "🧂",
  主食: "🍚",
  豆制品: "🫘",
  蛋奶: "🥚",
  水果: "🍎",
  干货: "🥜",
  饮品: "🥤",
};

function getCategoryEmoji(name: string, icon: string | null): string {
  if (icon) return icon;
  for (const [key, emoji] of Object.entries(CATEGORY_ICONS)) {
    if (name.includes(key)) return emoji;
  }
  return "📦";
}

// ── Types ──
interface ShoppingItem {
  ingredientId: number | null;
  name: string;
  amount: number;
  unit: string;
  cost: number | null;
  sourceRecipes: string[];
  inStock: boolean;
  stockAmount: number | null;
  deficit: number | null;
  purchased: boolean; // client-only toggle
  isManual?: boolean; // manually added
}

interface ShoppingGroup {
  categoryId: number | null;
  categoryName: string;
  categoryIcon: string | null;
  items: ShoppingItem[];
}

type Phase = "select" | "result";

interface SelectedEntry {
  recipe: Recipe;
  servings: number;
}

export default function ShoppingListView({ onBack, onNavigate, initialResult }: ShoppingListViewProps) {
  const { t } = useTranslation();

  // ── Phase 1: Recipe selection ──
  const [phase, setPhase] = useState<Phase>(initialResult ? "result" : "select");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Map<string, SelectedEntry>>(new Map());
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // ── Phase 2: Result ──
  const [groups, setGroups] = useState<ShoppingGroup[]>([]);
  const [totalCost, setTotalCost] = useState<number | null>(null);
  const [sourceRecipes, setSourceRecipes] = useState<{ recipeId: string; title: string; servings: number }[]>([]);
  const [generating, setGenerating] = useState(false);

  // ── Apply pre-generated result ──
  useEffect(() => {
    if (initialResult) {
      setGroups(
        initialResult.groups.map((g) => ({
          ...g,
          items: g.items.map((item) => ({ ...item, purchased: item.inStock })),
        })),
      );
      setTotalCost(initialResult.totalCost);
      setSourceRecipes(initialResult.sourceRecipes);
      setPhase("result");
    }
  }, [initialResult]);

  // ── Manual add ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualUnit, setManualUnit] = useState("g");

  // ── Load recipes ──
  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const data = await api.getRecipes({ pageSize: 100 });
      setRecipes(data);
    } catch (err) {
      console.error("Failed to load recipes", err);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const filteredRecipes = useMemo(() => {
    if (!search.trim()) return recipes;
    const kw = search.toLowerCase();
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(kw) ||
        r.tags.some((t) => t.toLowerCase().includes(kw)),
    );
  }, [recipes, search]);

  // ── Toggle recipe selection ──
  const toggleRecipe = (recipe: Recipe) => {
    setSelected((prev: Map<string, SelectedEntry>) => {
      const next = new Map<string, SelectedEntry>(prev);
      if (next.has(recipe.id)) {
        next.delete(recipe.id);
      } else {
        next.set(recipe.id, { recipe, servings: recipe.baseServings });
      }
      return next;
    });
  };

  const updateServings = (recipeId: string, delta: number) => {
    setSelected((prev: Map<string, SelectedEntry>) => {
      const next = new Map<string, SelectedEntry>(prev);
      const entry = next.get(recipeId);
      if (entry) {
        const newServings = Math.max(1, entry.servings + delta);
        next.set(recipeId, { ...entry, servings: newServings });
      }
      return next;
    });
  };

  // ── Generate ──
  const handleGenerate = async () => {
    if (selected.size === 0) return;
    setGenerating(true);
    try {
      const items = [...selected.values()].map((s) => ({
        recipeId: s.recipe.id,
        servings: s.servings,
      }));
      const result = await api.generateShoppingList(items);
      setGroups(
        result.groups.map((g) => ({
          ...g,
          items: g.items.map((item) => ({ ...item, purchased: item.inStock })),
        })),
      );
      setTotalCost(result.totalCost);
      setSourceRecipes(result.sourceRecipes);
      setPhase("result");
    } catch (err) {
      alert(t("shoppingList.error.generateFailed"));
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // ── Toggle purchased ──
  const togglePurchased = (groupIdx: number, itemIdx: number) => {
    setGroups((prev) => {
      const next = [...prev];
      const group = { ...next[groupIdx], items: [...next[groupIdx].items] };
      group.items[itemIdx] = { ...group.items[itemIdx], purchased: !group.items[itemIdx].purchased };
      next[groupIdx] = group;
      return next;
    });
  };

  // ── Remove item ──
  const removeItem = (groupIdx: number, itemIdx: number) => {
    setGroups((prev) => {
      const next = [...prev];
      const group = { ...next[groupIdx], items: [...next[groupIdx].items] };
      group.items.splice(itemIdx, 1);
      next[groupIdx] = group;
      // Remove empty groups
      return next.filter((g) => g.items.length > 0);
    });
  };

  // ── Manual add item ──
  const handleAddManual = () => {
    if (!manualName.trim() || !manualAmount.trim()) return;
    const newItem: ShoppingItem = {
      ingredientId: null,
      name: manualName.trim(),
      amount: parseFloat(manualAmount) || 0,
      unit: manualUnit,
      cost: null,
      sourceRecipes: [],
      inStock: false,
      stockAmount: null,
      deficit: null,
      purchased: false,
      isManual: true,
    };
    setGroups((prev) => {
      // Add to "其他" group or create one
      const otherIdx = prev.findIndex((g) => g.categoryId === null);
      if (otherIdx >= 0) {
        const next = [...prev];
        const group = { ...next[otherIdx], items: [...next[otherIdx].items, newItem] };
        next[otherIdx] = group;
        return next;
      }
      return [...prev, { categoryId: null, categoryName: t("shoppingList.groupOther"), categoryIcon: null, items: [newItem] }];
    });
    setManualName("");
    setManualAmount("");
    setManualUnit("g");
    setShowAddForm(false);
  };

  // ── Share as text ──
  const handleShareText = () => {
    const lines: string[] = [`🛒 ${t("shoppingList.title")}`];
    if (sourceRecipes.length) {
      lines.push(`📋 ${sourceRecipes.map((r) => `${r.title}(${r.servings}份)`).join("、")}`);
    }
    lines.push("");
    for (const group of groups) {
      const emoji = getCategoryEmoji(group.categoryName, group.categoryIcon);
      lines.push(`${emoji} ${group.categoryName}`);
      for (const item of group.items) {
        const check = item.purchased ? "✅" : "⬜";
        const stockNote = item.inStock ? ` [${t("shoppingList.inStock")}]` : "";
        lines.push(`  ${check} ${item.name} ${item.amount}${item.unit}${stockNote}`);
      }
      lines.push("");
    }
    if (totalCost !== null) {
      lines.push(`💰 ${t("shoppingList.totalCost")}: ¥${totalCost.toFixed(2)}`);
    }
    const text = lines.join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => alert(t("shoppingList.copied")))
      .catch(() => alert(t("shoppingList.copyFailed")));
  };

  // ── Stats ──
  const purchasedCount = groups.reduce(
    (sum, g) => sum + g.items.filter((i) => i.purchased).length,
    0,
  );
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (phase === "select") {
    return (
      <div className="min-h-screen bg-[#fcf9f8]">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100 transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-800">{t("shoppingList.title")}</h1>
              <p className="text-xs text-gray-400">{t("shoppingList.subtitle")}</p>
            </div>
            <ShoppingCart className="w-5 h-5 text-[#ab3500]" />
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("shoppingList.searchPlaceholder")}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35]/30 outline-none transition"
            />
          </div>
        </div>

        {/* Selected recipes bar */}
        {selected.size > 0 && (
          <div className="px-4 pb-2">
            <div className="bg-[#fff8f5] border border-[#ff6b35]/20 rounded-xl p-3">
              <p className="text-sm font-medium text-[#ab3500] mb-2">
                {t("shoppingList.selectedCount", { count: selected.size })}
              </p>
              <div className="space-y-2">
                {[...selected.entries()].map(([id, { recipe, servings }]) => (
                  <div key={id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button onClick={() => toggleRecipe(recipe)} className="text-red-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-700 truncate">{recipe.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateServings(id, -1)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-12 text-center">
                        {t("shoppingList.servings", { count: servings })}
                      </span>
                      <button
                        onClick={() => updateServings(id, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-[#ff6b35] text-white hover:bg-[#e55a2b] transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recipe list */}
        <div className="px-4 pb-32">
          <FeatureHint hintKey="shopping_list_hint" message={t('hints.shoppingList')} position="bottom" className="mb-2" />
          <h3 className="text-sm font-medium text-gray-500 mb-2">{t("shoppingList.selectRecipes")}</h3>
          {loadingRecipes ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#ff6b35]" />
            </div>
          ) : filteredRecipes.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">{t("shoppingList.noRecipesFound")}</p>
          ) : (
            <div className="space-y-2">
              {filteredRecipes.map((recipe) => {
                const isSelected = selected.has(recipe.id);
                return (
                  <button
                    key={recipe.id}
                    onClick={() => toggleRecipe(recipe)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${
                      isSelected
                        ? "border-[#ff6b35] bg-[#fff8f5]"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    }`}
                  >
                    {/* Cover */}
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {recipe.coverImageUrl ? (
                        <img src={recipe.coverImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🍳</div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{recipe.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {recipe.ingredients.length} {t("detail.ingredientsTitle", "种食材")} · {recipe.cookTime}
                      </p>
                    </div>
                    {/* Check */}
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                        isSelected ? "border-[#ff6b35] bg-[#ff6b35]" : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        {selected.size > 0 && (
          <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-3 z-30">
            <div className="max-w-md mx-auto">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-3 bg-gradient-to-r from-[#ff6b35] to-[#ff8f35] text-white font-bold rounded-xl shadow-lg shadow-orange-200/50 active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("shoppingList.generating")}
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    {t("shoppingList.generate")}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Phase 2: Result
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPhase("select")}
            className="p-1.5 rounded-full hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">{t("shoppingList.result")}</h1>
            <p className="text-xs text-gray-400">
              {purchasedCount}/{totalItems} {t("shoppingList.purchased")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareText}
              className="p-2 rounded-full hover:bg-gray-100 transition"
              title={t("shoppingList.shareText")}
            >
              <Share2 className="w-4.5 h-4.5 text-gray-500" />
            </button>
            <button
              onClick={() => {
                setPhase("select");
                setGroups([]);
              }}
              className="p-2 rounded-full hover:bg-gray-100 transition"
              title={t("shoppingList.reset")}
            >
              <RefreshCw className="w-4.5 h-4.5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Source recipes */}
      {sourceRecipes.length > 0 && (
        <div className="px-4 pt-3">
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1.5">{t("shoppingList.sourceRecipes")}</p>
            <div className="flex flex-wrap gap-1.5">
              {sourceRecipes.map((r) => (
                <span
                  key={r.recipeId}
                  className="inline-flex items-center px-2.5 py-1 bg-orange-50 text-[#ab3500] text-xs rounded-full"
                >
                  {r.title} ×{r.servings}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shopping groups */}
      <div className="px-4 py-3 pb-40 space-y-4">
        {groups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm mb-4">{t("shoppingList.empty")}</p>
            {onNavigate && (
              <button
                onClick={() => onNavigate("meal-plan")}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-[#ab3500] rounded-full text-sm font-medium hover:bg-orange-100 transition"
              >
                <CalendarDays className="w-4 h-4" />
                {t("shoppingList.goMealPlan", "去规划本周餐单 →")}
              </button>
            )}
          </div>
        ) : (
          groups.map((group, gi) => (
            <div key={group.categoryId ?? "other"} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
                <span className="text-base">{getCategoryEmoji(group.categoryName, group.categoryIcon)}</span>
                <span className="text-sm font-semibold text-gray-700">{group.categoryName}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {group.items.filter((i) => i.purchased).length}/{group.items.length}
                </span>
              </div>
              {/* Items */}
              <div className="divide-y divide-gray-50">
                {group.items.map((item, ii) => (
                  <div
                    key={`${item.name}-${ii}`}
                    className={`flex items-center gap-3 px-4 py-3 transition ${
                      item.purchased ? "bg-gray-50/50" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => togglePurchased(gi, ii)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                        item.purchased
                          ? "border-green-500 bg-green-500"
                          : "border-gray-300 hover:border-[#ff6b35]"
                      }`}
                    >
                      {item.purchased && <Check className="w-3 h-3 text-white" />}
                    </button>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium transition ${
                          item.purchased ? "text-gray-400 line-through" : "text-gray-800"
                        }`}
                      >
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500">
                          {t("shoppingList.need")} {item.amount}{item.unit}
                        </span>
                        {item.inStock && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                            <PackageCheck className="w-3 h-3" />
                            {t("shoppingList.inStock")}
                            {item.stockAmount != null && ` ${item.stockAmount}${item.unit}`}
                          </span>
                        )}
                        {item.deficit != null && item.deficit > 0 && (
                          <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                            {t("shoppingList.deficit")} {item.deficit}{item.unit}
                          </span>
                        )}
                        {item.sourceRecipes.length > 0 && (
                          <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
                            {item.sourceRecipes.join("、")}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Cost + Delete */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.cost !== null && (
                        <span className="text-xs text-gray-500">¥{item.cost.toFixed(2)}</span>
                      )}
                      <button
                        onClick={() => removeItem(gi, ii)}
                        className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Manual add form */}
        {showAddForm ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder={t("shoppingList.addItemPlaceholder")}
                className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-100 focus:border-[#ff6b35] outline-none"
              />
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder={t("shoppingList.addItemAmount")}
                className="w-20 px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-100 focus:border-[#ff6b35] outline-none"
              />
              <input
                type="text"
                value={manualUnit}
                onChange={(e) => setManualUnit(e.target.value)}
                placeholder={t("shoppingList.addItemUnit")}
                className="w-14 px-2 py-2 bg-gray-50 rounded-lg text-sm border border-gray-100 focus:border-[#ff6b35] outline-none text-center"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2 text-sm text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                {t("common.cancel", "取消")}
              </button>
              <button
                onClick={handleAddManual}
                className="flex-1 py-2 text-sm text-white bg-[#ff6b35] rounded-lg hover:bg-[#e55a2b] transition"
              >
                {t("common.confirm", "确定")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-[#ff6b35] bg-white rounded-xl border border-dashed border-[#ff6b35]/30 hover:bg-[#fff8f5] transition"
          >
            <Plus className="w-4 h-4" />
            {t("shoppingList.addItem")}
          </button>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur border-t border-gray-100 z-30">
        <div className="max-w-md mx-auto px-4 py-3">
          {/* Cost summary */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">{t("shoppingList.totalCost")}</span>
            <span className="text-lg font-bold text-[#ab3500]">
              {totalCost !== null ? `¥${totalCost.toFixed(2)}` : t("shoppingList.costUnknown")}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
              style={{ width: totalItems > 0 ? `${(purchasedCount / totalItems) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
