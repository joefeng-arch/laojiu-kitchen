// 本地开发：所有平台都打 localhost
// 上架前需要把 MP-WEIXIN 分支换成 HTTPS 公网域名，并在微信公众平台配置合法域名
// #ifdef MP-WEIXIN
export const BASE_URL = "http://localhost:3001/api"; // 开发者工具勾"不校验合法域名"才能用 http
// #endif
// #ifndef MP-WEIXIN
export const BASE_URL = "http://localhost:3001/api";
// #endif
const TOKEN_KEY = "ujk_token";

export const tokenStore = {
  get(): string | null {
    try { return uni.getStorageSync(TOKEN_KEY) || null; } catch { return null; }
  },
  set(token: string) { uni.setStorageSync(TOKEN_KEY, token); },
  clear() { uni.removeStorageSync(TOKEN_KEY); },
};

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResp<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

export function request<T = any>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    data?: any;
    query?: Record<string, any>;
  } = {},
): Promise<T> {
  const { method = "GET", data, query } = options;
  const qs = query
    ? "?" +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";

  return new Promise<T>((resolve, reject) => {
    const token = tokenStore.get();
    uni.request({
      url: `${BASE_URL}${path}${qs}`,
      method,
      data,
      header: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res) => {
        const body = res.data as ApiEnvelope<T> | { code: number; message: string };
        if (res.statusCode === 401) tokenStore.clear();
        if (res.statusCode >= 200 && res.statusCode < 300 && (body as any).code === 200) {
          resolve((body as ApiEnvelope<T>).data);
        } else {
          reject(new Error((body as any)?.message || `请求失败 (${res.statusCode})`));
        }
      },
      fail: (err) => reject(new Error(err?.errMsg || "网络错误")),
    });
  });
}

export function absUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  return `${BASE_URL.replace(/\/api\/?$/, "")}${url}`;
}
