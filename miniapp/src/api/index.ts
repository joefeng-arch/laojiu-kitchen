import type { Recipe, Category, UserProfile, UserIngredient, Timer, CookingLog } from "@/types";
import { request, tokenStore, absUrl, BASE_URL, type PaginatedResp } from "./request";

export { tokenStore, absUrl };

export const api = {
  // ---------- Auth ----------
  async wxLogin(code: string): Promise<{ token: string; user: UserProfile; isNewUser: boolean }> {
    const data = await request<{ token: string; user: UserProfile; isNewUser: boolean }>(
      "/auth/wx-login",
      { method: "POST", data: { code } },
    );
    if (data.token) tokenStore.set(data.token);
    return data;
  },

  async mockLogin(seed = "mock-dev-user"): Promise<{ token: string; user: UserProfile }> {
    const data = await request<{ token: string; user: UserProfile }>(
      "/auth/wx-login",
      { method: "POST", data: { code: seed } },
    );
    if (data.token) tokenStore.set(data.token);
    return data;
  },

  logout() {
    tokenStore.clear();
  },

  async getProfileBasic(): Promise<UserProfile> {
    return request("/users/me");
  },

  async updateProfile(patch: { nickname?: string; avatar?: string | null }): Promise<UserProfile> {
    return request("/users/me", { method: "PATCH", data: patch });
  },

  // ---------- Recipes ----------
  async getRecipes(params: { page?: number; pageSize?: number; keyword?: string; categoryId?: number } = {}): Promise<
    PaginatedResp<Recipe>
  > {
    return request("/recipes", { query: params });
  },

  async getRecipeById(id: string): Promise<Recipe> {
    return request(`/recipes/${id}`);
  },

  async createRecipe(payload: any): Promise<Recipe> {
    return request("/recipes", { method: "POST", data: payload });
  },

  async updateRecipe(id: string, payload: any): Promise<Recipe> {
    return request(`/recipes/${id}`, { method: "PUT", data: payload });
  },

  async deleteRecipe(id: string): Promise<{ id: string }> {
    return request(`/recipes/${id}`, { method: "DELETE" });
  },

  // ---------- Cooking ----------
  async startCooking(recipeId: string, targetServings: number): Promise<{ logId: string }> {
    return request("/cooking/start", { method: "POST", data: { recipeId, targetServings } });
  },

  async completeCooking(logId: string, rating: number, notes?: string): Promise<CookingLog> {
    return request(`/cooking/${logId}/complete`, { method: "PUT", data: { rating, notes } });
  },

  async getCookingHistory(page = 1, pageSize = 20): Promise<PaginatedResp<CookingLog>> {
    return request("/cooking/history", { query: { page, pageSize } });
  },

  // ---------- Timers ----------
  async getTimers(): Promise<Timer[]> {
    const data = await request<PaginatedResp<Timer> | Timer[]>("/timers");
    return Array.isArray(data) ? data : data.items;
  },

  async createTimer(input: { label: string; durationSeconds: number; type?: "countdown" | "stopwatch" }): Promise<Timer> {
    return request("/timers", { method: "POST", data: input });
  },

  async pauseTimer(id: string): Promise<Timer> {
    return request(`/timers/${id}/pause`, { method: "PUT" });
  },

  async resumeTimer(id: string): Promise<Timer> {
    return request(`/timers/${id}/resume`, { method: "PUT" });
  },

  async deleteTimer(id: string): Promise<{ id: string }> {
    return request(`/timers/${id}`, { method: "DELETE" });
  },

  // ---------- Ingredients ----------
  async searchIngredients(keyword: string) {
    const data = await request<PaginatedResp<any>>("/ingredients", { query: { keyword } });
    return data.items;
  },

  async getUserIngredients(): Promise<UserIngredient[]> {
    const data = await request<PaginatedResp<any>>("/me/ingredients");
    return data.items.map((r) => ({
      id: String(r.id),
      ingredientId: r.ingredientId ?? null,
      name: r.customName || (r.ingredientId ? `食材#${r.ingredientId}` : "未命名"),
      customName: r.customName ?? null,
      unitPrice: Number(r.unitPrice),
      priceUnit: r.priceUnit,
      supplier: (r.notes ?? "").replace(/^供应商:\s*/, ""),
      lastPurchased: r.updatedAt ?? r.createdAt ?? "",
      isFresh: true,
    }));
  },

  async addUserIngredient(input: {
    ingredientId?: number | null;
    customName?: string | null;
    unitPrice: number;
    priceUnit: string;
    supplier?: string;
  }): Promise<any> {
    const body: any = { unitPrice: Number(input.unitPrice), priceUnit: input.priceUnit };
    if (input.ingredientId) body.ingredientId = input.ingredientId;
    else if (input.customName) body.customName = input.customName;
    if (input.supplier) body.notes = `供应商: ${input.supplier}`;
    return request("/me/ingredients", { method: "POST", data: body });
  },

  async deleteUserIngredient(id: string) {
    return request(`/me/ingredients/${id}`, { method: "DELETE" });
  },

  // ---------- Categories ----------
  async getCategories(): Promise<Category[]> {
    return request("/categories");
  },

  // ---------- Favorites ----------
  async getFavorites(): Promise<{ folder: string; favoritedAt: string; recipe: Recipe }[]> {
    const data = await request<PaginatedResp<{ id: number; recipeId: string; favoritedAt: string; recipe: Recipe | null }>>(
      "/favorites",
    );
    return data.items
      .filter((f) => f.recipe !== null)
      .map((f) => ({ folder: "default", favoritedAt: f.favoritedAt, recipe: f.recipe! }));
  },

  async toggleFavorite(recipeId: string): Promise<{ favorited: boolean; recipeId: string }> {
    return request(`/favorites/${recipeId}`, { method: "POST" });
  },

  // ---------- Uploads ----------
  uploadPhoto(filePath: string): Promise<{ url: string }> {
    const token = tokenStore.get();
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: `${BASE_URL}/uploads/image`,
        filePath,
        name: "file",
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: (res) => {
          try {
            const body = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
            if (body.code === 200 && body.data?.url) {
              resolve({ url: absUrl(body.data.url) });
            } else {
              reject(new Error(body?.message || `上传失败 (${res.statusCode})`));
            }
          } catch (e: any) {
            reject(new Error(e?.message || "解析响应失败"));
          }
        },
        fail: (err) => reject(new Error(err?.errMsg || "上传失败")),
      });
    });
  },
};
