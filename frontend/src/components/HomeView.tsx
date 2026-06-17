import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Search, Flame, Heart, Compass, Timer, User, Plus, Trash2, X, CheckSquare, Square, ShoppingCart, CalendarDays, Sparkles, PenLine } from "lucide-react";
import { Recipe, Category } from "../types";
import { api } from "../api";

interface HomeViewProps {
  onSelectRecipe: (id: string) => void;
  onNavigate: (view: string) => void;
  onAddRecipe: () => void;
  onImportRecipe?: () => void;
  initialTab?: "mine" | "favorites";
}

type HomeTab = "mine" | "favorites";

export default function HomeView({ onSelectRecipe, onNavigate, onAddRecipe, onImportRecipe, initialTab }: HomeViewProps) {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [homeTab, setHomeTab] = useState<HomeTab>(initialTab ?? "mine");
  const [userId, setUserId] = useState<string | null>(null);

  // 批量管理模式
  const [manageMode, setManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // FAB 菜单
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const fabMenuRef = useRef<HTMLDivElement>(null);

  // 外部指定的 tab 变化时同步（如从个人页「我的收藏」跳转过来）
  useEffect(() => {
    setHomeTab(initialTab ?? "mine");
  }, [initialTab]);

  // 点击 FAB 菜单外部关闭
  useEffect(() => {
    if (!fabMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (fabMenuRef.current && !fabMenuRef.current.contains(e.target as Node)) {
        setFabMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [fabMenuOpen]);

  useEffect(() => {
    loadCategories();
    (async () => {
      try {
        const profile = await api.getProfile();
        setUserId(profile.id);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    loadRecipes();
    loadFavorites();
  }, [selectedCategoryId, search, homeTab, userId]);

  const loadCategories = async () => {
    try {
      const cats = await api.getCategories("recipe");
      setCategories(cats);
    } catch (e) {
      console.error("Error loading categories", e);
    }
  };

  const loadRecipes = async () => {
    try {
      if (homeTab === "favorites") {
        // 收藏 tab — 展示收藏的菜谱
        const favs = await api.getFavorites();
        const favRecipes = favs.map((f: any) => f.recipe).filter(Boolean);
        setRecipes(favRecipes);
      } else {
        // 我创建的 — 必须有 userId 才能过滤，否则会先闪出全量公开菜谱
        if (!userId) {
          setRecipes([]);
          return;
        }
        const res = await api.getRecipes({
          keyword: search || undefined,
          categoryId: selectedCategoryId ?? undefined,
          authorId: userId,
          pageSize: 50,
        });
        setRecipes(res);
      }
    } catch (e) {
      console.error("Error loading recipes", e);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitManage = () => {
    setManageMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('home.manage.confirmDelete', { count: selectedIds.size }))) return;
    try {
      const ids = Array.from(selectedIds) as string[];
      const res = await api.batchDeleteRecipes(ids);
      const skipped = ids.length - res.deleted;
      alert(skipped > 0
        ? t('home.manage.deleteResultPartial', { deleted: res.deleted, skipped })
        : t('home.manage.deleteResult', { deleted: res.deleted }));
      exitManage();
      loadRecipes();
    } catch (e: any) {
      alert(e?.message ?? t('common.deleteFailed'));
    }
  };

  const loadFavorites = async () => {
    try {
      const favs = await api.getFavorites();
      setFavorites(favs.map(f => f.recipe.id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    const isFav = favorites.includes(recipeId);
    // 乐观更新收藏数
    setRecipes((prev) => prev.map((r) => r.id === recipeId
      ? { ...r, favoriteCount: Math.max(0, (r.favoriteCount ?? 0) + (isFav ? -1 : 1)) }
      : r));
    try {
      if (isFav) {
        await api.removeFavorite(recipeId);
        setFavorites(favorites.filter(id => id !== recipeId));
      } else {
        await api.addFavorite(recipeId);
        setFavorites([...favorites, recipeId]);
      }
    } catch (err) {
      console.error(err);
      // 失败回滚
      setRecipes((prev) => prev.map((r) => r.id === recipeId
        ? { ...r, favoriteCount: Math.max(0, (r.favoriteCount ?? 0) + (isFav ? 1 : -1)) }
        : r));
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-20">
      {/* Top Header */}
      <header className="fixed top-0 left-0 w-full z-40 bg-white border-b border-gray-100 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-lg font-bold text-[#ab3500]">老舅厨房</h1>
        </div>
        <div className="flex items-center gap-3">
          {manageMode ? (
            <>
              <span className="text-xs text-gray-500">{t('home.manage.selected', { count: selectedIds.size })}</span>
              <button
                onClick={handleBatchDelete}
                disabled={selectedIds.size === 0}
                className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${
                  selectedIds.size === 0 ? "text-gray-300" : "text-red-600 hover:bg-red-50"
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {t('common.delete')}
              </button>
              <button onClick={exitManage} className="text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setManageMode(true)}
                className="text-xs text-gray-500 hover:text-[#ab3500] font-medium"
                title={t('home.manage.title')}
              >
                {t('home.manage.button')}
              </button>
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#ff6b35] cursor-pointer" onClick={() => onNavigate("profile")}>
                <img
                  alt="Profile avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAk4vUtysfDeQCBZ39Xh8PQzRQmAQW16noukCpUnXqgniXA31BvPT6HHdsBJaBNSQLDC2749ULF5mKhYJ_B1M27cJdPtjOKb3hVNDdApBVXXbTqfbKXyWtVvt0z5AUEDecRwMTsqBrmCALafha4leu8nwcpW3xSq5AL01OhD3kiuxf4RWMX6T_LxRRvvzJSwi-nw8yReDv6a9j9q1fUC91sYdlhvPR-8wa5lin5zWkqpoPXrLBlY77EzoDFwzy4U5U4bW14-bBMnSct"
                  className="w-full h-full object-cover"
                />
              </div>
            </>
          )}
        </div>
      </header>

      {/* Hero card section with warm gradient matching mockup */}
      <section className="bg-gradient-to-br from-[#ff6b35] to-[#FF7F50] px-4 pt-20 pb-8 rounded-b-[28px] text-white">
        <div className="flex flex-col gap-1 mb-4">
          <h2 className="font-display font-bold text-2xl tracking-tight">{t('home.hero.greeting')}</h2>
          <p className="text-sm opacity-90">{t('home.hero.subtitle')}</p>
        </div>
        {/* Search Input bar */}
        <div className="relative mt-2">
          <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            className="w-full h-11 pl-12 pr-4 bg-white rounded-full border-none shadow-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ab3500] text-sm transition-all"
            placeholder={t('home.search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
          />
        </div>
      </section>

      {/* Home tab: 我创建的 / 我收藏的 */}
      <section className="mt-4 px-4">
        <div className="flex bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setHomeTab("mine")}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
              homeTab === "mine" ? "bg-white text-[#ab3500] shadow-sm" : "text-gray-500"
            }`}
          >
            {t('home.tabs.mine')}
          </button>
          <button
            onClick={() => setHomeTab("favorites")}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
              homeTab === "favorites" ? "bg-white text-[#ab3500] shadow-sm" : "text-gray-500"
            }`}
          >
            {t('home.tabs.favorites')}
          </button>
        </div>
      </section>

      {/* Quick category chips — 从后端读取真实分类 */}
      {homeTab === "mine" && <section className="mt-3 min-w-0 overflow-hidden">
        <div className="flex overflow-x-auto no-scrollbar px-4 gap-2 py-1">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`flex-none px-5 py-2 text-xs font-bold rounded-full transition-all duration-150 ${
              selectedCategoryId === null
                ? "bg-[#ab3500] text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50"
            }`}
          >
            {t('common.all')}
          </button>
          {categories.map((cat) => {
            const active = selectedCategoryId === cat.id;
            const isMine = !!cat.ownerId;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`flex-none px-5 py-2 text-xs font-bold rounded-full transition-all duration-150 ${
                  active
                    ? "bg-[#ab3500] text-white shadow-sm"
                    : isMine
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50"
                }`}
                title={isMine ? t('home.category.myCategory') : t('home.category.systemCategory')}
              >
                {isMine && "★ "}{cat.name}
              </button>
            );
          })}
        </div>
      </section>}

      {/* Grid of beautiful recipe cards matching mockup precisely */}
      <section className="px-4 mt-5 flex-1">
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
            <Flame className="w-12 h-12 mb-3 stroke-1 text-gray-300" />
            <p className="text-sm font-medium">{t('home.empty.title')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('home.empty.subtitle')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 items-start">
            {recipes.map((recipe) => {
              const isFav = favorites.includes(recipe.id);
              const isSelected = selectedIds.has(recipe.id);
              const handleCardClick = () => {
                if (manageMode) toggleSelect(recipe.id);
                else onSelectRecipe(recipe.id);
              };
              return (
                <div
                  key={recipe.id}
                  onClick={handleCardClick}
                  className={`relative bg-white rounded-2xl overflow-hidden shadow-tactile hover:shadow-tactile-hover transition-all duration-200 cursor-pointer flex flex-col group border ${
                    isSelected ? "border-[#ab3500] ring-2 ring-[#ab3500]/30" : "border-gray-50"
                  }`}
                  id={`recipe-card-${recipe.id}`}
                >
                  {manageMode && (
                    <div className="absolute top-2 right-2 z-10 bg-white rounded-full shadow">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[#ab3500]" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  )}
                  <div className="relative aspect-[3/2] overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50">
                    {recipe.coverImageUrl ? (
                      <img
                        src={recipe.coverImageUrl}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl opacity-20">🍳</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      <span className="bg-black/45 backdrop-blur-md text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                        {recipe.cookTime || "30min"}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 flex flex-col gap-2">
                    <h3 className="font-display text-sm font-bold text-gray-800 line-clamp-1">
                      {recipe.title}
                    </h3>
                    {recipe.categories && recipe.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {recipe.categories.slice(0, 3).map((c) => (
                          <span key={c.id} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#ab3500]">
                        {recipe.estimatedCost ? `约¥${recipe.estimatedCost.toFixed(0)}` : "—"}
                      </span>
                      {!manageMode && (
                        <button
                          onClick={(e) => handleToggleFavorite(e, recipe.id)}
                          className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                            isFav ? "bg-red-50 text-red-500" : "text-gray-400 hover:text-[#ab3500]"
                          }`}
                          aria-label="Toggle Favorite"
                        >
                          <Heart className="w-4 h-4 fill-current" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating Action Buttons */}
      <button
        onClick={() => onNavigate("meal-plan")}
        className="fixed right-6 bottom-[13.5rem] w-11 h-11 bg-white hover:bg-orange-50 text-[#ab3500] rounded-full shadow-lg hover:shadow-xl flex items-center justify-center active:scale-95 duration-150 z-40 transition-all border border-[#ff6b35]/30"
        aria-label={t('mealPlan.title', '本周餐单')}
      >
        <CalendarDays className="w-5 h-5" />
      </button>
      <button
        onClick={() => onNavigate("shopping-list")}
        className="fixed right-6 bottom-[10.5rem] w-11 h-11 bg-white hover:bg-orange-50 text-[#ab3500] rounded-full shadow-lg hover:shadow-xl flex items-center justify-center active:scale-95 duration-150 z-40 transition-all border border-[#ff6b35]/30"
        aria-label={t('shoppingList.title', '采购清单')}
      >
        <ShoppingCart className="w-5 h-5" />
      </button>
      {/* FAB with expandable menu */}
      <div ref={fabMenuRef} className="fixed right-6 bottom-24 z-40 flex flex-col items-end gap-2">
        {/* FAB submenu items */}
        {fabMenuOpen && (
          <div className="flex flex-col items-end gap-2 mb-2">
            {onImportRecipe && (
              <button
                onClick={() => { setFabMenuOpen(false); onImportRecipe(); }}
                className="flex items-center gap-2 bg-white text-[#ab3500] text-sm font-bold px-4 py-2.5 rounded-full shadow-lg border border-orange-100 hover:bg-orange-50 active:scale-95 transition-all whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                {t("home.fab.aiImport")}
              </button>
            )}
            <button
              onClick={() => { setFabMenuOpen(false); onAddRecipe(); }}
              className="flex items-center gap-2 bg-white text-gray-700 text-sm font-bold px-4 py-2.5 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all whitespace-nowrap"
            >
              <PenLine className="w-4 h-4" />
              {t("home.fab.manual")}
            </button>
          </div>
        )}
        {/* Main FAB */}
        <button
          onClick={() => setFabMenuOpen(!fabMenuOpen)}
          className={`w-14 h-14 bg-[#ab3500] hover:bg-[#ff6b35] text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center duration-150 transition-all border-2 border-white/20 ${fabMenuOpen ? "rotate-45" : "active:scale-95"}`}
          aria-label="Add Recipe"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}
