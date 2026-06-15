import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  LayoutDashboard, Users, BookOpen, LogOut, ChefHat, Plus,
  Loader2, RefreshCw, Trash2, Star, Eye, EyeOff, Edit3,
  ChevronLeft, ChevronRight, Search, Crown, X, Upload,
  Ban, CheckCircle, Calendar, Package, Tags, ArrowUpDown,
  Heart, BarChart3, Clock, Filter, Check, AlertCircle,
} from "lucide-react";
import { adminApi, adminTokenStore, AdminInfo, api, ParsedRecipe } from "../api";

type Tab = "dashboard" | "users" | "recipes" | "create-recipe" | "ingredients" | "categories";

interface AdminDashboardViewProps {
  admin: AdminInfo;
  onLogout: () => void;
}

// ── Helpers ──────────────────────────────────────────────────
function absUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const origin = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://localhost:3001";
  return `${origin}${url}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABELS: Record<string, string> = { published: "已发布", draft: "草稿", archived: "已下架" };
const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-600",
  archived: "bg-red-100 text-red-600",
};
const DIFFICULTY_LABELS: Record<string, string> = { easy: "简单", medium: "中等", hard: "困难" };
const CATEGORY_TYPE_LABELS: Record<string, string> = { recipe: "菜谱分类", ingredient: "食材分类", meal_scene: "用餐场景" };

// ── Main Component ──────────────────────────────────────────
export default function AdminDashboardView({ admin, onLogout }: AdminDashboardViewProps) {
  const [tab, setTab] = useState<Tab>("dashboard");

  const handleLogout = () => { adminTokenStore.clear(); onLogout(); };

  const navItems: { key: Tab; label: string; icon: any }[] = [
    { key: "dashboard", label: "仪表盘", icon: LayoutDashboard },
    { key: "recipes", label: "菜谱管理", icon: BookOpen },
    { key: "create-recipe", label: "发布官方菜谱", icon: Plus },
    { key: "users", label: "用户管理", icon: Users },
    { key: "ingredients", label: "食材库管理", icon: Package },
    { key: "categories", label: "分类管理", icon: Tags },
  ];

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <ChefHat className="w-6 h-6 text-orange-400" />
            <div>
              <h1 className="text-sm font-bold">老舅厨房</h1>
              <p className="text-[10px] text-gray-500">管理后台</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === key
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-orange-400">
                {admin.nickname?.[0] ?? admin.username[0]}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-300 truncate">{admin.nickname ?? admin.username}</p>
              <p className="text-[9px] text-gray-500">{admin.role === "super_admin" ? "超级管理员" : "管理员"}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-1.5 text-[10px] text-gray-500 hover:text-red-400 transition-colors py-1.5 rounded-lg hover:bg-gray-800">
            <LogOut className="w-3 h-3" />
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "recipes" && <RecipesTab onCreateClick={() => setTab("create-recipe")} />}
        {tab === "create-recipe" && <CreateRecipeTab onDone={() => setTab("recipes")} />}
        {tab === "users" && <UsersTab />}
        {tab === "ingredients" && <IngredientsTab />}
        {tab === "categories" && <CategoriesTab />}
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Dashboard Tab
// ═════════════════════════════════════════════════════════════
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.stats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <ErrorBlock message="无法加载统计数据" />;

  const cards = [
    { label: "总用户", value: stats.users.total, sub: `今日新增 ${stats.users.newToday}`, color: "bg-blue-500", icon: Users },
    { label: "总菜谱", value: stats.recipes.total, sub: `已发布 ${stats.recipes.published}`, color: "bg-green-500", icon: BookOpen },
    { label: "草稿菜谱", value: stats.recipes.draft, sub: `今日新增 ${stats.recipes.newToday}`, color: "bg-amber-500", icon: Edit3 },
    { label: "烹饪记录", value: stats.cooking.totalLogs, sub: `今日 ${stats.cooking.newToday}`, color: "bg-purple-500", icon: ChefHat },
    { label: "公共食材", value: stats.ingredients.total, sub: "食材库总数", color: "bg-cyan-500", icon: Package },
    { label: "系统分类", value: stats.categories.total, sub: "分类总数", color: "bg-pink-500", icon: Tags },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-5">仪表盘</h2>
      <div className="grid grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${c.color} rounded-lg flex items-center justify-center`}>
                <c.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{c.value}</span>
            </div>
            <p className="text-sm font-semibold text-gray-700">{c.label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Recipes Tab
// ═════════════════════════════════════════════════════════════
function RecipesTab({ onCreateClick }: { onCreateClick: () => void }) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const loadRecipes = useCallback(async (p = page, kw = keyword, st = statusFilter, ft = featuredFilter) => {
    setLoading(true);
    try {
      const res = await adminApi.listRecipes({
        page: p, pageSize: 20, keyword: kw || undefined,
        status: st || undefined, isFeatured: ft || undefined,
      });
      setRecipes(res.items);
      setTotal(res.total);
      setSelected(new Set());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRecipes(1, "", "", ""); }, []);

  const changeStatus = async (id: string, status: "draft" | "published" | "archived") => {
    try { await adminApi.setRecipeStatus(id, status); loadRecipes(); } catch (e: any) { alert(e?.message ?? "操作失败"); }
  };
  const toggleFeatured = async (id: string, current: boolean) => {
    try { await adminApi.setFeatured(id, !current); loadRecipes(); } catch (e: any) { alert(e?.message ?? "操作失败"); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此菜谱？此操作不可恢复！")) return;
    try { await adminApi.deleteRecipe(id); loadRecipes(); } catch (e: any) { alert(e?.message ?? "删除失败"); }
  };

  const handleBatchArchive = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定批量下架 ${selected.size} 个菜谱？`)) return;
    try { await adminApi.batchArchive([...selected]); loadRecipes(); } catch (e: any) { alert(e?.message ?? "操作失败"); }
  };
  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定批量删除 ${selected.size} 个菜谱？此操作不可恢复！`)) return;
    try { await adminApi.batchDelete([...selected]); loadRecipes(); } catch (e: any) { alert(e?.message ?? "操作失败"); }
  };

  const toggleSelectAll = () => {
    if (selected.size === recipes.length) setSelected(new Set());
    else setSelected(new Set(recipes.map(r => r.id)));
  };
  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const totalPages = Math.ceil(total / 20);
  const statuses = [
    { value: "", label: "全部" }, { value: "published", label: "已发布" },
    { value: "draft", label: "草稿" }, { value: "archived", label: "已下架" },
  ];

  return (
    <div>
      {/* Detail / Edit Modal */}
      {detailId && <RecipeDetailModal id={detailId} onClose={() => setDetailId(null)} onEdit={(id) => { setDetailId(null); setEditId(id); }} />}
      {editId && <RecipeEditModal id={editId} onClose={() => setEditId(null)} onSaved={() => { setEditId(null); loadRecipes(); }} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">菜谱管理</h2>
        <button onClick={onCreateClick} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors">
          <Plus className="w-3.5 h-3.5" /> 发布官方菜谱
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {statuses.map((s) => (
          <button key={s.value} onClick={() => { setStatusFilter(s.value); setPage(1); loadRecipes(1, keyword, s.value, featuredFilter); }}
            className={`px-3 py-1 text-[10px] font-semibold rounded-full transition-colors ${statusFilter === s.value ? "bg-orange-500 text-white" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>
            {s.label}
          </button>
        ))}
        <span className="text-gray-300">|</span>
        {[{ value: "", label: "全部推荐" }, { value: "true", label: "已推荐" }, { value: "false", label: "未推荐" }].map((f) => (
          <button key={f.value} onClick={() => { setFeaturedFilter(f.value); setPage(1); loadRecipes(1, keyword, statusFilter, f.value); }}
            className={`px-3 py-1 text-[10px] font-semibold rounded-full transition-colors ${featuredFilter === f.value ? "bg-amber-500 text-white" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>
            {f.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadRecipes(1, keyword, statusFilter, featuredFilter)}
            placeholder="搜索菜谱…" className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 w-48" />
        </div>
        <button onClick={() => loadRecipes(1, keyword, statusFilter, featuredFilter)} className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {/* Batch actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 px-4 py-2 bg-orange-50 rounded-lg border border-orange-200">
          <span className="text-xs text-orange-700 font-semibold">已选 {selected.size} 项</span>
          <button onClick={handleBatchArchive} className="px-2.5 py-1 text-[10px] bg-amber-500 text-white rounded font-semibold hover:bg-amber-600">批量下架</button>
          <button onClick={handleBatchDelete} className="px-2.5 py-1 text-[10px] bg-red-500 text-white rounded font-semibold hover:bg-red-600">批量删除</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-[10px] text-gray-500 hover:text-gray-700">取消选择</button>
        </div>
      )}

      {/* Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="w-8 px-3 py-3"><input type="checkbox" checked={selected.size === recipes.length && recipes.length > 0} onChange={toggleSelectAll} className="rounded" /></th>
                <th className="text-left px-3 py-3 font-semibold">菜谱</th>
                <th className="text-left px-3 py-3 font-semibold">作者</th>
                <th className="text-left px-3 py-3 font-semibold">状态</th>
                <th className="text-center px-3 py-3 font-semibold"><Eye className="w-3 h-3 inline" /> 浏览</th>
                <th className="text-center px-3 py-3 font-semibold"><Heart className="w-3 h-3 inline" /> 收藏</th>
                <th className="text-left px-3 py-3 font-semibold">创建时间</th>
                <th className="text-right px-3 py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recipes.map((r) => (
                <tr key={r.id} className={`hover:bg-gray-50/50 ${selected.has(r.id) ? "bg-orange-50/30" : ""}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="rounded" /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setDetailId(r.id)}>
                      {r.coverImage ? <img src={absUrl(r.coverImage)} className="w-9 h-9 rounded-lg object-cover" /> : <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center"><BookOpen className="w-4 h-4 text-gray-300" /></div>}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate max-w-[180px] hover:text-orange-600">{r.title}</p>
                        {r.isFeatured && <span className="text-[9px] text-amber-600 font-bold">★ 官方推荐</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{r.author?.nickname ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-500">{r.viewCount ?? 0}</td>
                  <td className="px-3 py-2.5 text-center text-gray-500">{r.favoriteCount ?? 0}</td>
                  <td className="px-3 py-2.5 text-gray-500">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconBtn icon={Eye} title="查看详情" onClick={() => setDetailId(r.id)} />
                      <IconBtn icon={Edit3} title="编辑" onClick={() => setEditId(r.id)} color="blue" />
                      {r.status !== "published" && <IconBtn icon={CheckCircle} title="发布" onClick={() => changeStatus(r.id, "published")} color="green" />}
                      {r.status === "published" && <IconBtn icon={EyeOff} title="下架" onClick={() => changeStatus(r.id, "archived")} color="amber" />}
                      <IconBtn icon={Star} title={r.isFeatured ? "取消推荐" : "设为推荐"} onClick={() => toggleFeatured(r.id, !!r.isFeatured)} color="amber" active={!!r.isFeatured} />
                      <IconBtn icon={Trash2} title="删除" onClick={() => handleDelete(r.id)} color="red" />
                    </div>
                  </td>
                </tr>
              ))}
              {recipes.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">暂无菜谱</td></tr>}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => { setPage(p); loadRecipes(p, keyword, statusFilter, featuredFilter); }} />
        </div>
      )}
    </div>
  );
}

// ── Recipe Detail Modal ─────────────────────────────────────
function RecipeDetailModal({ id, onClose, onEdit }: { id: string; onClose: () => void; onEdit: (id: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getRecipeDetail(id).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {loading || !data ? <div className="p-10"><LoadingSpinner /></div> : (
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{data.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[data.status]}`}>{STATUS_LABELS[data.status]}</span>
                  {data.isFeatured && <span className="text-[10px] text-amber-600 font-bold">★ 推荐</span>}
                  <span className="text-[10px] text-gray-400">难度: {DIFFICULTY_LABELS[data.difficulty] ?? data.difficulty}</span>
                  {data.totalMinutes && <span className="text-[10px] text-gray-400">{data.totalMinutes}分钟</span>}
                  <span className="text-[10px] text-gray-400">{data.baseServings}人份</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(id)} className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600">编辑</button>
                <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
            </div>

            {data.coverImage && <img src={absUrl(data.coverImage)} className="w-full h-48 object-cover rounded-xl mb-4" />}
            {data.description && <p className="text-sm text-gray-600 mb-4">{data.description}</p>}

            {data.author && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <span className="text-[10px] text-gray-400">作者:</span>
                <span className="text-xs font-semibold">{data.author.nickname}</span>
              </div>
            )}

            {/* Categories */}
            {data.categories?.length > 0 && (
              <div className="flex gap-1.5 mb-4 flex-wrap">
                {data.categories.map((c: any) => (
                  <span key={c.id} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full">{c.name}</span>
                ))}
              </div>
            )}

            {/* Ingredients */}
            <h4 className="text-sm font-bold text-gray-700 mb-2">用料 ({data.ingredients?.length ?? 0})</h4>
            <div className="grid grid-cols-2 gap-1 mb-4">
              {data.ingredients?.map((ing: any, i: number) => (
                <div key={i} className="flex justify-between px-3 py-1.5 bg-gray-50 rounded text-xs">
                  <span className="text-gray-700">{ing.ingredientName ?? ing.customName ?? "未命名"}</span>
                  <span className="text-gray-500">{ing.amount} {ing.unit}</span>
                </div>
              ))}
            </div>

            {/* Steps */}
            <h4 className="text-sm font-bold text-gray-700 mb-2">步骤 ({data.steps?.length ?? 0})</h4>
            <div className="space-y-3">
              {data.steps?.map((step: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center shrink-0">{step.stepNumber}</div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-700">{step.description}</p>
                    {step.imageUrl && <img src={absUrl(step.imageUrl)} className="w-32 h-20 rounded-lg object-cover mt-2" />}
                    {step.durationSeconds && <span className="text-[10px] text-gray-400">⏱ {Math.round(step.durationSeconds / 60)}分钟</span>}
                    {step.tips && <p className="text-[10px] text-amber-600 mt-1">💡 {step.tips}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Recipe Edit Modal ───────────────────────────────────────
function RecipeEditModal({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    adminApi.getRecipeDetail(id).then((d) => {
      setData(d);
      setForm({
        title: d.title, description: d.description ?? "", difficulty: d.difficulty,
        baseServings: d.baseServings, totalMinutes: d.totalMinutes ?? "",
        status: d.status, isFeatured: d.isFeatured, isPublic: d.isPublic,
        tags: (d.tags ?? []).join(", "),
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateRecipe(id, {
        title: form.title, description: form.description || undefined,
        difficulty: form.difficulty, baseServings: Number(form.baseServings),
        totalMinutes: form.totalMinutes ? Number(form.totalMinutes) : undefined,
        status: form.status, isFeatured: form.isFeatured, isPublic: form.isPublic,
        tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      });
      onSaved();
    } catch (e: any) { alert(e?.message ?? "保存失败"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {loading ? <div className="p-10"><LoadingSpinner /></div> : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">编辑菜谱</h3>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <FormField label="标题"><input className="form-input" value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormField>
              <FormField label="描述"><textarea className="form-input" rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="难度">
                  <select className="form-input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                    <option value="easy">简单</option><option value="medium">中等</option><option value="hard">困难</option>
                  </select>
                </FormField>
                <FormField label="基础份数"><input type="number" className="form-input" value={form.baseServings} onChange={(e) => setForm({ ...form, baseServings: e.target.value })} /></FormField>
                <FormField label="总时间(分)"><input type="number" className="form-input" value={form.totalMinutes} onChange={(e) => setForm({ ...form, totalMinutes: e.target.value })} /></FormField>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="状态">
                  <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="draft">草稿</option><option value="published">已发布</option><option value="archived">已下架</option>
                  </select>
                </FormField>
                <FormField label="公开"><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} /></FormField>
                <FormField label="推荐"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /></FormField>
              </div>
              <FormField label="标签（逗号分隔）"><input className="form-input" value={form.tags ?? ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></FormField>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={onClose} className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Create Official Recipe Tab  (手动创建 + AI 智能导入)
// ═════════════════════════════════════════════════════════════

type EditableRecipe = {
  title: string; description: string; difficulty: string;
  totalMinutes: number; baseServings: number; tags: string;
  ingredients: Array<{ name: string; amount: number; unit: string; groupName: string; scaleType: string }>;
  steps: Array<{ stepNumber: number; description: string; durationSeconds: number }>;
};

function parsedToEditable(p: ParsedRecipe): EditableRecipe {
  return {
    title: p.title, description: p.description || "",
    difficulty: p.difficulty || "medium",
    totalMinutes: p.totalMinutes ?? 30, baseServings: p.baseServings ?? 2, tags: "",
    ingredients: p.ingredients.map(i => ({ name: i.name, amount: i.amount, unit: i.unit, groupName: i.groupName || "主料", scaleType: i.scaleType || "linear" })),
    steps: p.steps.map(s => ({ stepNumber: s.stepNumber, description: s.description, durationSeconds: s.durationSeconds ?? 0 })),
  };
}

function editableToDto(r: EditableRecipe) {
  return {
    title: r.title, description: r.description || undefined,
    difficulty: r.difficulty as "easy" | "medium" | "hard",
    baseServings: r.baseServings, totalMinutes: r.totalMinutes || undefined,
    tags: r.tags ? r.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    ingredients: r.ingredients.filter(i => i.name.trim()).map((i, idx) => ({ customName: i.name, amount: String(i.amount), unit: i.unit, scaleType: i.scaleType, groupName: i.groupName, sort: idx })),
    steps: r.steps.filter(s => s.description.trim()).map((s, idx) => ({ stepNumber: idx + 1, description: s.description, durationSeconds: s.durationSeconds || undefined })),
  };
}

function CreateRecipeTab({ onDone }: { onDone: () => void }) {
  const [subTab, setSubTab] = useState<"manual" | "ai">("manual");

  // ── Manual form state ────────────────────────────────────
  const [form, setForm] = useState({ title: "", description: "", coverImage: "", difficulty: "medium" as string, baseServings: 2, totalMinutes: 30, tags: "" });
  const [ingredients, setIngredients] = useState<any[]>([{ customName: "", amount: "", unit: "g", scaleType: "linear", groupName: "主料" }]);
  const [steps, setSteps] = useState<any[]>([{ stepNumber: 1, description: "", tips: "" }]);
  const [saving, setSaving] = useState(false);
  const [skipCheck, setSkipCheck] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  // ── AI import state ──────────────────────────────────────
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<"input" | "result" | "batch">("input");
  const [aiResult, setAiResult] = useState<EditableRecipe | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchResults, setBatchResults] = useState<EditableRecipe[]>([]);
  const [batchProgress, setBatchProgress] = useState("");
  const [batchPublishing, setBatchPublishing] = useState(false);

  // ── Manual form handlers ─────────────────────────────────
  const addIngredient = () => setIngredients([...ingredients, { customName: "", amount: "", unit: "g", scaleType: "linear", groupName: "主料" }]);
  const removeIngredient = (i: number) => setIngredients(ingredients.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, f: string, v: any) => { const n = [...ingredients]; n[i] = { ...n[i], [f]: v }; setIngredients(n); };

  const addStep = () => setSteps([...steps, { stepNumber: steps.length + 1, description: "", tips: "" }]);
  const removeStep = (i: number) => { const n = steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, stepNumber: idx + 1 })); setSteps(n); };
  const updateStep = (i: number, f: string, v: any) => { const n = [...steps]; n[i] = { ...n[i], [f]: v }; setSteps(n); };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const url = await adminApi.uploadImage(file);
      // 用函数式更新避免 stale closure 覆盖其他字段
      setForm(prev => ({ ...prev, coverImage: url }));
    } catch (err: any) {
      alert(`封面图上传失败：${err?.message ?? "未知错误"}\n\n如显示 Unauthorized，请确认后端服务已重启。`);
    } finally {
      setCoverUploading(false);
      e.target.value = ""; // 允许重复上传同一文件
    }
  };

  const handleManualSubmit = async () => {
    if (!form.title.trim()) return alert("请输入菜谱标题");
    if (ingredients.every(i => !i.customName.trim())) return alert("请至少添加一种食材");
    if (steps.every(s => !s.description.trim())) return alert("请至少添加一个步骤");
    if (!skipCheck) {
      try {
        const check = await api.checkTextContent([form.title, form.description].filter(Boolean).join("\n"));
        if (!check.safe) { alert('内容包含违规信息，请修改后重新发布。如确认无误可勾选「跳过内容检查」后重试。'); return; }
      } catch (e: any) { console.warn("内容安全检查异常，已跳过：", e?.message); }
    }
    setSaving(true);
    try {
      await adminApi.createOfficialRecipe({
        title: form.title, description: form.description || undefined,
        coverImage: form.coverImage || undefined, difficulty: form.difficulty as any,
        baseServings: form.baseServings, totalMinutes: form.totalMinutes || undefined,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        ingredients: ingredients.filter(i => i.customName.trim()).map((i, idx) => ({ customName: i.customName, amount: String(i.amount), unit: i.unit, scaleType: i.scaleType, groupName: i.groupName, sort: idx })),
        steps: steps.filter(s => s.description.trim()).map((s, idx) => ({ stepNumber: idx + 1, description: s.description, tips: s.tips || undefined })),
      });
      alert("发布成功！"); onDone();
    } catch (e: any) { alert(e?.message ?? "发布失败"); }
    finally { setSaving(false); }
  };

  // ── AI import handlers ───────────────────────────────────
  const handlePaste = async () => {
    try { const t = await navigator.clipboard.readText(); setAiText(t); } catch { /* ignore */ }
  };

  const handleAnalyze = async () => {
    const text = aiText.trim();
    if (text.length < 20) { setAiError("内容太少，请粘贴完整的菜谱文本（至少20字）"); return; }
    setAiError(null);
    setAiLoading(true);

    if (batchMode) {
      // 批量模式：按 --- 或 === 分割
      const chunks = text.split(/^\s*[-=]{3,}\s*$/m).map(s => s.trim()).filter(s => s.length >= 20);
      if (chunks.length === 0) { setAiError("未找到可分割的菜谱块，请用 --- 分隔多道菜谱"); setAiLoading(false); return; }
      const results: EditableRecipe[] = [];
      for (let i = 0; i < chunks.length; i++) {
        setBatchProgress(`正在解析第 ${i + 1} / ${chunks.length} 道…`);
        try { const r = await adminApi.parseRecipeText(chunks[i]); results.push(parsedToEditable(r.recipe)); } catch { /* skip failed */ }
        if (i < chunks.length - 1) await new Promise(res => setTimeout(res, 400));
      }
      setBatchResults(results);
      setAiLoading(false);
      setAiMode("batch");
      setBatchProgress("");
      return;
    }

    // 单道菜谱
    try {
      const r = await adminApi.parseRecipeText(text);
      setAiResult(parsedToEditable(r.recipe));
      setAiMode("result");
    } catch (e: any) {
      setAiError(e?.message || "AI 解析失败，请重试");
    } finally {
      setAiLoading(false);
    }
  };

  const updateAiIngredient = (i: number, f: keyof EditableRecipe["ingredients"][0], v: any) => {
    if (!aiResult) return;
    const ings = [...aiResult.ingredients]; ings[i] = { ...ings[i], [f]: v };
    setAiResult({ ...aiResult, ingredients: ings });
  };
  const removeAiIngredient = (i: number) => {
    if (!aiResult) return;
    setAiResult({ ...aiResult, ingredients: aiResult.ingredients.filter((_, idx) => idx !== i) });
  };
  const updateAiStep = (i: number, f: keyof EditableRecipe["steps"][0], v: any) => {
    if (!aiResult) return;
    const ss = [...aiResult.steps]; ss[i] = { ...ss[i], [f]: v };
    setAiResult({ ...aiResult, steps: ss });
  };
  const removeAiStep = (i: number) => {
    if (!aiResult) return;
    const ss = aiResult.steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setAiResult({ ...aiResult, steps: ss });
  };

  const fillManualForm = (recipe: EditableRecipe) => {
    setForm({ title: recipe.title, description: recipe.description, coverImage: "", difficulty: recipe.difficulty, baseServings: recipe.baseServings, totalMinutes: recipe.totalMinutes, tags: recipe.tags });
    setIngredients(recipe.ingredients.map(i => ({ customName: i.name, amount: i.amount, unit: i.unit, scaleType: i.scaleType, groupName: i.groupName })));
    setSteps(recipe.steps.map((s, idx) => ({ stepNumber: idx + 1, description: s.description, tips: "" })));
    setSubTab("manual");
  };

  const publishRecipe = async (recipe: EditableRecipe): Promise<boolean> => {
    try { await adminApi.createOfficialRecipe(editableToDto(recipe)); return true; }
    catch (e: any) { alert(`发布失败：${e?.message ?? "未知错误"}`); return false; }
  };

  const handlePublishFromAi = async () => {
    if (!aiResult) return;
    setSaving(true);
    try { if (await publishRecipe(aiResult)) { alert("发布成功！"); onDone(); } }
    finally { setSaving(false); }
  };

  const handleBatchPublishAll = async () => {
    if (!batchResults.length) return;
    setBatchPublishing(true);
    let ok = 0;
    for (let i = 0; i < batchResults.length; i++) {
      setBatchProgress(`正在发布第 ${i + 1} / ${batchResults.length} 道…`);
      if (await publishRecipe(batchResults[i])) ok++;
      if (i < batchResults.length - 1) await new Promise(res => setTimeout(res, 200));
    }
    setBatchPublishing(false); setBatchProgress("");
    alert(`批量发布完成：成功 ${ok} 道，失败 ${batchResults.length - ok} 道`);
    if (ok > 0) onDone();
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-800">发布官方菜谱</h2>
        <span className="text-[10px] text-gray-400">作者: 老舅官方 · 自动公开+推荐</span>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-5 w-fit">
        <button onClick={() => setSubTab("manual")} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${subTab === "manual" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          手动创建
        </button>
        <button onClick={() => setSubTab("ai")} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${subTab === "ai" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <span>✨</span> AI 智能导入
        </button>
      </div>

      {/* ── Manual Tab ─────────────────────────────────── */}
      {subTab === "manual" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="菜谱标题 *" className="col-span-2">
              <input className="form-input" placeholder="如：红烧肉" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </FormField>
            <FormField label="描述" className="col-span-2">
              <textarea className="form-input" rows={2} placeholder="简要描述菜品特点…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
            <FormField label="封面图" className="col-span-2">
              <div className="flex items-center gap-3">
                {/* 预览区 */}
                {form.coverImage ? (
                  <div className="relative group">
                    <img src={form.coverImage} className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, coverImage: "" }))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >×</button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                    <Upload className="w-6 h-6" />
                  </div>
                )}
                {/* 上传按钮 */}
                <div className="flex flex-col gap-1.5">
                  <label className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer inline-flex items-center gap-1.5 transition-colors ${coverUploading ? "bg-orange-100 text-orange-400 pointer-events-none" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {coverUploading
                      ? <><Loader2 className="w-3 h-3 animate-spin" />上传中…</>
                      : <><Upload className="w-3 h-3" />{form.coverImage ? "重新上传" : "选择图片"}</>
                    }
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={coverUploading} />
                  </label>
                  {form.coverImage && <span className="text-[10px] text-green-600 font-medium">✓ 已上传</span>}
                  <span className="text-[10px] text-gray-400">支持 JPG/PNG/WebP，5MB 以内</span>
                </div>
              </div>
            </FormField>
            <FormField label="难度">
              <select className="form-input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                <option value="easy">简单</option><option value="medium">中等</option><option value="hard">困难</option>
              </select>
            </FormField>
            <FormField label="基础份数">
              <input type="number" min={1} className="form-input" value={form.baseServings} onChange={(e) => setForm({ ...form, baseServings: Number(e.target.value) })} />
            </FormField>
            <FormField label="总时间(分)">
              <input type="number" className="form-input" value={form.totalMinutes} onChange={(e) => setForm({ ...form, totalMinutes: Number(e.target.value) })} />
            </FormField>
            <FormField label="标签（逗号分隔）" className="col-span-2">
              <input className="form-input" placeholder="如：家常菜,下饭" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </FormField>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-gray-700">用料</h4>
              <button onClick={addIngredient} className="text-[10px] text-orange-500 hover:text-orange-600 font-semibold">+ 添加食材</button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input style={{width:"auto",flex:"2 1 0%",minWidth:120}} className="form-input" placeholder="食材名称" value={ing.customName} onChange={(e) => updateIngredient(i, "customName", e.target.value)} />
                  <input style={{width:64,flexShrink:0}} className="form-input" placeholder="用量" value={ing.amount} onChange={(e) => updateIngredient(i, "amount", e.target.value)} />
                  <input style={{width:56,flexShrink:0}} className="form-input" placeholder="单位" value={ing.unit} onChange={(e) => updateIngredient(i, "unit", e.target.value)} />
                  <select style={{width:72,flexShrink:0}} className="form-input" value={ing.groupName} onChange={(e) => updateIngredient(i, "groupName", e.target.value)}>
                    <option value="主料">主料</option><option value="腌料">腌料</option><option value="配料">配料</option><option value="调料">调料</option>
                  </select>
                  <select style={{width:80,flexShrink:0}} className="form-input" value={ing.scaleType} onChange={(e) => updateIngredient(i, "scaleType", e.target.value)}>
                    <option value="linear">等比</option><option value="sub_linear">亚线性</option><option value="fixed">固定</option>
                  </select>
                  {ingredients.length > 1 && <button onClick={() => removeIngredient(i)} className="text-gray-300 hover:text-red-500" style={{flexShrink:0}}><X className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-gray-700">步骤</h4>
              <button onClick={addStep} className="text-[10px] text-orange-500 hover:text-orange-600 font-semibold">+ 添加步骤</button>
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center shrink-0 mt-1">{i + 1}</div>
                  <div className="flex-1 space-y-1">
                    <textarea className="form-input" rows={2} placeholder={`步骤 ${i + 1} 描述…`} value={step.description} onChange={(e) => updateStep(i, "description", e.target.value)} />
                    <input className="form-input" placeholder="小贴士（可选）" value={step.tips} onChange={(e) => updateStep(i, "tips", e.target.value)} />
                  </div>
                  {steps.length > 1 && <button onClick={() => removeStep(i)} className="text-gray-300 hover:text-red-500 mt-1"><X className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 select-none">
              <input type="checkbox" checked={skipCheck} onChange={(e) => setSkipCheck(e.target.checked)} className="w-3.5 h-3.5 rounded accent-orange-500" />
              <span>跳过内容安全检查（管理员专用）</span>
            </label>
            <div className="flex gap-3">
              <button onClick={onDone} className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700">取消</button>
              <button onClick={handleManualSubmit} disabled={saving} className="px-6 py-2 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-semibold">
                {saving ? "发布中…" : "发布菜谱"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Tab ─────────────────────────────────────── */}
      {subTab === "ai" && (
        <div className="space-y-4">
          {/* Input panel */}
          {(aiMode === "input" || aiLoading) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-700">粘贴菜谱原文</h4>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                    <input type="checkbox" checked={batchMode} onChange={(e) => setBatchMode(e.target.checked)} className="w-3 h-3 rounded accent-orange-500" />
                    批量模式（用 --- 分隔多道菜）
                  </label>
                  <button onClick={handlePaste} className="flex items-center gap-1.5 text-xs text-orange-500 border border-orange-200 hover:bg-orange-50 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                    📋 粘贴
                  </button>
                </div>
              </div>

              <textarea
                rows={12}
                className="form-input resize-y"
                placeholder={batchMode
                  ? "粘贴多道菜谱文本，用 --- 分隔每道菜：\n\n红烧肉\n食材：...\n步骤：...\n\n---\n\n糖醋里脊\n食材：...\n步骤：..."
                  : "粘贴从小红书、抖音、下厨房等平台复制的菜谱文本..."}
                value={aiText}
                onChange={(e) => { setAiText(e.target.value); setAiError(null); }}
                disabled={aiLoading}
              />

              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span>{aiText.length} / 5000 字符</span>
                {batchMode && aiText.length > 0 && (
                  <span>预计 {aiText.split(/^\s*[-=]{3,}\s*$/m).filter(s => s.trim().length >= 20).length} 道菜谱</span>
                )}
              </div>

              {aiError && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{aiError}</div>}

              <button
                onClick={handleAnalyze}
                disabled={aiLoading || aiText.trim().length === 0}
                className="w-full h-10 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {aiLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />{batchProgress || "AI 正在分析菜谱…"}</>
                  : <><span>✨</span> 开始识别{batchMode ? `（批量）` : ""}</>
                }
              </button>
            </div>
          )}

          {/* Single result preview */}
          {aiMode === "result" && aiResult && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-700">✅ 识别结果（可直接编辑）</h4>
                <button onClick={() => { setAiMode("input"); setAiResult(null); }} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1 rounded-lg">重新识别</button>
              </div>

              {/* Basic fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">标题</label>
                  <input className="form-input" value={aiResult.title} onChange={(e) => setAiResult({ ...aiResult, title: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">描述</label>
                  <textarea className="form-input" rows={2} value={aiResult.description} onChange={(e) => setAiResult({ ...aiResult, description: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">难度</label>
                  <select className="form-input" value={aiResult.difficulty} onChange={(e) => setAiResult({ ...aiResult, difficulty: e.target.value })}>
                    <option value="easy">简单</option><option value="medium">中等</option><option value="hard">困难</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">总时间(分)</label>
                  <input type="number" className="form-input" value={aiResult.totalMinutes} onChange={(e) => setAiResult({ ...aiResult, totalMinutes: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">基础份数</label>
                  <input type="number" min={1} className="form-input" value={aiResult.baseServings} onChange={(e) => setAiResult({ ...aiResult, baseServings: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">标签（逗号分隔）</label>
                  <input className="form-input" placeholder="家常菜,下饭" value={aiResult.tags} onChange={(e) => setAiResult({ ...aiResult, tags: e.target.value })} />
                </div>
              </div>

              {/* Ingredients table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold text-gray-600">食材（{aiResult.ingredients.length}）</h5>
                  <button onClick={() => setAiResult({ ...aiResult, ingredients: [...aiResult.ingredients, { name: "", amount: 0, unit: "g", groupName: "主料", scaleType: "linear" }] })} className="text-[10px] text-orange-500 font-semibold">+ 添加</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-gray-100 text-gray-400">
                      <th className="text-left pb-1.5 font-semibold">名称</th>
                      <th className="text-left pb-1.5 font-semibold w-16">用量</th>
                      <th className="text-left pb-1.5 font-semibold w-14">单位</th>
                      <th className="text-left pb-1.5 font-semibold w-16">分组</th>
                      <th className="text-left pb-1.5 font-semibold w-20">缩放</th>
                      <th className="w-6"></th>
                    </tr></thead>
                    <tbody className="space-y-1">
                      {aiResult.ingredients.map((ing, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-1 pr-2"><input className="form-input text-xs py-1" value={ing.name} onChange={(e) => updateAiIngredient(i, "name", e.target.value)} /></td>
                          <td className="py-1 pr-2"><input type="number" className="form-input text-xs py-1 w-16" value={ing.amount} onChange={(e) => updateAiIngredient(i, "amount", Number(e.target.value))} /></td>
                          <td className="py-1 pr-2"><input className="form-input text-xs py-1 w-14" value={ing.unit} onChange={(e) => updateAiIngredient(i, "unit", e.target.value)} /></td>
                          <td className="py-1 pr-2">
                            <select className="form-input text-xs py-1 w-16" value={ing.groupName} onChange={(e) => updateAiIngredient(i, "groupName", e.target.value)}>
                              <option value="主料">主料</option><option value="腌料">腌料</option><option value="配料">配料</option><option value="调料">调料</option>
                            </select>
                          </td>
                          <td className="py-1 pr-2">
                            <select className="form-input text-xs py-1 w-20" value={ing.scaleType} onChange={(e) => updateAiIngredient(i, "scaleType", e.target.value)}>
                              <option value="linear">等比</option><option value="sub_linear">亚线性</option><option value="fixed">固定</option>
                            </select>
                          </td>
                          <td className="py-1"><button onClick={() => removeAiIngredient(i)} className="text-gray-200 hover:text-red-400"><X className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Steps list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold text-gray-600">步骤（{aiResult.steps.length}）</h5>
                  <button onClick={() => setAiResult({ ...aiResult, steps: [...aiResult.steps, { stepNumber: aiResult.steps.length + 1, description: "", durationSeconds: 0 }] })} className="text-[10px] text-orange-500 font-semibold">+ 添加</button>
                </div>
                <div className="space-y-2">
                  {aiResult.steps.map((step, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center shrink-0 mt-1">{i + 1}</span>
                      <textarea className="form-input flex-1 text-xs" rows={2} value={step.description} onChange={(e) => updateAiStep(i, "description", e.target.value)} placeholder={`步骤 ${i + 1}…`} />
                      <div className="flex flex-col gap-1 items-end">
                        <label className="text-[9px] text-gray-400">计时(秒)</label>
                        <input type="number" className="form-input text-xs py-1 w-20" value={step.durationSeconds || ""} placeholder="0" onChange={(e) => updateAiStep(i, "durationSeconds", Number(e.target.value))} />
                      </div>
                      {aiResult.steps.length > 1 && <button onClick={() => removeAiStep(i)} className="text-gray-200 hover:text-red-400 mt-1"><X className="w-3.5 h-3.5" /></button>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => fillManualForm(aiResult)} className="px-4 py-2 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-semibold">
                  填入手动表单继续编辑
                </button>
                <div className="flex-1" />
                <button onClick={onDone} className="px-4 py-2 text-xs text-gray-400 hover:text-gray-600">取消</button>
                <button onClick={handlePublishFromAi} disabled={saving} className="px-6 py-2 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-semibold">
                  {saving ? "发布中…" : "确认并发布为官方菜谱"}
                </button>
              </div>
            </div>
          )}

          {/* Batch results */}
          {aiMode === "batch" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-700">批量识别结果（共 {batchResults.length} 道）</h4>
                <button onClick={() => { setAiMode("input"); setBatchResults([]); }} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1 rounded-lg">重新识别</button>
              </div>
              {batchResults.map((recipe, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{recipe.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{recipe.ingredients.length} 种食材 · {recipe.steps.length} 个步骤 · {recipe.totalMinutes}分钟</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { setAiResult(recipe); setAiMode("result"); }} className="text-[10px] border border-gray-200 text-gray-500 px-2.5 py-1 rounded-lg hover:bg-gray-50">编辑</button>
                      <button
                        onClick={async () => {
                          if (await publishRecipe(recipe)) {
                            setBatchResults(prev => prev.filter((_, i) => i !== idx));
                            if (batchResults.length === 1) onDone();
                          }
                        }}
                        className="text-[10px] bg-orange-500 text-white px-2.5 py-1 rounded-lg hover:bg-orange-600"
                      >
                        发布
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 flex flex-wrap gap-1">
                    {recipe.ingredients.slice(0, 8).map((ing, i) => (
                      <span key={i} className="bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">{ing.name} {ing.amount > 0 ? `${ing.amount}${ing.unit}` : "适量"}</span>
                    ))}
                    {recipe.ingredients.length > 8 && <span className="text-gray-300">+{recipe.ingredients.length - 8} 种</span>}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-400">{batchProgress}</p>
                <div className="flex gap-3">
                  <button onClick={onDone} className="px-4 py-2 text-xs text-gray-400 hover:text-gray-600">取消</button>
                  <button onClick={handleBatchPublishAll} disabled={batchPublishing || batchResults.length === 0} className="px-6 py-2 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-semibold">
                    {batchPublishing ? batchProgress || "发布中…" : `全部发布（${batchResults.length} 道）`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Users Tab
// ═════════════════════════════════════════════════════════════
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  const loadUsers = useCallback(async (p = page, kw = keyword) => {
    setLoading(true);
    try {
      const res = await adminApi.listUsers({
        page: p, pageSize: 20, keyword: kw || undefined,
        role: roleFilter || undefined, status: statusFilter || undefined,
      });
      setUsers(res.items);
      setTotal(res.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [roleFilter, statusFilter]);

  useEffect(() => { loadUsers(1); }, [roleFilter, statusFilter]);

  const toggleBan = async (id: string, currentStatus: string) => {
    const next = currentStatus === "banned" ? "active" : "banned";
    if (!confirm(`确定${next === "banned" ? "封禁" : "解封"}此用户？`)) return;
    try { await adminApi.setUserStatus(id, next as any); loadUsers(); } catch (e: any) { alert(e?.message ?? "操作失败"); }
  };

  const handleSetVip = async (id: string, months: number | null) => {
    const vipExpiresAt = months ? new Date(Date.now() + months * 30 * 86400000).toISOString() : null;
    try { await adminApi.setVip(id, vipExpiresAt); loadUsers(); } catch (e: any) { alert(e?.message ?? "操作失败"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此用户？此操作不可恢复！")) return;
    try { await adminApi.deleteUser(id); loadUsers(); } catch (e: any) { alert(e?.message ?? "删除失败"); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {detailId && <UserDetailModal id={detailId} onClose={() => setDetailId(null)} />}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">用户管理</h2>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[{ value: "", label: "全部角色" }, { value: "user", label: "普通用户" }, { value: "vip", label: "VIP" }].map((f) => (
          <button key={f.value} onClick={() => { setRoleFilter(f.value); setPage(1); }}
            className={`px-3 py-1 text-[10px] font-semibold rounded-full transition-colors ${roleFilter === f.value ? "bg-orange-500 text-white" : "bg-white text-gray-500 border border-gray-200"}`}>
            {f.label}
          </button>
        ))}
        <span className="text-gray-300">|</span>
        {[{ value: "", label: "全部状态" }, { value: "active", label: "正常" }, { value: "banned", label: "已封禁" }].map((f) => (
          <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={`px-3 py-1 text-[10px] font-semibold rounded-full transition-colors ${statusFilter === f.value ? "bg-orange-500 text-white" : "bg-white text-gray-500 border border-gray-200"}`}>
            {f.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUsers(1, keyword)}
            placeholder="搜索昵称…" className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 w-48" />
        </div>
        <button onClick={() => loadUsers(1, keyword)} className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">用户</th>
                <th className="text-left px-4 py-3 font-semibold">角色/状态</th>
                <th className="text-center px-4 py-3 font-semibold">菜谱数</th>
                <th className="text-center px-4 py-3 font-semibold">烹饪数</th>
                <th className="text-left px-4 py-3 font-semibold">最后登录</th>
                <th className="text-left px-4 py-3 font-semibold">VIP到期</th>
                <th className="text-left px-4 py-3 font-semibold">注册时间</th>
                <th className="text-right px-4 py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setDetailId(u.id)}>
                      {u.avatar ? <img src={absUrl(u.avatar)} className="w-7 h-7 rounded-full object-cover" />
                        : <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 font-bold">{u.nickname?.[0] ?? "?"}</div>}
                      <div>
                        <p className="font-semibold text-gray-800 hover:text-orange-600">{u.nickname}</p>
                        <p className="text-[9px] text-gray-400 font-mono">{u.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === "vip" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                        {u.role === "vip" ? "VIP" : "普通"}
                      </span>
                      {u.status === "banned" && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">封禁</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{u.recipeCount ?? 0}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{u.cookingCount ?? 0}</td>
                  <td className="px-4 py-2.5 text-gray-500">{fmtDateTime(u.lastLoginAt)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{u.vipExpiresAt ? fmtDate(u.vipExpiresAt) : "-"}</td>
                  <td className="px-4 py-2.5 text-gray-500">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconBtn icon={Eye} title="详情" onClick={() => setDetailId(u.id)} />
                      <IconBtn icon={u.status === "banned" ? CheckCircle : Ban}
                        title={u.status === "banned" ? "解封" : "封禁"}
                        onClick={() => toggleBan(u.id, u.status)}
                        color={u.status === "banned" ? "green" : "red"} />
                      <IconBtn icon={Crown} title={u.role === "vip" ? "取消VIP" : "开通VIP(1月)"}
                        onClick={() => handleSetVip(u.id, u.role === "vip" ? null : 1)}
                        color="amber" active={u.role === "vip"} />
                      <IconBtn icon={Trash2} title="删除" onClick={() => handleDelete(u.id)} color="red" />
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">暂无用户</td></tr>}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => { setPage(p); loadUsers(p, keyword); }} />
        </div>
      )}
    </div>
  );
}

// ── User Detail Modal ───────────────────────────────────────
function UserDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getUserDetail(id).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {loading || !data ? <div className="p-10"><LoadingSpinner /></div> : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">用户详情</h3>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-4 mb-4 p-4 bg-gray-50 rounded-xl">
              {data.avatar ? <img src={absUrl(data.avatar)} className="w-14 h-14 rounded-full object-cover" />
                : <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-400">{data.nickname?.[0]}</div>}
              <div>
                <p className="font-bold text-gray-800">{data.nickname}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${data.role === "vip" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{data.role}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${data.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{data.status}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">注册: {fmtDate(data.createdAt)} · 最后登录: {fmtDateTime(data.lastLoginAt)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-2">近期菜谱 ({data.recipes?.total ?? 0})</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {data.recipes?.items?.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                      <span className="text-gray-700 truncate flex-1">{r.title}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                    </div>
                  ))}
                  {(!data.recipes?.items?.length) && <p className="text-[10px] text-gray-400 py-4 text-center">暂无菜谱</p>}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-2">近期烹饪 ({data.cookingLogs?.total ?? 0})</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {data.cookingLogs?.items?.map((l: any) => (
                    <div key={l.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                      <span className="text-gray-700 truncate flex-1">{l.recipeTitle ?? l.recipeId?.slice(0, 8)}</span>
                      <span className="text-gray-400">{fmtDate(l.cookedAt)}</span>
                    </div>
                  ))}
                  {(!data.cookingLogs?.items?.length) && <p className="text-[10px] text-gray-400 py-4 text-center">暂无记录</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Ingredients Tab
// ═════════════════════════════════════════════════════════════
function IngredientsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null); // null=closed, {}=create, {...data}=edit
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (p = page, kw = keyword) => {
    setLoading(true);
    try {
      const res = await adminApi.listIngredients({ page: p, pageSize: 20, keyword: kw || undefined });
      setItems(res.items); setTotal(res.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1); }, []);

  const handleSave = async () => {
    if (!editing?.name?.trim()) return alert("请输入食材名称");
    setSaving(true);
    try {
      const dto = {
        name: editing.name, categoryId: editing.categoryId ? Number(editing.categoryId) : undefined,
        defaultUnit: editing.defaultUnit || "g", referencePrice: editing.referencePrice || undefined,
        referenceUnit: editing.referenceUnit || undefined, aliases: editing.aliases || [],
        calories: editing.calories || undefined,
      };
      if (editing.id) await adminApi.updateIngredient(editing.id, dto);
      else await adminApi.createIngredient(dto);
      setEditing(null); load();
    } catch (e: any) { alert(e?.message ?? "保存失败"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此食材？")) return;
    try { await adminApi.deleteIngredient(id); load(); } catch (e: any) { alert(e?.message ?? "删除失败"); }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await adminApi.importIngredientsCsv(file);
      alert(`导入完成：新建 ${result.created}，更新 ${result.updated}${result.errors.length > 0 ? `，错误 ${result.errors.length}` : ""}`);
      load();
    } catch (err: any) { alert(err?.message ?? "导入失败"); }
    e.target.value = "";
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {/* Edit Modal */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editing.id ? "编辑食材" : "新建食材"}</h3>
            <div className="space-y-3">
              <FormField label="名称 *"><input className="form-input" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="默认单位"><input className="form-input" value={editing.defaultUnit ?? "g"} onChange={(e) => setEditing({ ...editing, defaultUnit: e.target.value })} /></FormField>
                <FormField label="分类ID"><input type="number" className="form-input" value={editing.categoryId ?? ""} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })} /></FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="参考单价"><input className="form-input" placeholder="如 15.00" value={editing.referencePrice ?? ""} onChange={(e) => setEditing({ ...editing, referencePrice: e.target.value })} /></FormField>
                <FormField label="单价单位"><input className="form-input" placeholder="如 元/斤" value={editing.referenceUnit ?? ""} onChange={(e) => setEditing({ ...editing, referenceUnit: e.target.value })} /></FormField>
              </div>
              <FormField label="热量(kcal/100g)"><input className="form-input" value={editing.calories ?? ""} onChange={(e) => setEditing({ ...editing, calories: e.target.value })} /></FormField>
              <FormField label="别名（逗号分隔）"><input className="form-input" placeholder="如 土豆,洋芋"
                value={Array.isArray(editing.aliases) ? editing.aliases.join(", ") : ""}
                onChange={(e) => setEditing({ ...editing, aliases: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} /></FormField>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-xs text-gray-500">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-xs bg-orange-500 text-white rounded-lg disabled:opacity-50">{saving ? "保存中…" : "保存"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">食材库管理</h2>
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-xs text-gray-600 rounded-lg cursor-pointer hover:bg-gray-50">
            <Upload className="w-3.5 h-3.5" /> CSV导入
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          </label>
          <button onClick={() => setEditing({ name: "", defaultUnit: "g", aliases: [] })} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600">
            <Plus className="w-3.5 h-3.5" /> 新建食材
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(1, keyword)}
            placeholder="搜索食材…" className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 w-full" />
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">名称</th>
                <th className="text-left px-4 py-3 font-semibold">分类</th>
                <th className="text-left px-4 py-3 font-semibold">默认单位</th>
                <th className="text-left px-4 py-3 font-semibold">参考单价</th>
                <th className="text-left px-4 py-3 font-semibold">别名</th>
                <th className="text-left px-4 py-3 font-semibold">热量</th>
                <th className="text-right px-4 py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((ing) => (
                <tr key={ing.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{ing.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{ing.categoryName ?? "-"}</td>
                  <td className="px-4 py-2.5 text-gray-500">{ing.defaultUnit}</td>
                  <td className="px-4 py-2.5 text-gray-500">{ing.referencePrice ? `¥${ing.referencePrice}/${ing.referenceUnit ?? ""}` : "-"}</td>
                  <td className="px-4 py-2.5 text-gray-400">{ing.aliases?.length ? ing.aliases.join("、") : "-"}</td>
                  <td className="px-4 py-2.5 text-gray-400">{ing.calories ? `${ing.calories}kcal` : "-"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconBtn icon={Edit3} title="编辑" onClick={() => setEditing(ing)} color="blue" />
                      <IconBtn icon={Trash2} title="删除" onClick={() => handleDelete(ing.id)} color="red" />
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">暂无食材</td></tr>}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => { setPage(p); load(p, keyword); }} />
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Categories Tab
// ═════════════════════════════════════════════════════════════
function CategoriesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (p = page, type = typeFilter) => {
    setLoading(true);
    try {
      const res = await adminApi.listCategories({ page: p, pageSize: 50, type: type || undefined });
      setItems(res.items); setTotal(res.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1, typeFilter); }, [typeFilter]);

  const handleSave = async () => {
    if (!editing?.name?.trim()) return alert("请输入分类名称");
    if (!editing.id && !editing.type) return alert("请选择分类类型");
    setSaving(true);
    try {
      if (editing.id) {
        await adminApi.updateCategory(editing.id, { name: editing.name, icon: editing.icon || undefined, sort: editing.sort != null ? Number(editing.sort) : undefined, enabled: editing.enabled });
      } else {
        await adminApi.createCategory({ type: editing.type, name: editing.name, icon: editing.icon || undefined, sort: editing.sort != null ? Number(editing.sort) : undefined });
      }
      setEditing(null); load(page, typeFilter);
    } catch (e: any) { alert(e?.message ?? "保存失败"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此分类？")) return;
    try { await adminApi.deleteCategory(id); load(page, typeFilter); } catch (e: any) { alert(e?.message ?? "删除失败"); }
  };

  const toggleEnabled = async (id: number, current: boolean) => {
    try { await adminApi.setCategoryEnabled(id, !current); load(page, typeFilter); } catch (e: any) { alert(e?.message ?? "操作失败"); }
  };

  return (
    <div>
      {/* Edit Modal */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editing.id ? "编辑分类" : "新建分类"}</h3>
            <div className="space-y-3">
              {!editing.id && (
                <FormField label="类型 *">
                  <select className="form-input" value={editing.type ?? ""} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                    <option value="">选择类型</option>
                    <option value="recipe">菜谱分类</option>
                    <option value="ingredient">食材分类</option>
                    <option value="meal_scene">用餐场景</option>
                  </select>
                </FormField>
              )}
              <FormField label="名称 *"><input className="form-input" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></FormField>
              <FormField label="图标"><input className="form-input" placeholder="emoji或图标名" value={editing.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} /></FormField>
              <FormField label="排序"><input type="number" className="form-input" value={editing.sort ?? 0} onChange={(e) => setEditing({ ...editing, sort: e.target.value })} /></FormField>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-xs text-gray-500">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-xs bg-orange-500 text-white rounded-lg disabled:opacity-50">{saving ? "保存中…" : "保存"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">分类管理</h2>
        <button onClick={() => setEditing({ name: "", type: "", icon: "", sort: 0 })} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600">
          <Plus className="w-3.5 h-3.5" /> 新建分类
        </button>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2 mb-4">
        {[{ value: "", label: "全部类型" }, { value: "recipe", label: "菜谱分类" }, { value: "ingredient", label: "食材分类" }, { value: "meal_scene", label: "用餐场景" }].map((f) => (
          <button key={f.value} onClick={() => { setTypeFilter(f.value); setPage(1); }}
            className={`px-3 py-1 text-[10px] font-semibold rounded-full transition-colors ${typeFilter === f.value ? "bg-orange-500 text-white" : "bg-white text-gray-500 border border-gray-200"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">名称</th>
                <th className="text-left px-4 py-3 font-semibold">类型</th>
                <th className="text-left px-4 py-3 font-semibold">图标</th>
                <th className="text-center px-4 py-3 font-semibold">排序</th>
                <th className="text-center px-4 py-3 font-semibold">状态</th>
                <th className="text-right px-4 py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((c) => (
                <tr key={c.id} className={`hover:bg-gray-50/50 ${c.enabled === false ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{c.name}</td>
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600 font-semibold">{CATEGORY_TYPE_LABELS[c.type] ?? c.type}</span></td>
                  <td className="px-4 py-2.5 text-gray-500">{c.icon ?? "-"}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500">{c.sort}</td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => toggleEnabled(c.id, c.enabled !== false)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${c.enabled !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {c.enabled !== false ? "启用" : "禁用"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconBtn icon={Edit3} title="编辑" onClick={() => setEditing(c)} color="blue" />
                      <IconBtn icon={Trash2} title="删除" onClick={() => handleDelete(c.id)} color="red" />
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">暂无分类</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Shared Components
// ═════════════════════════════════════════════════════════════
function LoadingSpinner() {
  return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>;
}

function ErrorBlock({ message }: { message: string }) {
  return <div className="flex items-center justify-center py-20"><p className="text-sm text-red-400">{message}</p></div>;
}

function Pagination({ page, totalPages, total, onPageChange }: { page: number; totalPages: number; total: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-[10px] text-gray-400">共 {total} 条</p>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
        <span className="text-[10px] text-gray-500 px-2">{page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon, title, onClick, color = "gray", active = false }: {
  icon: any; title: string; onClick: () => void; color?: string; active?: boolean;
}) {
  const colors: Record<string, string> = {
    gray: "hover:bg-gray-100 text-gray-400 hover:text-gray-600",
    red: "hover:bg-red-50 text-gray-400 hover:text-red-500",
    green: "hover:bg-green-50 text-gray-400 hover:text-green-600",
    blue: "hover:bg-blue-50 text-gray-400 hover:text-blue-600",
    amber: "hover:bg-amber-50 text-gray-400 hover:text-amber-600",
  };
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded-lg transition-colors ${active ? `bg-${color === "amber" ? "amber" : color}-50 text-${color === "amber" ? "amber" : color}-500` : colors[color] ?? colors.gray}`}>
      <Icon className={`w-3.5 h-3.5 ${active ? "fill-current" : ""}`} />
    </button>
  );
}

function FormField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">{label}</label>
      {children}
    </div>
  );
}
