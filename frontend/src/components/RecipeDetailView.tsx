import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Heart, Clock, Utensils, Star, Minus, Plus, MoveRight, Coins, ChevronRight, Play, ChevronDown, ChevronUp, MoreVertical, Trash2, Pencil, RefreshCw, Share2, CalendarPlus, X, Check, Loader2 } from "lucide-react";
import SharePosterModal from "./SharePosterModal";
import { Recipe, UserIngredient, UserProfile } from "../types";
import { api } from "../api";

interface RecipeDetailViewProps {
  recipeId: string;
  onBack: () => void;
  onStartCooking: (recipeId: string, servings: number) => void;
  onEditRecipe?: (recipeId: string) => void;
}

export default function RecipeDetailView({ recipeId, onBack, onStartCooking, onEditRecipe }: RecipeDetailViewProps) {
  const { t } = useTranslation();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portions, setPortions] = useState(2);
  const [unitMode, setUnitMode] = useState<"g_ml" | "jin_liang" | "oz_lb">("g_ml");
  const [showStepsDropdown, setShowStepsDropdown] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [userIngredients, setUserIngredients] = useState<UserIngredient[]>([]);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMealPlanPicker, setShowMealPlanPicker] = useState(false);
  const [mealPlanDate, setMealPlanDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [mealPlanMeal, setMealPlanMeal] = useState<"breakfast" | "lunch" | "dinner">("lunch");
  const [mealPlanServings, setMealPlanServings] = useState(2);
  const [addingToMealPlan, setAddingToMealPlan] = useState(false);

  useEffect(() => {
    loadRecipe();
  }, [recipeId]);

  const loadRecipe = async () => {
    setLoading(true);
    setError(null);
    try {
      // getRecipe is critical — must succeed; pantry/profile are optional
      const res = await api.getRecipe(recipeId);
      setRecipe(res);
      setPortions(res.baseServings || 2);
      setIsFavorited(!!res.isFavorited);

      // Load supplementary data independently — failures don't block detail display
      const [pantry, profile] = await Promise.all([
        api.getUserIngredients().catch(() => [] as UserIngredient[]),
        api.getProfile().catch(() => null),
      ]);
      setUserIngredients(pantry);
      setMe(profile);
    } catch (e: any) {
      console.error("加载菜谱失败", e);
      setError(e?.message || t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const canManage = !!me && !!recipe && me.id === recipe.author?.id;

  const handleDeleteRecipe = async () => {
    if (!recipe) return;
    if (!confirm(t('detail.menu.confirmDelete', { title: recipe.title }))) return;
    try {
      await api.deleteRecipe(recipe.id);
      onBack();
    } catch (e: any) {
      alert(e?.message ?? t('common.deleteFailed'));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Clock className="w-10 h-10 text-gray-300 animate-spin" />
        <p className="text-xs text-gray-400 mt-2">{t('detail.loading')}</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-6">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <RefreshCw className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">{t('detail.error.title')}</p>
        <p className="text-xs text-gray-400 text-center mb-5">{error || t('detail.error.notFound')}</p>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {t('common.back')}
          </button>
          <button
            onClick={loadRecipe}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#ab3500] hover:bg-[#ff6b35] transition-colors shadow-sm"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  const multiplier = portions / recipe.baseServings;

  // Scaling helper with Unit modes support
  const formatScaledValue = (baseAmount: number, unit: string, scaleType: "linear" | "sub_linear" | "fixed") => {
    let scaled = baseAmount;
    if (scaleType === "linear") {
      scaled = baseAmount * multiplier;
    } else if (scaleType === "sub_linear") {
      scaled = baseAmount * Math.sqrt(multiplier);
    } else if (scaleType === "fixed") {
      scaled = baseAmount;
    }

    // Convert values if appropriate
    if (unitMode === "jin_liang" && (unit === "g" || unit === "ml")) {
      // 1斤 = 500g, 1两 = 50g
      const totalLiang = scaled / 50;
      if (totalLiang >= 10) {
        return `${(totalLiang / 10).toFixed(1)} 斤`;
      }
      return `${totalLiang.toFixed(1)} 两`;
    }

    if (unitMode === "oz_lb" && (unit === "g" || unit === "ml")) {
      // 1 oz = 28.35g, 1 lb = 16 oz = 453.6g
      const totalOz = scaled / 28.35;
      if (totalOz >= 16) {
        return `${(totalOz / 16).toFixed(1)} lb`;
      }
      return `${totalOz.toFixed(1)} oz`;
    }

    // Default g_ml Mode
    if (scaleType === "sub_linear") {
      return `${scaled.toFixed(1)} ${unit}`;
    }
    return `${Math.round(scaled)} ${unit}`;
  };

  const getIngredientUnitPrice = (name: string, defaultPrice = 0.02) => {
    const matched = userIngredients.find(ui => ui.name === name);
    return matched ? matched.unitPrice : defaultPrice;
  };

  // Dynamically compute estimated costs based on actual pantry prices if matches
  const calculateEstimatedCost = () => {
    return recipe.ingredients.reduce((total, ing) => {
      let scaled = ing.amount;
      if (ing.scaleType === "linear") {
        scaled = ing.amount * multiplier;
      } else if (ing.scaleType === "sub_linear") {
        scaled = ing.amount * Math.sqrt(multiplier);
      } else if (ing.scaleType === "fixed") {
        scaled = ing.amount;
      }

      const pricePerUnit = getIngredientUnitPrice(ing.name, ing.unitPrice || 0.02);
      return total + (scaled * pricePerUnit);
    }, 0);
  };

  const totalCost = calculateEstimatedCost();
  const costPerServing = totalCost / portions;

  const handleToggleFav = async () => {
    try {
      if (isFavorited) {
        await api.removeFavorite(recipe.id);
        setIsFavorited(false);
      } else {
        await api.addFavorite(recipe.id);
        setIsFavorited(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 按食材的真实 groupName 动态分组，保留创建/导入时设置的分组信息
  const GROUP_ORDER = ["主料", "腌料", "配料", "调料", "固定用量"];

  type IngGroup = { groupName: string; items: typeof recipe.ingredients };
  const ingredientGroups = (() => {
    const groups: IngGroup[] = [];
    const seen = new Set<string>();
    // 按预设顺序优先
    for (const g of GROUP_ORDER) {
      const items = recipe.ingredients.filter(i => (i.groupName || "主料") === g);
      if (items.length > 0) { groups.push({ groupName: g, items }); seen.add(g); }
    }
    // 其余未知分组追加在后
    for (const ing of recipe.ingredients) {
      const g = ing.groupName || "主料";
      if (!seen.has(g)) {
        groups.push({ groupName: g, items: recipe.ingredients.filter(i => (i.groupName || "主料") === g) });
        seen.add(g);
      }
    }
    return groups;
  })();

  // 每个分组的强调色
  const groupDotColor = (g: string) => {
    if (g === "主料") return "bg-[#ab3500]";
    if (g === "腌料") return "bg-amber-500";
    if (g === "配料") return "bg-amber-400";
    if (g === "调料") return "bg-[#ab3500]";
    if (g === "固定用量") return "bg-gray-400";
    return "bg-gray-400";
  };

  // 是否完整：必须有至少 1 个用料和 1 个步骤；否则进入 SOP 前提示
  const isIncomplete = recipe.ingredients.length === 0 || recipe.steps.length === 0;

  return (
    <div className="flex flex-col min-h-full pb-36">
      {/* Top Banner Cover Photo */}
      <section className="relative w-full h-[320px] overflow-hidden">
        <img
          src={recipe.coverImageUrl}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20" />
        
        {/* Navigation Buttons */}
        <div className="absolute top-4 left-0 w-full px-4 flex justify-between z-10">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-full shadow-md text-gray-800 active:scale-95 transition-transform"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-full shadow-md active:scale-95 transition-transform"
              aria-label={t('share.shareRecipe')}
            >
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => { setMealPlanServings(portions); setShowMealPlanPicker(true); }}
              className="w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-full shadow-md active:scale-95 transition-transform"
              aria-label={t('detail.addToMealPlan', '加入餐单')}
            >
              <CalendarPlus className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleToggleFav}
              className="w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-full shadow-md active:scale-95 transition-transform"
              aria-label="Favorite"
            >
              <Heart className={`w-5 h-5 transition-colors ${isFavorited ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
            </button>
            {canManage && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu((s) => !s)}
                  className="w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-full shadow-md text-gray-800 active:scale-95 transition-transform"
                  aria-label="More"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20">
                      {onEditRecipe && me?.id === recipe.author?.id && (
                        <button
                          onClick={() => { setShowMenu(false); onEditRecipe(recipe.id); }}
                          className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {t('detail.menu.edit')}
                        </button>
                      )}
                      <button
                        onClick={() => { setShowMenu(false); handleDeleteRecipe(); }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-xs text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('detail.menu.delete')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Rounded content sheet matches Image 1 */}
      <div className="relative -mt-6 px-4 bg-[#fcf9f8] rounded-t-3xl pt-6 z-10 flex-1 flex flex-col">
        <header className="mb-6">
          <h2 className="font-display font-bold text-2xl text-gray-900 leading-tight mb-2.5">
            {recipe.title}
          </h2>
          
          {/* Metadata Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 bg-gray-100 px-3.5 py-1 rounded-full text-xs font-bold text-gray-600">
              <Clock className="w-3.5 h-3.5" />
              {recipe.cookTime || "30-60min"}
            </span>
            <span className="inline-flex items-center gap-1 bg-gray-100 px-3.5 py-1 rounded-full text-xs font-bold text-gray-600">
              <Utensils className="w-3.5 h-3.5 text-orange-500" />
              {recipe.difficulty === "easy" ? t('common.difficultyLabel.easy') : recipe.difficulty === "medium" ? t('common.difficultyLabel.medium') : t('common.difficultyLabel.hard')}
            </span>
            <span className="inline-flex items-center gap-1 bg-gray-100 px-3.5 py-1 rounded-full text-xs font-bold text-gray-600">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              {recipe.ratingAvg || "4.8"}
            </span>
          </div>
        </header>

        {/* Portion Stepper Box with Base Indicators */}
        <section className="mb-6 bg-white p-4 rounded-2xl shadow-tactile border border-gray-100/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm text-gray-800">{t('detail.portions.title')}</h3>
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-full p-1 leading-none">
              <button
                onClick={() => portions > 1 && setPortions(portions - 1)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#ab3500] hover:bg-gray-100 active:scale-90 transition-all"
                aria-label="Decrease portions"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-bold text-[#ab3500]">
                {t('detail.portions.display', { count: portions })}
              </span>
              <button
                onClick={() => setPortions(portions + 1)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#ab3500] hover:bg-gray-100 active:scale-90 transition-all"
                aria-label="Increase portions"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 text-center">
            基准: {recipe.baseServings}份 → 当前: <span className="text-[#ab3500] font-bold">{portions}份 ({multiplier.toFixed(1)}x)</span>
          </p>
        </section>

        {/* Dynamic Metric Conversion tabs */}
        <nav className="flex items-center gap-6 mb-5 px-1 border-b border-gray-200/60 pb-1 flex-nowrap overflow-x-auto no-scrollbar">
          <button
            onClick={() => setUnitMode("g_ml")}
            className={`font-display font-bold text-xs pb-1 transition-all relative ${
              unitMode === "g_ml" ? "text-[#ab3500] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#ab3500]" : "text-gray-400"
            }`}
          >
            {t('detail.units.gml')}
          </button>
          <button
            onClick={() => setUnitMode("jin_liang")}
            className={`font-display font-bold text-xs pb-1 transition-all relative ${
              unitMode === "jin_liang" ? "text-[#ab3500] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#ab3500]" : "text-gray-400"
            }`}
          >
            {t('detail.units.jinliang')}
          </button>
          <button
            onClick={() => setUnitMode("oz_lb")}
            className={`font-display font-bold text-xs pb-1 transition-all relative ${
              unitMode === "oz_lb" ? "text-[#ab3500] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#ab3500]" : "text-gray-400"
            }`}
          >
            oz/lb
          </button>

          {recipe.ingredients.some(i => i.scaleType === "sub_linear") && (
            <div className="ml-auto flex items-center gap-1 bg-[#ff6b35]/14 px-2 py-0.5 rounded-full text-[9px] font-bold text-[#ab3500]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ab3500]" />
              {t('detail.units.nonLinearHint')}
            </div>
          )}
        </nav>

        {/* Cooking Ingredients breakdown matches Image 1 & 6 */}
        <section className="mb-6 space-y-5">
          {ingredientGroups.map(({ groupName, items }) => {
            const isFixed = groupName === "固定用量";
            return (
              <div key={groupName}>
                <div className="flex items-center gap-1.5 mb-3">
                  <span className={`w-1 h-3.5 rounded-full ${groupDotColor(groupName)}`} />
                  <h3 className="font-display font-bold text-sm text-gray-800">{groupName}</h3>
                </div>
                <div className={`space-y-2 ${isFixed ? "opacity-90" : ""}`}>
                  {items.map((ing) => {
                    const subLinear = ing.scaleType === "sub_linear";
                    return (
                      <div
                        key={ing.id}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          isFixed
                            ? "bg-gray-100/60 border-gray-200"
                            : "bg-white shadow-tactile border-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isFixed ? "text-gray-600" : "text-gray-700"}`}>
                            {ing.name}
                          </span>
                          {subLinear && (
                            <span className="bg-[#ffdbd0] text-[#832600] text-[9px] px-1.5 py-0.5 rounded font-bold">
                              {t('detail.groups.subLinear')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <span>{ing.amount}{ing.unit}</span>
                          <MoveRight className="w-3.5 h-3.5 text-gray-300" />
                          {isFixed ? (
                            <div className="flex items-center gap-1 bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[9px] font-bold">
                              <span>{ing.amount}{ing.unit}</span>
                              <span>{t('detail.groups.fixedLabel')}</span>
                            </div>
                          ) : (
                            <span className="font-bold text-sm text-[#ab3500]">
                              {formatScaledValue(ing.amount, ing.unit, ing.scaleType)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* Dynamic Estimated Cost Card matches image 1 & 6 */}
        <section className="mb-6">
          <div className="bg-gray-100/80 p-4 rounded-2xl flex items-center justify-between border border-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#c4efa3] flex items-center justify-center text-[#0a2100]">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider">{t('detail.cost.title')}</p>
                <h3 className="text-base font-bold text-gray-800">
                  本次预估: ¥{totalCost.toFixed(2)}
                </h3>
                {portions > 1 && (
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    单网/碗成本: <span className="text-[#2c4f15] font-bold">¥{costPerServing.toFixed(2)}</span>
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </section>

        {/* Steps expandable quick view */}
        <section className="mb-6">
          <button
            onClick={() => setShowStepsDropdown(!showStepsDropdown)}
            className="w-full py-2 flex items-center justify-center gap-1 text-xs font-bold text-[#ab3500] hover:opacity-80 transition-opacity"
          >
            <span>{showStepsDropdown ? t('detail.steps.hide') : t('detail.steps.show')}</span>
            {showStepsDropdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showStepsDropdown && (
            <div className="mt-3 bg-white border border-gray-100 rounded-xl p-4 space-y-3.5 shadow-tactile">
              {recipe.steps.map((st) => (
                <div key={st.id} className="flex gap-3 text-xs">
                  <span className="flex-none w-5 h-5 rounded-full bg-[#ff6b35]/10 text-[#ab3500] flex items-center justify-center font-bold">
                    {st.stepNumber}
                  </span>
                  <p className="text-gray-600 leading-relaxed flex-1">{st.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Bottom Floating Bar */}
      <footer className="fixed bottom-0 left-0 w-full z-40 bg-white border-t border-gray-100 shadow-md">
        <div className="px-4 py-4 flex flex-col gap-2">
          {isIncomplete && (
            <div className="flex items-start gap-2 text-[11px] font-bold p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
              <span>⚠️</span>
              <span>
                {t('detail.incomplete.warning')}（{recipe.ingredients.length === 0 ? t('detail.incomplete.noIngredients') : ""}
                {recipe.ingredients.length === 0 && recipe.steps.length === 0 ? " / " : ""}
                {recipe.steps.length === 0 ? t('detail.incomplete.noSteps') : ""}），
                {canManage ? t('detail.incomplete.canEdit') : t('detail.incomplete.cannotCook')}
              </span>
            </div>
          )}
          <button
            onClick={() => {
              if (isIncomplete) {
                if (canManage && onEditRecipe) {
                  if (confirm(t('detail.incomplete.confirmEdit'))) onEditRecipe(recipe.id);
                } else {
                  alert(t('detail.incomplete.alertIncomplete'));
                }
                return;
              }
              onStartCooking(recipe.id, portions);
            }}
            disabled={isIncomplete && !canManage}
            className={`w-full h-12 rounded-full font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-sm leading-none border-t border-white/10 ${
              isIncomplete
                ? "bg-gray-300 text-white hover:bg-gray-400"
                : "bg-[#4aad4e] hover:bg-[#006e1c] text-white"
            }`}
          >
            <Play className="w-4 h-4 fill-current text-white/94" />
            {isIncomplete ? (canManage ? t('detail.cooking.goComplete') : t('detail.cooking.incomplete')) : t('detail.cooking.start')}
          </button>
        </div>
      </footer>

      {/* Share Poster Modal */}
      {showShareModal && recipe && (
        <SharePosterModal recipe={recipe} onClose={() => setShowShareModal(false)} />
      )}

      {/* Meal Plan Picker Modal */}
      {showMealPlanPicker && recipe && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-md p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">{t('detail.addToMealPlan', '加入餐单')}</h3>
              <button onClick={() => setShowMealPlanPicker(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {/* Date */}
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">{t('detail.mealPlanDate', '日期')}</label>
              <input
                type="date"
                value={mealPlanDate}
                onChange={(e) => setMealPlanDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:border-[#ff6b35] outline-none"
              />
            </div>
            {/* Meal type */}
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">{t('detail.mealPlanMeal', '餐次')}</label>
              <div className="flex gap-2">
                {(["breakfast", "lunch", "dinner"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMealPlanMeal(m)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                      mealPlanMeal === m
                        ? "bg-[#ff6b35] text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {t(`mealPlan.meals.${m}`)}
                  </button>
                ))}
              </div>
            </div>
            {/* Servings */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">{t('detail.mealPlanServings', '份数')}</label>
              <div className="flex items-center gap-3 justify-center">
                <button onClick={() => setMealPlanServings((s) => Math.max(1, s - 1))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-bold text-[#ab3500] w-10 text-center">{mealPlanServings}</span>
                <button onClick={() => setMealPlanServings((s) => s + 1)} className="w-8 h-8 rounded-full bg-[#ff6b35] text-white flex items-center justify-center hover:bg-[#e55a2b]">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Submit */}
            <button
              onClick={async () => {
                setAddingToMealPlan(true);
                try {
                  await api.createMealPlan({
                    planDate: mealPlanDate,
                    mealType: mealPlanMeal,
                    recipeId: recipe.id,
                    servings: mealPlanServings,
                  });
                  setShowMealPlanPicker(false);
                  alert(t('detail.mealPlanAdded', '已加入餐单'));
                } catch (err: any) {
                  alert(err?.message || t('detail.mealPlanAddFailed', '添加失败'));
                } finally {
                  setAddingToMealPlan(false);
                }
              }}
              disabled={addingToMealPlan}
              className="w-full py-3 bg-gradient-to-r from-[#ff6b35] to-[#ff8f35] text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {addingToMealPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {t('detail.mealPlanConfirm', '确认加入')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
