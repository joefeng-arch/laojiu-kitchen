import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Search,
  ShoppingCart,
  Loader2,
  Minus,
  CalendarDays,
  Trash2,
} from "lucide-react";
import { Recipe } from "../types";
import { api } from "../api";
import FeatureHint from "./FeatureHint";

// ─── Props ───────────────────────────────────────────────────
interface MealPlanViewProps {
  onBack: () => void;
  onNavigateShoppingResult?: (result: any) => void;
}

// ─── Types ───────────────────────────────────────────────────
interface MealPlanEntry {
  id: string;
  planDate: string;
  mealType: string;
  recipeId: string;
  servings: number;
  recipe: { id: string; title: string; coverImage: string | null };
}

type MealType = "breakfast" | "lunch" | "dinner";
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

// ─── Date helpers ────────────────────────────────────────────
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isToday(dateStr: string): boolean {
  return dateStr === formatDate(new Date());
}

// ─── Component ───────────────────────────────────────────────
export default function MealPlanView({ onBack, onNavigateShoppingResult }: MealPlanViewProps) {
  const { t } = useTranslation();

  // ── Week state ──
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const startDate = formatDate(weekDates[0]);
  const endDate = formatDate(weekDates[6]);

  // ── Data ──
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Recipe picker modal ──
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState("");
  const [pickerMeal, setPickerMeal] = useState<MealType>("lunch");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);
  const [pickerServings, setPickerServings] = useState(2);

  // ── Shopping list ──
  const [generatingShoppingList, setGeneratingShoppingList] = useState(false);

  // ── Selected day (for mobile column highlight) ──
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(() => {
    const today = new Date();
    const monday = getMonday(today);
    const diff = Math.floor((today.getTime() - monday.getTime()) / 86400000);
    return Math.max(0, Math.min(6, diff));
  });

  // ── Load meal plans ──
  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMealPlans(startDate, endDate);
      setEntries(
        data.map((d) => ({
          ...d,
          servings: parseFloat(d.servings) || 1,
        })),
      );
    } catch (err) {
      console.error("Failed to load meal plans", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // ── Load recipes for picker ──
  useEffect(() => {
    if (!pickerOpen) return;
    (async () => {
      setLoadingRecipes(true);
      try {
        const data = await api.getRecipes({ pageSize: 100 });
        setRecipes(data);
      } catch {
        /* ignore */
      } finally {
        setLoadingRecipes(false);
      }
    })();
  }, [pickerOpen]);

  const filteredRecipes = useMemo(() => {
    if (!recipeSearch.trim()) return recipes;
    const kw = recipeSearch.toLowerCase();
    return recipes.filter((r) => r.title.toLowerCase().includes(kw));
  }, [recipes, recipeSearch]);

  // ── Helpers ──
  const getEntriesFor = (date: string, meal: string) =>
    entries.filter((e) => e.planDate === date && e.mealType === meal);

  const openPicker = (date: string, meal: MealType) => {
    setPickerDate(date);
    setPickerMeal(meal);
    setPickerServings(2);
    setRecipeSearch("");
    setPickerOpen(true);
  };

  const handleAddRecipe = async (recipe: Recipe) => {
    setAddingRecipeId(recipe.id);
    try {
      await api.createMealPlan({
        planDate: pickerDate,
        mealType: pickerMeal,
        recipeId: recipe.id,
        servings: pickerServings,
      });
      await loadPlans();
      setPickerOpen(false);
    } catch (err: any) {
      alert(err?.message || t("mealPlan.error.addFailed"));
    } finally {
      setAddingRecipeId(null);
    }
  };

  const handleDelete = async (entry: MealPlanEntry) => {
    if (!confirm(t("mealPlan.confirmDelete", { title: entry.recipe.title }))) return;
    try {
      await api.deleteMealPlan(entry.id);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (err: any) {
      alert(err?.message || t("mealPlan.error.deleteFailed"));
    }
  };

  const handleToShoppingList = async () => {
    if (entries.length === 0) return;
    setGeneratingShoppingList(true);
    try {
      const result = await api.mealPlansToShoppingList(startDate, endDate);
      if (onNavigateShoppingResult) {
        onNavigateShoppingResult(result);
      }
    } catch (err: any) {
      alert(err?.message || t("mealPlan.error.shoppingListFailed"));
    } finally {
      setGeneratingShoppingList(false);
    }
  };

  const prevWeek = () => setWeekStart((d) => addDays(d, -7));
  const nextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goThisWeek = () => setWeekStart(getMonday(new Date()));

  // ── Week label ──
  const weekLabel = useMemo(() => {
    const s = weekDates[0];
    const e = weekDates[6];
    return t("mealPlan.weekLabel", {
      month: s.getMonth() + 1,
      startDay: s.getDate(),
      endMonth: e.getMonth() + 1,
      endDay: e.getDate(),
    });
  }, [weekDates, t]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#fcf9f8] flex flex-col">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100 transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">{t("mealPlan.title")}</h1>
            <p className="text-xs text-gray-400">{t("mealPlan.subtitle")}</p>
          </div>
          <CalendarDays className="w-5 h-5 text-[#ab3500]" />
        </div>
      </div>

      {/* ── Week navigator ── */}
      <div className="px-4 py-3 flex items-center justify-between">
        <button onClick={prevWeek} className="p-2 rounded-full hover:bg-gray-100 transition">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">{weekLabel}</p>
          <button
            onClick={goThisWeek}
            className="text-xs text-[#ff6b35] hover:underline mt-0.5"
          >
            {t("mealPlan.thisWeek")}
          </button>
        </div>
        <button onClick={nextWeek} className="p-2 rounded-full hover:bg-gray-100 transition">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Feature hint */}
      <div className="px-4">
        <FeatureHint hintKey="meal_plan_hint" message={t('hints.mealPlan')} position="bottom" />
      </div>

      {/* ── Day selector (horizontal scroll) ── */}
      <div className="px-4 pb-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {weekDates.map((date, idx) => {
            const dateStr = formatDate(date);
            const active = idx === selectedDayIdx;
            const today = isToday(dateStr);
            const dayEntries = entries.filter((e) => e.planDate === dateStr);
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDayIdx(idx)}
                className={`flex-shrink-0 flex flex-col items-center w-11 py-2 rounded-xl transition ${
                  active
                    ? "bg-[#ff6b35] text-white shadow-md shadow-orange-200/50"
                    : today
                    ? "bg-orange-50 text-[#ab3500]"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                } border ${active ? "border-[#ff6b35]" : "border-gray-100"}`}
              >
                <span className="text-[10px] font-medium leading-none mb-1">
                  {t(`mealPlan.days.${DAY_KEYS[idx]}`)}
                </span>
                <span className="text-sm font-bold leading-none">{date.getDate()}</span>
                {dayEntries.length > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      active ? "bg-white" : "bg-[#ff6b35]"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Day detail: meal slots ── */}
      <div className="flex-1 px-4 pb-32 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#ff6b35]" />
          </div>
        ) : (
          MEAL_TYPES.map((meal) => {
            const dateStr = formatDate(weekDates[selectedDayIdx]);
            const slotEntries = getEntriesFor(dateStr, meal);
            return (
              <div
                key={meal}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                {/* Meal type header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">
                    {mealEmoji(meal)} {t(`mealPlan.meals.${meal}`)}
                  </span>
                  <button
                    onClick={() => openPicker(dateStr, meal)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-[#ff6b35] text-white hover:bg-[#e55a2b] transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {/* Entries */}
                {slotEntries.length === 0 ? (
                  <button
                    onClick={() => openPicker(dateStr, meal)}
                    className="w-full py-6 text-center text-xs text-gray-400 hover:bg-gray-50 transition"
                  >
                    {t("mealPlan.empty")}
                  </button>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {slotEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        {/* Cover */}
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {entry.recipe.coverImage ? (
                            <img
                              src={entry.recipe.coverImage}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">
                              🍳
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {entry.recipe.title}
                          </p>
                          <p className="text-xs text-gray-400">
                            {t("mealPlan.servings", { count: entry.servings })}
                          </p>
                        </div>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(entry)}
                          className="p-1.5 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom bar: generate shopping list ── */}
      {entries.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur border-t border-gray-100 z-30 px-4 py-3">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleToShoppingList}
              disabled={generatingShoppingList}
              className="w-full py-3 bg-gradient-to-r from-[#ff6b35] to-[#ff8f35] text-white font-bold rounded-xl shadow-lg shadow-orange-200/50 active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {generatingShoppingList ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("mealPlan.generating")}
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  {t("mealPlan.toShoppingList")}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Recipe Picker Modal ═══ */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-slide-up">
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">
                {t("mealPlan.selectRecipe")}
              </h3>
              <button
                onClick={() => setPickerOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Servings stepper */}
            <div className="flex items-center justify-center gap-3 px-4 py-2 bg-orange-50/60 border-b border-gray-100">
              <span className="text-sm text-gray-600">{t("mealPlan.servings", { count: "" }).replace(/\s*$/, "")}</span>
              <button
                onClick={() => setPickerServings((s) => Math.max(1, s - 1))}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-lg font-bold text-[#ab3500] w-8 text-center">
                {pickerServings}
              </span>
              <button
                onClick={() => setPickerServings((s) => s + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-[#ff6b35] text-white hover:bg-[#e55a2b] transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  placeholder={t("mealPlan.searchPlaceholder")}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35]/30 outline-none transition"
                />
              </div>
            </div>

            {/* Recipe list */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {loadingRecipes ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#ff6b35]" />
                </div>
              ) : filteredRecipes.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">
                  {t("mealPlan.noRecipes")}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredRecipes.map((recipe) => {
                    const isAdding = addingRecipeId === recipe.id;
                    return (
                      <button
                        key={recipe.id}
                        onClick={() => handleAddRecipe(recipe)}
                        disabled={isAdding}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-[#ff6b35]/30 hover:bg-[#fff8f5] transition disabled:opacity-60"
                      >
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {recipe.coverImageUrl ? (
                            <img
                              src={recipe.coverImageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">
                              🍳
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {recipe.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {recipe.cookTime} · {recipe.ingredients.length}种食材
                          </p>
                        </div>
                        {isAdding ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#ff6b35] flex-shrink-0" />
                        ) : (
                          <Plus className="w-5 h-5 text-[#ff6b35] flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function mealEmoji(meal: string): string {
  switch (meal) {
    case "breakfast":
      return "🌅";
    case "lunch":
      return "☀️";
    case "dinner":
      return "🌙";
    case "snack":
      return "🍪";
    default:
      return "🍽️";
  }
}
