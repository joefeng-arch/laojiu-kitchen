import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, Flame, Heart, Clock, Award } from "lucide-react";
import { Recipe, Category } from "../types";
import { api } from "../api";

interface DiscoverViewProps {
  onSelectRecipe: (id: string) => void;
}

type DiscoverFilter = { kind: "all" } | { kind: "featured" } | { kind: "category"; id: number };

export default function DiscoverView({ onSelectRecipe }: DiscoverViewProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DiscoverFilter>({ kind: "all" });
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  const savedScrollY = React.useRef(
    parseInt(sessionStorage.getItem("discoverScrollY") ?? "0")
  );

  useEffect(() => {
    sessionStorage.removeItem("discoverScrollY");
    // 离开时保存
    return () => {
      const el = document.querySelector("[data-scroll-container]");
      if (el) sessionStorage.setItem("discoverScrollY", String(el.scrollTop));
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cats = await api.getCategories("recipe");
        setCategories(cats);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    loadPublicRecipes();
    loadFavorites();
  }, [filter, search]);

  const loadPublicRecipes = async () => {
    try {
      const res = await api.getRecipes({
        isPublic: true,
        keyword: search || undefined,
        categoryId: filter.kind === "category" ? filter.id : undefined,
        isFeatured: filter.kind === "featured" ? true : undefined,
        pageSize: 50,
      });
      setRecipes(res);
      // 首次加载完成后恢复滚动位置
      if (savedScrollY.current > 0) {
        requestAnimationFrame(() => {
          const el = document.querySelector("[data-scroll-container]");
          if (el) el.scrollTop = savedScrollY.current;
          savedScrollY.current = 0;
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadFavorites = async () => {
    try {
      const favs = await api.getFavorites();
      setFavorites(favs.map((f) => f.recipe.id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    const isFav = favorites.includes(recipeId);
    try {
      if (isFav) {
        await api.removeFavorite(recipeId);
        setFavorites(favorites.filter((id) => id !== recipeId));
      } else {
        await api.addFavorite(recipeId);
        setFavorites([...favorites, recipeId]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-24">
      {/* Top Heading Banner */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-[#ff6b35] to-[#FF7F50] px-4 pt-16 pb-4 rounded-b-2xl shadow-md text-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display font-bold text-2xl tracking-tight">{t('discover.title')}</h1>
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            className="w-full h-11 pl-12 pr-4 rounded-full border-none focus:ring-2 focus:ring-[#ab3500] text-xs text-gray-800 focus:outline-none shadow-inner bg-white/94"
            placeholder={t('discover.search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
          />
        </div>
      </header>

      {/* Category tabs */}
      <nav className="sticky top-[138px] z-30 bg-[#fcf9f8]/95 backdrop-blur-md py-2 border-b border-gray-100 overflow-hidden">
        <div
          className="flex px-4 gap-2 items-center"
          style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <button
            onClick={() => setFilter({ kind: "all" })}
            className={`whitespace-nowrap shrink-0 text-xs font-bold py-1.5 px-3 rounded-full transition-all ${
              filter.kind === "all"
                ? "bg-[#ab3500] text-white"
                : "bg-white text-gray-500 border border-gray-100"
            }`}
          >
            {t('common.all')}
          </button>
          <button
            onClick={() => setFilter({ kind: "featured" })}
            className={`whitespace-nowrap shrink-0 text-xs font-bold py-1.5 px-3 rounded-full transition-all flex items-center gap-1 ${
              filter.kind === "featured"
                ? "bg-[#ab3500] text-white"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            <Award className="w-3 h-3" />
            老舅推荐
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter({ kind: "category", id: cat.id })}
              className={`whitespace-nowrap shrink-0 text-xs font-bold py-1.5 px-3 rounded-full transition-all ${
                filter.kind === "category" && filter.id === cat.id
                  ? "bg-[#ab3500] text-white"
                  : "bg-white text-gray-500 border border-gray-100"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </nav>

      {/* Grid Content Feed */}
      <main className="px-4 mt-4 flex-1">
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
            <Flame className="w-12 h-12 mb-3 stroke-1 text-gray-300" />
            <p className="text-sm font-medium">{t('discover.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 items-start">
            {recipes.map((recipe, idx) => {
              const isFav = favorites.includes(recipe.id);
              const isTall = idx % 3 === 0;
              return (
                <div
                  key={recipe.id}
                  onClick={() => onSelectRecipe(recipe.id)}
                  className="bg-white rounded-2xl overflow-hidden shadow-tactile hover:shadow-tactile-hover transition-all duration-200 flex flex-col group border border-gray-50/50 cursor-pointer"
                >
                  <div className={`relative ${isTall ? "aspect-[3/4]" : "aspect-[3/2]"} overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50`}>
                    {recipe.coverImageUrl ? (
                      <img
                        src={recipe.coverImageUrl}
                        alt={recipe.title}
                        className="w-full h-full object-cover rounded-t-2xl group-hover:scale-103 transition-transform duration-300"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl opacity-20">🍳</span>
                      </div>
                    )}
                    {recipe.isFeatured && (
                      <span className="absolute top-2.5 left-2.5 bg-[#ab3500] text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                        <Award className="w-2.5 h-2.5" />
                        {t('discover.featured')}
                      </span>
                    )}
                    <span className="absolute bottom-2 left-2 bg-black/45 backdrop-blur-md text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                      {recipe.cookTime || "30min"}
                    </span>
                  </div>

                  <div className="p-3 flex flex-col gap-2">
                    <h3 className="font-display text-xs font-bold text-gray-800 line-clamp-2 leading-tight">
                      {recipe.title}
                    </h3>

                    <div className="flex flex-col gap-1.5">
                      {recipe.author && (
                        <div className="flex items-center gap-1.5">
                          {recipe.author.avatarUrl ? (
                            <img
                              src={recipe.author.avatarUrl}
                              alt={recipe.author.nickname}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200" />
                          )}
                          <span className="text-[10px] text-gray-500 font-bold truncate flex-1">
                            {recipe.author.nickname}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-gray-400 text-[9px] font-bold border-t border-gray-50 pt-2">
                        <button
                          onClick={(e) => handleToggleFavorite(e, recipe.id)}
                          className={`flex items-center gap-0.5 hover:text-red-500 transition-colors ${
                            isFav ? "text-red-500" : ""
                          }`}
                          aria-label={t('discover.favorite')}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-current" : ""}`} />
                          <span>{recipe.favoriteCount ?? 0}</span>
                        </button>
                        <span className="text-[#ab3500] font-bold">
                          {recipe.estimatedCost ? `约¥${recipe.estimatedCost.toFixed(0)}` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
