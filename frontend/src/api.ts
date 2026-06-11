import { Recipe, Category, UserProfile, UserIngredient, Timer, CookingLog } from "./types";

// ---------- 库存扣减类型（与后端 stock-deduction.service.ts 保持一致） ----------
export type DeductionMatchStatus = "ok" | "short" | "unit_mismatch" | "no_stock" | "unmatched";

export interface DeductionMatch {
  recipe: { name: string; amount: number; displayAmount: string; unit: string };
  userIngredient?: {
    id: number;
    name: string;
    stockAmount: number;
    stockUnit: string;
    displayStock: string;
    unitPrice: number;
    priceUnit: string;
  };
  status: DeductionMatchStatus;
  deficit?: number;
  estimatedCost?: number;
}

export interface DeductionPreview {
  matches: DeductionMatch[];
  hasShortage: boolean;
  totalEstimatedCost: number;
}

export interface DeductionResult extends DeductionPreview {
  deducted: Array<{
    userIngredientId: number;
    name: string;
    deductedAmount: number;
    canonicalUnit: "g" | "ml" | "count";
    displayAmount: string;
    estimatedCost: number;
  }>;
  undoToken: string;
  undoExpiresAt: string;
}

// 自动检测：如果当前页面不是 localhost，说明在真机/外部访问，用当前 host + 后端端口
const _envBase = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:3001/api";
const BASE_URL = (() => {
  if (typeof window !== "undefined" && window.location?.hostname && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return `http://${window.location.hostname}:3001/api`;
  }
  return _envBase;
})();
const TOKEN_KEY = "ujk_token";
const ADMIN_TOKEN_KEY = "ujk_admin_token";

// ---------- token storage ----------
export const tokenStore = {
  get: () => (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const adminTokenStore = {
  get: () => (typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null),
  set: (t: string) => localStorage.setItem(ADMIN_TOKEN_KEY, t),
  clear: () => localStorage.removeItem(ADMIN_TOKEN_KEY),
};

// ---------- request helper ----------
interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
}

async function request<T>(
  path: string,
  options: RequestInit & { isMultipart?: boolean } = {},
): Promise<T> {
  const { isMultipart, headers: rawHeaders, ...rest } = options;
  const headers: Record<string, string> = { ...(rawHeaders as Record<string, string>) };
  if (!isMultipart) headers["Content-Type"] = "application/json";
  const token = tokenStore.get();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers });

  let body: ApiEnvelope<T> | { message?: string } | null = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    const msg = (body as any)?.message || `请求失败 (${res.status})`;
    if (res.status === 401) tokenStore.clear();
    throw new Error(msg);
  }
  return (body as ApiEnvelope<T>).data;
}

interface PaginatedResp<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

function adaptUserIngredient(r: any): UserIngredient {
  const expiryDate: string | null = r.expiryDate ?? null;
  // 新鲜 = 未填过期日期，或过期日期还在今天之后
  let isFresh = true;
  if (expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(expiryDate);
    isFresh = !isNaN(d.getTime()) && d.getTime() >= today.getTime();
  }
  return {
    id: String(r.id),
    ingredientId: r.ingredientId ?? null,
    name: r.customName || r.publicName || (r.ingredientId ? `食材#${r.ingredientId}` : "未命名"),
    customName: r.customName ?? null,
    unitPrice: Number(r.unitPrice),
    priceUnit: r.priceUnit,
    supplier: (r.notes ?? "").replace(/^供应商:\s*/, ""),
    lastPurchased: r.updatedAt ?? r.createdAt ?? "",
    isFresh,
    expiryDate,
    storageType: r.storageType ?? null,
    stockAmount: r.stockAmount != null ? Number(r.stockAmount) : null,
    stockUnit: r.stockUnit ?? null,
    categoryId: r.categoryId ?? null,
    categoryName: r.categoryName ?? null,
  } as UserIngredient;
}

