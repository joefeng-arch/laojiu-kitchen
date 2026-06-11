import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Trash2, CheckSquare, Square, BookOpen } from "lucide-react";
import { Recipe, UserProfile } from "../types";
import { api } from "../api";

interface Props {
  onBack: () => void;
  onSelectRecipe: (id: string) => void;
}

/**
 * "我的菜谱" 管理页：
 * - 列出当前用户创建的所有菜谱（authorId = me.id）
 * - 支持批量勾选 + 一键删除
 */
export default function MyRecipesView({ onBack, onSelectRecipe }: Props) {
  const { t } = useTranslation();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [manageMode, setManageMode] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    try {
      const profile = await api.getProfile();
      setMe(profile);
      const list = await api.getRecipes({ authorId: profile.id, pageSize: 100 });
      setRecipes(list);
    } catch (e: any) {
      alert(e?.message ?? t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === recipes.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(recipes.map((r) => r.id)));
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('myRecipes.confirmDelete', { count: selectedIds.size }))) return;
    try {
      const ids = Array.from(selectedIds) as string[];
      const res = await api.batchDeleteRecipes(ids);
      alert(t('myRecipes.deleteResult', { count: res.deleted }));
      setSelectedIds(new Set());
      setManageMode(false);
      init();
    } catch (e: any) {
      alert(e?.message ?? t('common.deleteFailed'));
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#fcf9f8]">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-700">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-bold">{t('myRecipes.title')}</span>
        </button>
        <div className="flex items-center gap-3">
          {manageMode ? (
            <>
              <button onClick={selectAll} className="text-xs text-gray-500 hover:text-[#ab3500]">
                {selectedIds.size === recipes.length && recipes.length > 0 ? t('myRecipes.deselectAll') : t('myRecipes.selectAll')}
              </button>
              <button
                onClick={handleDelete}
                disabled={selectedIds.size === 0}
                className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${
                  selectedIds.size === 0 ? "text-gray-300" : "text-red-600 hover:bg-red-50"
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {selectedIds.size > 0 ? t('myRecipes.deleteCount', { count: selectedIds.size }) : t('common.delete')}
              </button>
              <button
                onClick={() => {
                  setManageMode(false);
                  setSelectedIds(new Set());
                }}
                className="text-xs text-gray-500"
              >
                {t('common.cancel')}
              </button>
            </>
          ) : (
            <button onClick={() => setManageMode(true)} className="text-xs text-[#ab3500] font-bold">
              {t('myRecipes.manage')}
            </button>
          )}
        </div>
      </header>

      <main className="px-4 py-4">
        {loading ? (
          <p className="text-center text-gray-400 mt-12 text-sm">{t('common.loading')}</p>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-center text-gray-400">
            <BookOpen className="w-12 h-12 mb-3 stroke-1 text-gray-300" />
            <p className="text-sm font-medium">{t('myRecipes.empty.title')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('myRecipes.empty.subtitle')}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {recipes.map((r) => {
              const checked = selectedIds.has(r.id);
              return (
                <li
                  key={r.id}
                  onClick={() => {
                    if (manageMode) toggle(r.id);
                    else onSelectRecipe(r.id);
                  }}
                  className={`bg-white rounded-xl border p-3 flex items-center gap-3 cursor-pointer transition-all ${
                    checked ? "border-[#ab3500] ring-1 ring-[#ab3500]/30" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  {manageMode && (
                    <div>
                      {checked ? (
                        <CheckSquare className="w-5 h-5 text-[#ab3500]" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  )}
                  {r.coverImageUrl ? (
                    <img src={r.coverImageUrl} className="w-14 h-14 rounded-lg object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{r.title}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.categories?.slice(0, 4).map((c) => (
                        <span key={c.id} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          {c.name}
                        </span>
                      ))}
                      {(!r.categories || r.categories.length === 0) && (
                        <span className="text-[10px] text-gray-400">{t('common.uncategorized')}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {r.isPublic ? t('myRecipes.status.published') : t('myRecipes.status.draft')} · {r.cookTime}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
