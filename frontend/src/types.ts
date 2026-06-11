export interface Author {
  id: string;
  nickname: string;
  avatarUrl: string;
}

export interface Category {
  id: number;
  name: string;
  type: string;
  parentId: number | null;
  icon: string;
  sortOrder: number;
  /** null = 系统分类；uuid = 该用户自建分类 */
  ownerId?: string | null;
}

export interface Ingredient {
  id: number;
  ingredientId: number | null;
  name: string;
  groupName: string; // "主料" or "调料" or "固定用量"
  amount: number;
  unit: string;
  scaleType: "linear" | "sub_linear" | "fixed";
  scaleFactor: number;
  sortOrder: number;
  note: string | null;
  unitPrice?: number;
}

export interface Step {
  id: number;
  stepNumber: number;
  description: string;
  images: string[];
  timerSeconds: number | null;
  timerLabel: string | null;
  timerType: string | null;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  coverImageUrl: string;
  baseServings: number;
  servingUnit: string;
  difficulty: "easy" | "medium" | "hard";
  cookTime: string;
  mealScene: string;
  tags: string[];
  isPublic: boolean;
  isFeatured?: boolean;
  viewCount?: number;
  favoriteCount?: number;
  ratingAvg?: number;
  cookingTips?: string;
  categories?: { id: number; name: string }[];
  ingredients: Ingredient[];
  steps: Step[];
  estimatedCost: number;
  author?: Author;
  isFavorited?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type StorageType = "room_temp" | "refrigerated" | "frozen";

export interface UserIngredient {
  id: string;
  ingredientId: number | null;
  name: string;
  customName: string | null;
  unitPrice: number;
  priceUnit: string;
  supplier: string;
  lastPurchased: string;
  isFresh: boolean;
  expiryDate: string | null;       // ISO date (YYYY-MM-DD), null = 未填
  storageType: StorageType | null; // null = 未指定
  stockAmount: number | null;      // 当前库存数量
  stockUnit: string | null;        // 库存单位（默认同 priceUnit）
  categoryId: number | null;       // 食材分类 id（直接存在 user_ingredients 表上）
  categoryName: string | null;     // 分类名（便于前端按类聚合）
}

export interface Timer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  status: "running" | "paused" | "completed";
  type: "countdown" | "stopwatch";
  startedAt?: string;
  pausedAt?: string;
}

export interface CookingLog {
  id: string;
  recipe: { id: string; title: string; coverImageUrl: string };
  targetServings: number;
  multiplier: number;
  servingUnit: string;
  totalCost: number;
  rating: number;
  notes: string;
  startedAt: string;
  completedAt: string;
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatarUrl: string;
  phone: string | null;
  role: string;
  points: number;
  stats: {
    recipeCount: number;
    cookingCount: number;
    favoriteCount: number;
  };
  createdAt: string;
  autoDeductStock?: boolean;
}