/** 用食材列表估算成本（与 RecipeDetailView 保持一致，默认 0.02元/g） */
function calcFallbackCost(ingredients: any[]): number {
  const DEFAULT_PRICE = 0.02;
  return ingredients.reduce((total, i) => {
    const amount = typeof i.amount === "string" ? parseFloat(i.amount) : Number(i.amount ?? 0);
    const price = i.unitPrice || DEFAULT_PRICE;
    return total + amount * price;
  }, 0);
}

// 把后端 Recipe 响应映射成前端 Recipe 形状
function adaptRecipe(r: any): Recipe {
  const ingredients = Array.isArray(r.ingredients)
    ? r.ingredients.map((i: any) => ({
        id: i.id,
        ingredientId: i.ingredientId ?? null,
        name: i.name ?? i.customName ?? "未命名食材",
        groupName: i.groupName ?? "主料",
        amount: typeof i.amount === "string" ? parseFloat(i.amount) : Number(i.amount ?? 0),
        unit: i.unit ?? "g",
        scaleType: i.scaleType ?? "linear",
        scaleFactor: typeof i.scaleFactor === "string" ? parseFloat(i.scaleFactor) : (i.scaleFactor ?? 0.7),
        sortOrder: i.sort ?? 0,
        note: i.notes ?? null,
        unitPrice: i.unitPrice,
      }))
    : [];

  // 若后端未返回 estimatedCost（为 null/0），用食材列表兜底估算（与详情页逻辑一致）
  const storedCost = r.estimatedCost ?? 0;
  const estimatedCost = storedCost > 0 ? storedCost : (ingredients.length > 0 ? calcFallbackCost(ingredients) : 0);

  return {
    id: String(r.id),
    title: r.title ?? "",
    description: r.description ?? "",
    coverImageUrl: r.coverImage ?? r.coverImageUrl ?? "",
    baseServings: r.baseServings ?? 2,
    servingUnit: r.servingUnit ?? "份",
    difficulty: r.difficulty ?? "medium",
    cookTime: r.totalMinutes ? `${r.totalMinutes}min` : (r.cookTime ?? "30min"),
    mealScene: r.mealScene ?? "",
    tags: Array.isArray(r.tags) ? r.tags : [],
    isPublic: r.isPublic ?? r.status === "published",
    isFeatured: r.isFeatured ?? false,
    viewCount: r.viewCount,
    favoriteCount: r.favoriteCount,
    ratingAvg: r.ratingAvg,
    cookingTips: r.cookingTips,
    categories: Array.isArray(r.categories) ? r.categories : [],
    ingredients,
    steps: Array.isArray(r.steps)
      ? r.steps.map((s: any) => ({
          id: s.id,
          stepNumber: s.stepNumber,
          description: s.description ?? "",
          images: s.imageUrl ? [s.imageUrl] : [],
          timerSeconds: s.durationSeconds ?? null,
          timerLabel: s.tips ?? null,
          timerType: s.durationSeconds ? "countdown" : null,
        }))
      : [],
    estimatedCost,
    author: r.author
      ? {
          id: r.author.id,
          nickname: r.author.nickname ?? "未知作者",
          avatarUrl: r.author.avatar ?? r.author.avatarUrl ?? "",
        }
      : undefined,
    isFavorited: r.isFavorited,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// 把前端字段名映射成后端 CreateRecipeDto 接受的形式
function adaptRecipePayload(recipe: any) {
  const out: any = {
    title: recipe.title,
    description: recipe.description,
    baseServings: recipe.baseServings,
    difficulty: recipe.difficulty,
    tags: recipe.tags,
  };
  if (recipe.coverImageUrl) out.coverImage = recipe.coverImageUrl;
  if (recipe.isPublic !== undefined) {
    out.isPublic = recipe.isPublic;
    out.status = recipe.isPublic ? "published" : "draft";
  }
  if (Array.isArray(recipe.categoryIds)) out.categoryIds = recipe.categoryIds.map((n: any) => Number(n));
  else if (Array.isArray(recipe.categories)) {
    out.categoryIds = recipe.categories
      .map((c: any) => (typeof c === "number" ? c : c?.id))
      .filter((id: any) => typeof id === "number");
  }
  if (recipe.cookTime) {
    const m = String(recipe.cookTime).match(/(\d+)/);
    if (m) out.totalMinutes = parseInt(m[1], 10);
  }
  if (Array.isArray(recipe.ingredients)) {
    out.ingredients = recipe.ingredients.map((i: any, idx: number) => ({
      ingredientId: i.ingredientId ?? undefined,
      customName: i.ingredientId ? undefined : i.name || i.customName || "未知",
      amount: Number(i.amount),
      unit: i.unit,
      scaleType: i.scaleType,
      scaleFactor: i.scaleFactor,
      groupName: i.groupName,
      notes: i.note ?? i.notes,
      sort: i.sortOrder ?? idx,
    }));
  }
  if (Array.isArray(recipe.steps)) {
    out.steps = recipe.steps.map((s: any, idx: number) => ({
      stepNumber: s.stepNumber ?? idx + 1,
      description: s.description,
      imageUrl: Array.isArray(s.images) ? s.images[0] : s.imageUrl,
      durationSeconds: s.timerSeconds ?? s.durationSeconds,
      tips: s.tips,
    }));
  }
  return out;
}

// ---------- API ----------
export const api = {
  // Auth
  async login(code = "mock-code", profile?: { nickname?: string; avatar?: string }) {
    const data = await request<{ token: string; user: any }>("/auth/wx-login", {
      method: "POST",
      body: JSON.stringify({ code, ...profile }),
    });
    tokenStore.set(data.token);
    return { ...data, isNewUser: false };
  },

  logout() {
    tokenStore.clear();
  },

  async getProfile(): Promise<UserProfile> {
    const [u, recipesPage, favs, logsPage] = await Promise.all([
      request<any>("/users/me"),
      request<PaginatedResp<any>>("/recipes?pageSize=1").catch(() => ({ total: 0 } as any)),
      request<PaginatedResp<any>>("/favorites?pageSize=1").catch(() => ({ total: 0 } as any)),
      request<PaginatedResp<any>>("/cooking/logs?pageSize=1").catch(() => ({ total: 0 } as any)),
    ]);
    return {
      id: u.id,
      nickname: u.nickname ?? "吃货",
      avatarUrl: u.avatar ?? "",
      phone: u.phone ?? null,
      role: u.role ?? "user",
      points: u.points ?? 0,
      stats: {
        recipeCount: recipesPage.total ?? 0,
        cookingCount: logsPage.total ?? 0,
        favoriteCount: favs.total ?? 0,
      },
      createdAt: u.createdAt ?? "",
      autoDeductStock: !!u.autoDeductStock,
    };
  },

  async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    // 后端只认 nickname / avatar / autoDeductStock，过滤一下
    const body: any = {};
    if (profile.nickname !== undefined) body.nickname = profile.nickname;
    if (profile.avatarUrl !== undefined) body.avatar = profile.avatarUrl;
    if (profile.autoDeductStock !== undefined) body.autoDeductStock = profile.autoDeductStock;
    return request<UserProfile>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  // Recipes
  async getRecipes(params?: { keyword?: string; categoryId?: number; authorId?: string; isPublic?: boolean; isFeatured?: boolean; pageSize?: number }): Promise<Recipe[]> {
    const q = new URLSearchParams();
    if (params?.keyword) q.append("keyword", params.keyword);
    if (params?.categoryId) q.append("categoryId", String(params.categoryId));
    if (params?.authorId) q.append("authorId", params.authorId);
    if (params?.isPublic !== undefined) q.append("isPublic", String(params.isPublic));
    if (params?.isFeatured !== undefined) q.append("isFeatured", String(params.isFeatured));
    if (params?.pageSize) q.append("pageSize", String(params.pageSize));
    const data = await request<PaginatedResp<any>>(`/recipes?${q.toString()}`);
    return data.items.map(adaptRecipe);
  },

  async getRecipe(id: string): Promise<Recipe> {
    const raw = await request<any>(`/recipes/${id}`);
    return adaptRecipe(raw);
  },

  async batchDeleteRecipes(ids: string[]): Promise<{ deleted: number; ids?: string[] }> {
    return request("/recipes/batch-delete", { method: "POST", body: JSON.stringify({ ids }) });
  },

  async createRecipe(recipe: Partial<Recipe> & { isPublic?: boolean }): Promise<{ id: string; version: number }> {
    return request("/recipes", { method: "POST", body: JSON.stringify(adaptRecipePayload(recipe)) });
  },

  async updateRecipe(
    id: string,
    recipe: Partial<Recipe> & { isPublic?: boolean },
  ): Promise<{ id: string; version: number }> {
    return request(`/recipes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(adaptRecipePayload(recipe)),
    });
  },

  async deleteRecipe(id: string): Promise<{ id: string }> {
    return request(`/recipes/${id}`, { method: "DELETE" });
  },

  async getRecipeVersions(
    id: string,
  ): Promise<{ version: number; changeSummary: string; createdAt: string }[]> {
    return request(`/recipes/${id}/versions`);
  },

  async scaleRecipe(id: string, targetServings: number) {
    return request(`/recipes/${id}/scale?targetServings=${targetServings}`);
  },

  // Cooking — 预览（换算+估价，不落库）
  async previewCooking(recipeId: string, servings: number) {
    return request<{
      scaled: {
        recipeId: string;
        title: string;
        baseServings: number;
        targetServings: number;
        multiplier: number;
        ingredients: {
          name: string;
          customName: string | null;
          originalAmount: number;
          scaledAmount: number;
          unit: string;
          scaleType: string;
        }[];
      };
      cost: {
        currency: string;
        totalCost: number;
        unknownCount: number;
        lines: { name: string; totalCost: number; source: string }[];
      };
    }>("/cooking/preview", {
      method: "POST",
      body: JSON.stringify({ recipeId, servings }),
    });
  },

  // 兼容旧名：startCooking 等同 previewCooking + 字段映射
  async startCooking(recipeId: string, targetServings: number) {
    const r = await this.previewCooking(recipeId, targetServings);
    return {
      cookingLogId: "", // 后端「开始烹饪」不落库，只有完成时记录
      multiplier: r.scaled.multiplier,
      scaledIngredients: r.scaled.ingredients.map((i) => ({
        name: i.customName ?? i.name,
        originalAmount: i.originalAmount,
        scaledAmount: i.scaledAmount,
        unit: i.unit,
        scaleType: i.scaleType,
        lineCost: r.cost.lines.find((l) => l.name === (i.customName ?? i.name))?.totalCost ?? 0,
      })),
      totalCost: r.cost.totalCost,
      costPerServing: targetServings > 0 ? r.cost.totalCost / targetServings : 0,
    };
  },

  async completeCooking(
    recipeId: string,
    servings: number,
    rating?: number,
    notes?: string,
  ): Promise<CookingLog & { deduction: DeductionResult | null }> {
    return request("/cooking/logs", {
      method: "POST",
      body: JSON.stringify({ recipeId, servings, rating, notes }),
    });
  },

  // 烹饪开始前：检查食材库 vs 菜谱用料，返回缺口/未匹配
  async previewDeduction(recipeId: string, servings: number): Promise<DeductionPreview> {
    return request<DeductionPreview>("/cooking/deduction-preview", {
      method: "POST",
      body: JSON.stringify({ recipeId, servings }),
    });
  },

  // 撤销自动扣减（30 秒内）
  async undoDeduction(undoToken: string): Promise<{ restored: number }> {
    return request("/cooking/undo-deduction", {
      method: "POST",
      body: JSON.stringify({ undoToken }),
    });
  },

  async getCookingHistory(): Promise<CookingLog[]> {
    const data = await request<PaginatedResp<any>>("/cooking/logs");
    return data.items.map((l) => ({
      id: l.id,
      recipe: {
        id: l.recipeId,
        title: l.recipeTitle ?? "未命名菜谱",
        coverImageUrl: l.recipeCoverImage ?? "",
      },
      targetServings: Number(l.servings ?? 0),
      multiplier: 1,
      servingUnit: "份",
      totalCost: Number(l.totalCost ?? 0),
      rating: Number(l.rating ?? 0),
      notes: l.notes ?? "",
      startedAt: l.cookedAt ?? l.createdAt ?? "",
      completedAt: l.cookedAt ?? l.createdAt ?? "",
    }));
  },

  // Timers
  async getTimers(): Promise<Timer[]> {
    return request("/timers");
  },

  async createTimer(timer: {
    label: string;
    totalSeconds: number;
    status?: string;
    recipeId?: string;
    stepId?: number;
  }): Promise<Timer> {
    return request("/timers", {
      method: "POST",
      body: JSON.stringify({
        label: timer.label,
        durationSeconds: timer.totalSeconds,
        recipeId: timer.recipeId,
        stepNumber: timer.stepId,
      }),
    });
  },

  async pauseTimer(id: string): Promise<Timer> {
    return request(`/timers/${id}/pause`, { method: "POST" });
  },

  async resumeTimer(id: string): Promise<Timer> {
    return request(`/timers/${id}/resume`, { method: "POST" });
  },

  async resetTimer(id: string): Promise<Timer> {
    return request(`/timers/${id}/reset`, { method: "POST" });
  },

  async deleteTimer(id: string): Promise<{ id: string }> {
    return request(`/timers/${id}`, { method: "DELETE" });
  },

  // Ingredients
  async searchIngredients(keyword: string) {
    const data = await request<
      PaginatedResp<{
        id: number;
        name: string;
        categoryName?: string;
        defaultUnit: string;
        referencePrice: number;
      }>
    >(`/ingredients?keyword=${encodeURIComponent(keyword)}`);
    return data.items;
  },

  async getUserIngredients(categoryId?: number): Promise<UserIngredient[]> {
    const q = new URLSearchParams();
    q.append("pageSize", "200");
    if (categoryId != null) q.append("categoryId", String(categoryId));
    const data = await request<PaginatedResp<any> | any[]>(`/me/ingredients?${q.toString()}`);
    const raw = Array.isArray(data) ? data : data.items;
    return raw.map(adaptUserIngredient);
  },

  async addUserIngredient(ingredient: {
    ingredientId?: number | null;
    customName?: string | null;
    unitPrice: number;
    priceUnit: string;
    supplier?: string;
    expiryDate?: string | null;
    storageType?: "room_temp" | "refrigerated" | "frozen" | null;
    stockAmount?: number | null;
    stockUnit?: string | null;
    categoryId?: number | null;
  }): Promise<UserIngredient> {
    const body: any = {
      unitPrice: Number(ingredient.unitPrice),
      priceUnit: ingredient.priceUnit,
    };
    if (ingredient.ingredientId) body.ingredientId = ingredient.ingredientId;
    else if (ingredient.customName) body.customName = ingredient.customName;
    if (ingredient.supplier) body.notes = `供应商: ${ingredient.supplier}`;
    if (ingredient.expiryDate) body.expiryDate = ingredient.expiryDate;
    if (ingredient.storageType) body.storageType = ingredient.storageType;
    if (ingredient.stockAmount != null) body.stockAmount = Number(ingredient.stockAmount);
    if (ingredient.stockUnit) body.stockUnit = ingredient.stockUnit;
    if (ingredient.categoryId != null) body.categoryId = ingredient.categoryId;
    const raw = await request<any>("/me/ingredients", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return adaptUserIngredient(raw);
  },

  async updateUserIngredient(
    id: string,
    ingredient: Partial<UserIngredient>,
  ): Promise<UserIngredient> {
    const body: any = {};
    if (ingredient.unitPrice !== undefined) body.unitPrice = Number(ingredient.unitPrice);
    if (ingredient.priceUnit !== undefined) body.priceUnit = ingredient.priceUnit;
    if (ingredient.customName !== undefined) body.customName = ingredient.customName;
    if ((ingredient as any).supplier !== undefined) {
      body.notes = (ingredient as any).supplier
        ? `供应商: ${(ingredient as any).supplier}`
        : null;
    }
    if (ingredient.expiryDate !== undefined) body.expiryDate = ingredient.expiryDate;
    if (ingredient.storageType !== undefined) body.storageType = ingredient.storageType;
    if (ingredient.stockAmount !== undefined) body.stockAmount = ingredient.stockAmount;
    if (ingredient.stockUnit !== undefined) body.stockUnit = ingredient.stockUnit;
    const raw = await request<any>(`/me/ingredients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return adaptUserIngredient(raw);
  },

  async deleteUserIngredient(id: string): Promise<{ id: string }> {
    return request(`/me/ingredients/${id}`, { method: "DELETE" });
  },

  // Categories
  async getCategories(type?: "recipe" | "ingredient" | "meal_scene"): Promise<Category[]> {
    const q = new URLSearchParams();
    if (type) q.append("type", type);
    q.append("pageSize", "100");
    const data = await request<PaginatedResp<any>>(`/categories?${q.toString()}`);
    return data.items.map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parentId ?? null,
      icon: c.icon ?? "",
      sortOrder: c.sort ?? 0,
      ownerId: c.ownerId ?? null,
    } as Category & { ownerId: string | null }));
  },

  async createMyCategory(payload: { type: "recipe"; name: string; icon?: string }) {
    return request<any>("/categories/mine", { method: "POST", body: JSON.stringify(payload) });
  },

  async deleteMyCategory(id: number) {
    return request<{ id: number }>(`/categories/${id}`, { method: "DELETE" });
  },

  // Favorites — 后端 POST /favorites/:recipeId 是 toggle
  async getFavorites(): Promise<{ folder: string; favoritedAt: string; recipe: Recipe }[]> {
    const data = await request<
      PaginatedResp<{ id: number; recipeId: string; favoritedAt: string; recipe: any }>
    >("/favorites");
    return data.items
      .filter((f) => f.recipe != null)
      .map((f) => ({ folder: "default", favoritedAt: f.favoritedAt, recipe: adaptRecipe(f.recipe) }));
  },

  async addFavorite(recipeId: string): Promise<{ favorited: boolean; recipeId: string }> {
    return request(`/favorites/${recipeId}`, { method: "POST" });
  },

  async removeFavorite(recipeId: string): Promise<{ favorited: boolean; recipeId: string }> {
    return request(`/favorites/${recipeId}`, { method: "DELETE" });
  },

  async checkFavorites(recipeIds: string[]): Promise<Record<string, boolean>> {
    return request("/favorites/check", {
      method: "POST",
      body: JSON.stringify({ recipeIds }),
    });
  },

  // Upload
  async uploadPhoto(file: File): Promise<{ url: string; width: number; height: number }> {
    const form = new FormData();
    form.append("file", file);
    const token = tokenStore.get();
    const res = await fetch(`${BASE_URL}/uploads/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || (json.code !== 200 && json.code !== 0)) {
      throw new Error(json?.message || `上传失败 (${res.status})`);
    }
    const relUrl: string = json.data.url;
    const origin = BASE_URL.replace(/\/api\/?$/, "");
    return { url: `${origin}${relUrl}`, width: 0, height: 0 };
  },

  // ── Share ──────────────────────────────────────────────────
  async generateQrcode(recipeId: string): Promise<{ qrcodeUrl: string; scene: string }> {
    return request("/share/qrcode", {
      method: "POST",
      body: JSON.stringify({ recipeId }),
    });
  },

  async resolveShareScene(scene: string): Promise<{ recipeId: string }> {
    return request(`/share/resolve?scene=${encodeURIComponent(scene)}`);
  },

  // ── Shopping List ────────────────────────────────────────────
  async generateShoppingList(
    items: { recipeId: string; servings: number }[],
  ): Promise<{
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
  }> {
    return request("/shopping-list/generate", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  // ── Meal Plans ──────────────────────────────────────────────
  async createMealPlan(dto: {
    planDate: string;
    mealType: string;
    recipeId: string;
    servings?: number;
  }): Promise<any> {
    return request("/meal-plans", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  async getMealPlans(
    startDate: string,
    endDate: string,
  ): Promise<
    {
      id: string;
      planDate: string;
      mealType: string;
      recipeId: string;
      servings: string;
      recipe: { id: string; title: string; coverImage: string | null };
    }[]
  > {
    return request(
      `/meal-plans?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    );
  },

  async deleteMealPlan(id: string): Promise<{ id: string }> {
    return request(`/meal-plans/${id}`, { method: "DELETE" });
  },

  async mealPlansToShoppingList(
    startDate: string,
    endDate: string,
  ): Promise<Awaited<ReturnType<typeof api.generateShoppingList>>> {
    return request("/meal-plans/to-shopping-list", {
      method: "POST",
      body: JSON.stringify({ startDate, endDate }),
    });
  },

  // ── Content Safety ──────────────────────────────────────────
  async checkTextContent(content: string): Promise<{ safe: boolean; reason?: string }> {
    return request("/content/check-text", {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  // ── AI Recipe Parse ──────────────────────────────────────────
  async parseRecipeText(text: string): Promise<{
    parsed: boolean;
    confidence: "high" | "medium" | "low";
    recipe: {
      title: string;
      description: string;
      cookTime?: string;
      difficulty: string;
      totalMinutes?: number;
      baseServings: number;
      ingredients: Array<{
        name: string;
        amount: number;
        unit: string;
        groupName: string;
        scaleType: string;
      }>;
      steps: Array<{
        stepNumber: number;
        description: string;
        durationSeconds: number | null;
      }>;
    };
    originalText: string;
  }> {
    return request("/recipes/parse-text", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
};

// ====================================================================
// Admin API — uses separate token (adminTokenStore)
// ====================================================================

async function adminRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = adminTokenStore.get();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  let body: { code: number; message: string; data: T } | { message?: string } | null = null;
  try { body = await res.json(); } catch { /* non-JSON */ }

  if (!res.ok) {
    const msg = (body as any)?.message ?? `Admin request failed (${res.status})`;
    throw new Error(msg);
  }
  if (body && "code" in body && body.code === 200) return body.data;
  return body as T;
}

export interface AdminInfo {
  id: string;
  username: string;
  nickname: string | null;
  role: string;
  mustChangePassword?: boolean;
}

async function adminMultipartRequest<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = adminTokenStore.get();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers, body: formData });
  let body: any = null;
  try { body = await res.json(); } catch { /* */ }
  if (!res.ok) throw new Error((body as any)?.message ?? `Admin upload failed (${res.status})`);
  if (body && "code" in body && body.code === 200) return body.data;
  return body as T;
}

// 共用解析结果类型（前后台通用）
export type ParsedRecipe = Awaited<ReturnType<typeof api.parseRecipeText>>["recipe"];

export const adminApi = {
  // ── Auth ────────────────────────────────────────────────
  async login(username: string, password: string): Promise<{ token: string; admin: AdminInfo }> {
    return adminRequest("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  async whoami(): Promise<AdminInfo> {
    return adminRequest("/admin/auth/whoami");
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return adminRequest("/admin/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // ── AI Parse (admin, no rate limit) ────────────────────
  async parseRecipeText(text: string): Promise<{
    parsed: boolean;
    confidence: "high" | "medium" | "low";
    recipe: ParsedRecipe;
    originalText: string;
  }> {
    return adminRequest("/admin/recipes/parse-text", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  // ── Stats ───────────────────────────────────────────────
  async stats() {
    return adminRequest<{
      users: { total: number; newToday: number };
      recipes: { total: number; published: number; draft: number; newToday: number };
      cooking: { totalLogs: number; newToday: number };
      ingredients: { total: number };
      categories: { total: number };
    }>("/admin/stats");
  },

  // ── Users ───────────────────────────────────────────────
  async listUsers(params: {
    page?: number; pageSize?: number; keyword?: string;
    role?: string; status?: string; dateFrom?: string; dateTo?: string;
  } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
    return adminRequest<PaginatedResp<any>>(`/admin/users?${qs}`);
  },
  async getUserDetail(id: string) {
    return adminRequest<any>(`/admin/users/${id}`);
  },
  async setUserRole(id: string, role: "user" | "vip") {
    return adminRequest(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
  },
  async setUserStatus(id: string, status: "active" | "banned") {
    return adminRequest(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  },
  async setVip(id: string, vipExpiresAt: string | null) {
    return adminRequest(`/admin/users/${id}/vip`, { method: "POST", body: JSON.stringify({ vipExpiresAt }) });
  },
  async deleteUser(id: string) {
    return adminRequest(`/admin/users/${id}`, { method: "DELETE" });
  },

  // ── Recipes ─────────────────────────────────────────────
  async listRecipes(params: {
    page?: number; pageSize?: number; keyword?: string;
    status?: string; authorId?: string; categoryId?: number;
    isFeatured?: string; dateFrom?: string; dateTo?: string;
  } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
    return adminRequest<PaginatedResp<any>>(`/admin/recipes?${qs}`);
  },
  async getRecipeDetail(id: string) {
    return adminRequest<any>(`/admin/recipes/${id}`);
  },
  async createOfficialRecipe(dto: any) {
    return adminRequest<any>("/admin/recipes/official", { method: "POST", body: JSON.stringify(dto) });
  },
  async updateRecipe(id: string, dto: any) {
    return adminRequest<any>(`/admin/recipes/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
  },
  async setRecipeStatus(id: string, status: "draft" | "published" | "archived") {
    return adminRequest(`/admin/recipes/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  },
  async setFeatured(id: string, isFeatured: boolean) {
    return adminRequest(`/admin/recipes/${id}/feature`, { method: "PUT", body: JSON.stringify({ isFeatured }) });
  },
  async batchArchive(ids: string[]) {
    return adminRequest<{ affected: number }>("/admin/recipes/batch-archive", { method: "POST", body: JSON.stringify({ ids }) });
  },
  async batchDelete(ids: string[]) {
    return adminRequest<{ affected: number }>("/admin/recipes/batch-delete", { method: "POST", body: JSON.stringify({ ids }) });
  },
  async deleteRecipe(id: string) {
    return adminRequest(`/admin/recipes/${id}`, { method: "DELETE" });
  },

  // ── Ingredients ─────────────────────────────────────────
  async listIngredients(params: { page?: number; pageSize?: number; keyword?: string; categoryId?: number } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
    return adminRequest<PaginatedResp<any>>(`/admin/ingredients?${qs}`);
  },
  async getIngredient(id: number) {
    return adminRequest<any>(`/admin/ingredients/${id}`);
  },
  async createIngredient(dto: any) {
    return adminRequest<any>("/admin/ingredients", { method: "POST", body: JSON.stringify(dto) });
  },
  async updateIngredient(id: number, dto: any) {
    return adminRequest<any>(`/admin/ingredients/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
  },
  async deleteIngredient(id: number) {
    return adminRequest(`/admin/ingredients/${id}`, { method: "DELETE" });
  },
  async importIngredientsCsv(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return adminMultipartRequest<{ created: number; updated: number; errors: string[] }>("/admin/ingredients/import-csv", fd);
  },

  // ── Categories ──────────────────────────────────────────
  async listCategories(params: { page?: number; pageSize?: number; keyword?: string; type?: string } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
    return adminRequest<PaginatedResp<any>>(`/admin/categories?${qs}`);
  },
  async createCategory(dto: any) {
    return adminRequest<any>("/admin/categories", { method: "POST", body: JSON.stringify(dto) });
  },
  async updateCategory(id: number, dto: any) {
    return adminRequest<any>(`/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
  },
  async setCategoryEnabled(id: number, enabled: boolean) {
    return adminRequest(`/admin/categories/${id}/enabled`, { method: "PUT", body: JSON.stringify({ enabled }) });
  },
  async deleteCategory(id: number) {
    return adminRequest(`/admin/categories/${id}`, { method: "DELETE" });
  },
  async reorderCategories(items: { id: number; sort: number }[]) {
    return adminRequest("/admin/categories/reorder", { method: "POST", body: JSON.stringify({ items }) });
  },

  // ── Upload (reuse user upload endpoint with admin token) ──
  async uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const token = adminTokenStore.get();
    const res = await fetch(`${BASE_URL}/uploads/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `上传失败 (${res.status})`);
    const relUrl: string = (json.data ?? json).url;
    const origin = BASE_URL.replace(/\/api\/?$/, "");
    return `${origin}${relUrl}`;
  },
};
