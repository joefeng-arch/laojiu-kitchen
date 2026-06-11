import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus, Calendar, Edit2, Trash2, Tag, ShoppingBag, Droplet, Layers, Snowflake, Thermometer, AlertTriangle, Sparkles, Link2, ShoppingCart, PackagePlus, ChevronDown, ChevronUp } from "lucide-react";
import { UserIngredient, StorageType, Category } from "../types";
import { api } from "../api";
import FeatureHint from "./FeatureHint";
import { normalizeUnit, prettyAmount, SUPPORTED_UNITS_HINT } from "../lib/units";

// Storage labels are resolved via i18n inside the component
const STORAGE_KEYS: Record<StorageType, string> = {
  room_temp: "pantry.storage.room_temp",
  refrigerated: "pantry.storage.refrigerated",
  frozen: "pantry.storage.frozen",
};

const STORAGE_STYLES: Record<StorageType, string> = {
  room_temp: "bg-amber-50 text-amber-700 border-amber-200",
  refrigerated: "bg-sky-50 text-sky-700 border-sky-200",
  frozen: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

/**
 * 单价格式化 — 用户友好展示
 * 内部存储: 元/g 或 元/ml 或 元/个
 * 展示规则:
 *   重量(g): < 0.1元/g → 显示 ¥/斤(×500)；≥ 0.1 → 显示 ¥/g
 *   体积(ml): < 0.1元/ml → 显示 ¥/L(×1000)；≥ 0.1 → 显示 ¥/ml
 *   个数(count): 显示 ¥/个
 */
function formatPrice(unitPrice: number, priceUnit: string): string {
  if (!unitPrice || unitPrice <= 0) return "—";
  const pu = (priceUnit || "").toLowerCase();
  if (pu === "g") {
    if (unitPrice < 0.1) {
      return `¥${(unitPrice * 500).toFixed(2)}/斤`;
    }
    return `¥${unitPrice.toFixed(2)}/g`;
  }
  if (pu === "ml") {
    if (unitPrice < 0.1) {
      return `¥${(unitPrice * 1000).toFixed(2)}/L`;
    }
    return `¥${unitPrice.toFixed(2)}/ml`;
  }
  if (pu === "count" || pu === "个") {
    return `¥${unitPrice.toFixed(2)}/个`;
  }
  return `¥${unitPrice.toFixed(2)}/${priceUnit}`;
}

// 把后端 ISO 时间戳格式化为 "2026-05-27" 或 i18n 相对日期
function formatPurchaseDate(raw: string | null | undefined, t: (key: string, opts?: any) => string): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - start.getTime()) / 86400000);
  if (diff === 0) return t('pantry.date.today');
  if (diff === 1) return t('pantry.date.yesterday');
  if (diff > 1 && diff < 7) return t('pantry.date.daysAgo', { days: diff });
  if (diff >= 7 && diff < 30) return t('pantry.date.weeksAgo', { weeks: Math.floor(diff / 7) });
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (y === today.getFullYear()) return `${m}-${day}`;
  return `${y}-${m}-${day}`;
}

// 返回 [文案, 是否已过期, 是否即将过期(≤3天)]
function describeExpiry(expiryDate: string | null, t: (key: string, opts?: any) => string): [string, boolean, boolean] {
  if (!expiryDate) return [t('pantry.expiry.none'), false, false];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(expiryDate);
  if (isNaN(d.getTime())) return [t('pantry.expiry.none'), false, false];
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return [t('pantry.expiry.expired', { days: -diffDays }), true, false];
  if (diffDays === 0) return [t('pantry.expiry.expiresToday'), false, true];
  if (diffDays <= 3) return [t('pantry.expiry.daysLeft', { days: diffDays }), false, true];
  return [t('pantry.expiry.until', { date: expiryDate }), false, false];
}

interface PantryViewProps {
  onNavigate?: (view: string) => void;
}

export default function PantryView({ onNavigate }: PantryViewProps = {}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<UserIngredient[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("__all__");

  // 从 API 拉取 ingredient 类型的分类
  const [ingredientCategories, setIngredientCategories] = useState<Category[]>([]);

  // Exhausted section toggle
  const [showExhausted, setShowExhausted] = useState(false);
  // Restock modal
  const [restockItem, setRestockItem] = useState<UserIngredient | null>(null);
  const [restockAmount, setRestockAmount] = useState("");
  const [restockUnit, setRestockUnit] = useState("斤");
  const [restockCost, setRestockCost] = useState("");

  // Edit modal (full bottom sheet)
  const [editItem, setEditItem] = useState<UserIngredient | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Add Item Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  // 公共食材搜索自动补全
  const [nameSuggestions, setNameSuggestions] = useState<Array<{ id: number; name: string; categoryName?: string; defaultUnit: string; referencePrice: number }>>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [linkedIngredientId, setLinkedIngredientId] = useState<number | null>(null);
  // 食材分类
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  // 用户只填三个核心：买了多少 + 单位 + 总花费。单价由系统自动算
  const [amount, setAmount] = useState("");           // 买了多少（用户原始数字）
  const [amountUnit, setAmountUnit] = useState("斤"); // 用户原始单位
  const [totalCost, setTotalCost] = useState("");     // 总花费 ¥
  const [supplier, setSupplier] = useState("永辉超市");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [storageType, setStorageType] = useState<StorageType>("room_temp");

  // 实时预览（用户输入的瞬间算出 canonical + 单价）
  const previewNorm = (() => {
    const amt = parseFloat(amount);
    if (!isFinite(amt) || amt <= 0) return null;
    return normalizeUnit(amt, amountUnit);
  })();
  const previewUnitPrice = (() => {
    if (!previewNorm) return null;
    const cost = parseFloat(totalCost);
    if (!isFinite(cost) || cost <= 0) return null;
    return cost / previewNorm.amount;
  })();

  useEffect(() => {
    loadPantry();
    loadCategories();
  }, []);

  const loadPantry = async () => {
    try {
      const res = await api.getUserIngredients();
      setItems(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await api.getCategories("ingredient");
      setIngredientCategories(cats);
    } catch (e) {
      console.error(e);
    }
  };

  // 食材名输入时搜索公共食材库做自动补全
  useEffect(() => {
    if (!name || name.trim().length < 1) {
      setNameSuggestions([]);
      return;
    }
    if (linkedIngredientId) return; // 已关联就不再搜
    const handle = setTimeout(async () => {
      try {
        const list = await api.searchIngredients(name.trim());
        setNameSuggestions(list.slice(0, 8));
      } catch {
        setNameSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [name, linkedIngredientId]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('pantry.confirmRemove'))) return;
    try {
      await api.deleteUserIngredient(id);
      setItems(items.filter(item => item.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const amtNum = parseFloat(amount);
    if (!isFinite(amtNum) || amtNum <= 0) {
      alert(t('pantry.addModal.alertEnterAmount'));
      return;
    }
    const costNum = parseFloat(totalCost);
    if (!isFinite(costNum) || costNum <= 0) {
      alert(t('pantry.addModal.alertEnterCost'));
      return;
    }

    // 转 canonical
    const norm = normalizeUnit(amtNum, amountUnit);
    if (!norm) {
      alert(t('pantry.addModal.unitNotSupported', { unit: amountUnit }));
      return;
    }

    const canonicalUnit = norm.unit; // "g" | "ml" | "count"
    // round 到 2 位小数防浮点尾巴
    const stockAmountRounded = Math.round(norm.amount * 100) / 100;
    // 单价保留 4 位小数（后端 DTO/列也都是 4 位）
    const unitPriceRounded = Math.round((costNum / norm.amount) * 10000) / 10000;

    try {
      const created = await api.addUserIngredient({
        ingredientId: linkedIngredientId ?? null,
        customName: name.trim(),
        unitPrice: unitPriceRounded,
        priceUnit: canonicalUnit,
        supplier: supplier.trim() || "本地市场",
        expiryDate: expiryDate || null,
        storageType,
        stockAmount: stockAmountRounded,
        stockUnit: canonicalUnit,
        categoryId: selectedCategoryId,
      });
      setItems([created, ...items]);
      setIsModalOpen(false);
      setName("");
      setLinkedIngredientId(null);
      setSelectedCategoryId(null);
      setNameSuggestions([]);
      setAmount("");
      setAmountUnit("斤");
      setTotalCost("");
      setSupplier("永辉超市");
      setExpiryDate("");
      setStorageType("room_temp");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || t('common.saveFailed'));
    }
  };

  // 补货处理
  const handleRestock = async () => {
    if (!restockItem) return;
    const amt = parseFloat(restockAmount);
    if (!isFinite(amt) || amt <= 0) {
      alert('请输入补货数量');
      return;
    }
    const norm = normalizeUnit(amt, restockUnit);
    if (!norm) {
      alert(t('pantry.addModal.unitNotSupported', { unit: restockUnit }));
      return;
    }
    const currentStock = restockItem.stockAmount ?? 0;
    const newStock = Math.round((currentStock + norm.amount) * 100) / 100;

    // 如果填了花费，更新单价
    const costNum = parseFloat(restockCost);
    const patch: any = { stockAmount: newStock, stockUnit: norm.unit };
    if (isFinite(costNum) && costNum > 0 && norm.amount > 0) {
      patch.unitPrice = Math.round((costNum / norm.amount) * 10000) / 10000;
      patch.priceUnit = norm.unit;
    }

    try {
      await api.updateUserIngredient(restockItem.id, patch);
      setItems(items.map(it => it.id === restockItem.id ? {
        ...it, stockAmount: newStock, stockUnit: norm.unit,
        ...(patch.unitPrice != null ? { unitPrice: patch.unitPrice, priceUnit: patch.priceUnit } : {}),
      } : it));
      setRestockItem(null);
      setRestockAmount("");
      setRestockUnit("斤");
      setRestockCost("");
    } catch (e: any) {
      alert(e?.message || t('common.saveFailed'));
    }
  };

  // 编辑食材保存
  const handleSaveEdit = async () => {
    if (!editItem) return;
    const patch: any = {};
    if (editForm.customName !== undefined && editForm.customName !== editItem.name) patch.customName = editForm.customName;
    if (editForm.categoryId !== undefined) patch.categoryId = editForm.categoryId;
    if (editForm.storageType !== undefined) patch.storageType = editForm.storageType;
    if (editForm.supplier !== undefined) patch.supplier = editForm.supplier;
    if (editForm.expiryDate !== undefined) patch.expiryDate = editForm.expiryDate || null;

    // 库存
    if (editForm.stockAmount !== undefined) {
      const norm = normalizeUnit(parseFloat(editForm.stockAmount) || 0, editForm.stockUnit || "g");
      if (norm) {
        patch.stockAmount = Math.round(norm.amount * 100) / 100;
        patch.stockUnit = norm.unit;
      }
    }

    // 价格: 用户输入 "购买数量 + 花费" → 自动算单价
    const buyAmt = parseFloat(editForm.buyAmount);
    const buyCost = parseFloat(editForm.buyCost);
    if (isFinite(buyAmt) && buyAmt > 0 && isFinite(buyCost) && buyCost > 0) {
      const buyNorm = normalizeUnit(buyAmt, editForm.buyUnit || "斤");
      if (buyNorm && buyNorm.amount > 0) {
        patch.unitPrice = Math.round((buyCost / buyNorm.amount) * 10000) / 10000;
        patch.priceUnit = buyNorm.unit;
      }
    }

    try {
      const updated = await api.updateUserIngredient(editItem.id, patch);
      // Merge changes back
      setItems(items.map(it => it.id === editItem.id ? { ...it, ...updated } : it));
      await loadPantry(); // reload to get fresh data
      setEditItem(null);
    } catch (e: any) {
      alert(e?.message || t('common.saveFailed'));
    }
  };

  const openEditModal = (item: UserIngredient) => {
    const stockNorm = item.stockAmount != null && item.stockUnit
      ? normalizeUnit(item.stockAmount, item.stockUnit)
      : null;
    setEditForm({
      customName: item.name,
      categoryId: item.categoryId ?? null,
      storageType: item.storageType ?? "room_temp",
      supplier: item.supplier ?? "",
      expiryDate: item.expiryDate ?? "",
      stockAmount: item.stockAmount != null ? String(item.stockAmount) : "",
      stockUnit: item.stockUnit ?? "g",
      buyAmount: "",
      buyUnit: "斤",
      buyCost: "",
    });
    setEditItem(item);
  };

  // 标签从 API 分类生成：全部 + ingredient 类型分类 + 未分类
  const catTabs: Array<{ key: string; label: string; catId: number | null }> = [
    { key: "__all__", label: t('common.all'), catId: null },
    ...ingredientCategories.map((c) => ({ key: `cat_${c.id}`, label: c.name, catId: c.id })),
    { key: "__uncategorized__", label: t('common.uncategorized'), catId: -1 },
  ];

  // 标签计数
  const tabCount = (tab: { key: string; catId: number | null }) => {
    if (tab.catId === null) return items.length;
    if (tab.catId === -1) return items.filter((it) => !it.categoryId).length;
    return items.filter((it) => it.categoryId === tab.catId).length;
  };

  // Filter logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                          (item.supplier && item.supplier.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    if (activeTab === "__all__") return true;
    if (activeTab === "__uncategorized__") return !item.categoryId;
    const matchedCat = catTabs.find((ct) => ct.key === activeTab);
    if (matchedCat && matchedCat.catId && matchedCat.catId > 0) return item.categoryId === matchedCat.catId;
    return false;
  });

  return (
    <div className="flex flex-col min-h-full pb-36">
      {/* Top App Bar Header */}
      <header className="fixed top-0 left-0 w-full z-40 bg-white border-b border-gray-100 flex items-center justify-between px-4 h-14">
        <h1 className="font-display font-bold text-sm text-gray-800">老舅厨房</h1>
        {onNavigate && (
          <button
            onClick={() => onNavigate("shopping-list")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-[#ab3500] rounded-full text-xs font-bold hover:bg-orange-100 transition"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {t('pantry.goShoppingList', '采购清单')}
          </button>
        )}
      </header>

      {/* Main Container contents */}
      <main className="pt-16 px-4 flex-1 flex flex-col">
        <div className="mt-2 mb-4">
          <h2 className="font-display font-bold text-xl text-gray-800">{t('pantry.title')}</h2>
        </div>

        <FeatureHint hintKey="pantry_hint" message={t('hints.pantry')} position="bottom" className="mb-2" />

        {/* Inputs Search bar & Category filters */}
        <div className="space-y-4 mb-5 min-w-0">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              placeholder={t('pantry.search.placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-12 pr-4 bg-white border border-gray-150 rounded-2xl focus:ring-2 focus:ring-[#ab3500] focus:outline-none focus:border-transparent text-xs font-semibold text-gray-700 placeholder:text-gray-300 transition-all font-sans"
            />
          </div>

          {/* Scrolling pill options — -mx-4 px-4 突破父 padding 让滚动到屏幕边缘 */}
          <div
            className="flex gap-2 pb-1 -mx-4 px-4 min-w-0"
            style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {catTabs.map((tab) => {
              const active = activeTab === tab.key;
              const count = tabCount(tab);
              if (tab.catId === -1 && count === 0) return null;
              return (
                <button
                  key={tab.key}
                  className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-150 ${
                    active ? "bg-[#ab3500] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-bold ${active ? "text-white/70" : "text-gray-400"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pantry List — split into in-stock and exhausted */}
        {(() => {
          const inStock = filteredItems.filter(it => (it.stockAmount ?? 1) > 0);
          const exhausted = filteredItems.filter(it => it.stockAmount != null && it.stockAmount <= 0);

          const renderCard = (item: UserIngredient, isExhausted = false) => {
            const [expiryText, isExpired, isExpiringSoon] = describeExpiry(item.expiryDate, t);
            return (
              <div
                key={item.id}
                className={`bg-white p-4 rounded-2xl shadow-tactile border flex justify-between items-start ${
                  isExhausted ? "border-gray-200 opacity-70" : isExpired ? "border-red-200" : "border-gray-150/45"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm font-bold ${isExhausted ? "text-gray-400" : "text-gray-800"}`}>{item.name}</span>
                    {isExhausted && (
                      <span className="bg-gray-100 text-gray-400 text-[8px] font-bold px-1.5 py-0.5 rounded">
                        {t('pantry.exhausted', '已耗尽')}
                      </span>
                    )}
                    {item.categoryName && (
                      <span className="bg-orange-50 text-[#ab3500] text-[8px] font-bold px-1.5 py-0.5 rounded border border-orange-200">
                        {item.categoryName}
                      </span>
                    )}
                    {!isExhausted && item.isFresh && !isExpired && (
                      <span className="bg-[#c4efa3] text-[#0a2100] text-[8px] font-bold px-1.5 py-0.5 rounded">
                        {t('pantry.fresh')}
                      </span>
                    )}
                    {item.storageType && (
                      <span className={`inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded border ${STORAGE_STYLES[item.storageType]}`}>
                        {item.storageType === "frozen" ? <Snowflake className="w-2.5 h-2.5" /> : item.storageType === "refrigerated" ? <Droplet className="w-2.5 h-2.5" /> : <Thermometer className="w-2.5 h-2.5" />}
                        {t(STORAGE_KEYS[item.storageType])}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 stroke-[1.8]" />
                    <span>{t('pantry.supplier', { name: item.supplier || t('pantry.supplierDefault') })}</span>
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 stroke-[1.8]" />
                    <span>{t('pantry.lastPurchased', { date: formatPurchaseDate(item.lastPurchased, t) })}</span>
                  </p>
                  {item.stockAmount != null && item.stockUnit && (() => {
                    const norm = normalizeUnit(item.stockAmount, item.stockUnit);
                    const display = norm ? prettyAmount(norm) : `${item.stockAmount}${item.stockUnit}`;
                    return (
                      <p className={`text-[10px] font-bold flex items-center gap-1 ${isExhausted ? "text-red-400" : "text-gray-500"}`}>
                        <Layers className="w-3.5 h-3.5 stroke-[1.8]" />
                        <span>
                          {t('pantry.stock', { display })}
                          {!isExhausted && <span className="text-gray-300 font-normal ml-1">≈ ¥{(item.stockAmount * item.unitPrice).toFixed(2)}</span>}
                        </span>
                      </p>
                    );
                  })()}
                  {!isExhausted && (
                    <p className={`text-[10px] font-bold flex items-center gap-1 ${isExpired ? "text-red-500" : isExpiringSoon ? "text-amber-600" : "text-gray-400"}`}>
                      {isExpired || isExpiringSoon ? <AlertTriangle className="w-3.5 h-3.5 stroke-[1.8]" /> : <Calendar className="w-3.5 h-3.5 stroke-[1.8]" />}
                      <span>{expiryText}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3 self-stretch justify-between">
                  <span className="text-[#ab3500] text-sm font-bold whitespace-nowrap">
                    {formatPrice(item.unitPrice, item.priceUnit)}
                  </span>
                  <div className="flex gap-1.5">
                    {isExhausted && (
                      <button
                        onClick={() => { setRestockItem(item); setRestockAmount(""); setRestockUnit("斤"); setRestockCost(""); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-green-50 text-green-600 text-[10px] font-bold hover:bg-green-100 transition-all active:scale-95"
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                        补货
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(item)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-[#ab3500] hover:bg-orange-50 transition-all active:scale-90"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:text-red-500 hover:bg-red-100/50 transition-all active:scale-90"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          };

          return (
            <section className="space-y-3 flex-1">
              {/* In-stock items */}
              {inStock.map(item => renderCard(item, false))}

              {/* Exhausted section */}
              {exhausted.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowExhausted(!showExhausted)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-400 hover:bg-gray-100 transition-colors"
                  >
                    <span>{t('pantry.exhaustedSection', { count: exhausted.length }) || `已耗尽（${exhausted.length}项）`}</span>
                    {showExhausted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showExhausted && (
                    <div className="mt-2 space-y-3">
                      {exhausted.map(item => renderCard(item, true))}
                    </div>
                  )}
                </div>
              )}

              {filteredItems.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center opacity-30 text-center">
                  <Layers className="w-12 h-12 text-gray-300 stroke-1 mb-2 animate-bounce" />
                  <p className="text-xs text-gray-500">{t('pantry.empty')}</p>
                </div>
              )}
            </section>
          );
        })()}

        {/* Cooking commonly Spices segment */}
        {activeTab === "__all__" && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="flex items-center gap-2 text-gray-400 text-xs font-bold after:content-[''] after:h-[1px] after:flex-1 after:bg-gray-150">
                {t('pantry.quickPrices.title')}
              </h3>
            </div>
            <div className="bg-white rounded-2xl border border-gray-150/40 shadow-tactile overflow-hidden text-xs mb-4">
              <div className="flex justify-between items-center p-4 border-b border-gray-100 hover:bg-gray-50">
                <span className="font-bold text-gray-700">{t('pantry.quickPrices.soySauce')}</span>
                <span className="text-[#ab3500] font-bold">¥0.02/ml</span>
              </div>
              <div className="flex justify-between items-center p-4 border-b border-gray-100 hover:bg-gray-50">
                <span className="font-bold text-gray-700">{t('pantry.quickPrices.darkSoySauce')}</span>
                <span className="text-[#ab3500] font-bold">¥0.03/ml</span>
              </div>
              <div className="flex justify-between items-center p-4 hover:bg-gray-50">
                <span className="font-bold text-gray-700">{t('pantry.quickPrices.salt')}</span>
                <span className="text-[#ab3500] font-bold">¥0.003/g</span>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Floating Add Pantry Item Trigger */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-4 z-40 bg-[#4aad4e] hover:bg-[#006e1c] text-white rounded-full px-5 py-3 shadow-lg hover:shadow-xl flex items-center gap-1.5 active:scale-95 duration-100 transition-all border-b border-[#053113]"
        aria-label="Add Ingredient"
      >
        <Plus className="w-4 h-4" />
        <span className="text-xs font-bold tracking-wider leading-none">{t('pantry.addModal.submit')}</span>
      </button>

      {/* Add Pantry Item Modal drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative w-full max-w-md bg-white rounded-t-[28px] p-6 shadow-2xl z-10 animate-slide-up border-t border-gray-100">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="font-display font-bold text-lg text-gray-800 mb-5">{t('pantry.addModal.title')}</h2>

            <form onSubmit={handleCreateIngredient} className="space-y-4 text-xs font-semibold">
              {/* 食材名称 + 自动补全 */}
              <div className="space-y-1 relative">
                <label className="text-gray-400">{t('pantry.addModal.nameLabel')}</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder={t('pantry.addModal.namePlaceholder')}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setLinkedIngredientId(null); // 文字变了就取消关联
                      setShowNameSuggestions(true);
                    }}
                    onFocus={() => { if (name) setShowNameSuggestions(true); }}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl focus:border-[#ab3500] focus:ring-0 text-xs font-medium text-gray-800 focus:bg-white"
                    required
                  />
                  {linkedIngredientId && (
                    <span title={t('pantry.addModal.linkedHint')} className="text-emerald-600 shrink-0">
                      <Link2 className="w-4 h-4" />
                    </span>
                  )}
                </div>
                {showNameSuggestions && nameSuggestions.length > 0 && !linkedIngredientId && (
                  <ul className="absolute z-30 left-0 right-0 top-[calc(100%+2px)] bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
                    {nameSuggestions.map((s) => (
                      <li
                        key={s.id}
                        onClick={() => {
                          setName(s.name);
                          setLinkedIngredientId(s.id);
                          setShowNameSuggestions(false);
                          // 自动填充分类（如果公共食材有 categoryName）
                          if (s.categoryName) {
                            const matchedCat = ingredientCategories.find((c) => c.name === s.categoryName);
                            if (matchedCat) setSelectedCategoryId(matchedCat.id);
                          }
                        }}
                        className="px-3 py-2 text-xs text-gray-700 hover:bg-amber-50 cursor-pointer flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1.5">
                          {s.name}
                          {s.categoryName && (
                            <span className="text-[8px] text-gray-400 bg-gray-100 rounded px-1">{s.categoryName}</span>
                          )}
                        </span>
                        <span className="text-[10px] text-gray-400">{s.defaultUnit}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 食材分类 */}
              <div className="space-y-1.5">
                <label className="text-gray-400">{t('pantry.addModal.categoryLabel')}</label>
                <div className="flex gap-1.5 flex-wrap">
                  {ingredientCategories.map((c) => {
                    const active = selectedCategoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(active ? null : c.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          active
                            ? "bg-[#ab3500] text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 买了多少 + 单位 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-gray-400">{t('pantry.addModal.amountLabel')}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="例如：2"
                    value={amount}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v);
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl focus:border-[#ab3500] focus:ring-0 text-xs font-medium text-gray-800 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-400">{t('pantry.addModal.unitLabel')}</label>
                  <input
                    type="text"
                    placeholder="斤"
                    value={amountUnit}
                    onChange={(e) => setAmountUnit(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl focus:border-[#ab3500] focus:ring-0 text-xs font-medium text-gray-800 focus:bg-white"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-300 -mt-2 leading-snug">{SUPPORTED_UNITS_HINT}</p>

              {/* 总花费 */}
              <div className="space-y-1">
                <label className="text-gray-400">{t('pantry.addModal.costLabel')}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="例如：36"
                  value={totalCost}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setTotalCost(v);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl focus:border-[#ab3500] focus:ring-0 text-xs font-medium text-gray-800 focus:bg-white"
                />
              </div>

              {/* 实时预览：让用户立刻看到系统是怎么理解他的输入的 */}
              {(amount || totalCost) && (
                <div
                  className={`rounded-xl border p-3 flex items-start gap-2 text-[11px] ${
                    previewNorm
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <div className="space-y-0.5 flex-1">
                    {previewNorm ? (
                      <>
                        <div>
                          {t('pantry.addModal.stockConversion', {
                            from: amount, fromUnit: amountUnit,
                            to: prettyAmount(previewNorm), toUnit: ''
                          }).replace(/\s+$/, '')}
                        </div>
                        {previewUnitPrice != null && (
                          <div>
                            {t('pantry.addModal.autoPrice', {
                              price: previewUnitPrice.toFixed(4),
                              unit: previewNorm.unit === "count" ? "个" : previewNorm.unit
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        {t('pantry.addModal.unitNotSupported', { unit: amountUnit })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-gray-400">{t('pantry.addModal.supplierLabel')}</label>
                <input
                  type="text"
                  placeholder={t('pantry.addModal.supplierPlaceholder')}
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl focus:border-[#ab3500] focus:ring-0 text-xs font-medium text-gray-800 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400">{t('pantry.addModal.expiryLabel')}</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl focus:border-[#ab3500] focus:ring-0 text-xs font-medium text-gray-800 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400">{t('pantry.addModal.storageLabel')}</label>
                <div className="flex gap-2">
                  {(Object.keys(STORAGE_KEYS) as StorageType[]).map((s) => {
                    const active = storageType === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStorageType(s)}
                        className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          active
                            ? "bg-[#ab3500] text-white border-[#832600]"
                            : "bg-gray-50 text-gray-500 border-gray-150 hover:bg-gray-100"
                        }`}
                      >
                        {s === "frozen" ? (
                          <Snowflake className="w-3.5 h-3.5" />
                        ) : s === "refrigerated" ? (
                          <Droplet className="w-3.5 h-3.5" />
                        ) : (
                          <Thermometer className="w-3.5 h-3.5" />
                        )}
                        {t(STORAGE_KEYS[s])}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons drawer */}
              <div className="pt-4 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#ab3500] hover:bg-[#ff6b35] text-white rounded-full font-bold text-xs tracking-wider shadow-md hover:shadow-lg transition-all border-b border-[#832600]"
                >
                  {t('pantry.addModal.submit')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2.5 text-center text-xs text-gray-400 font-bold hover:text-gray-600 transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal — 简洁补货 */}
      {restockItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div onClick={() => setRestockItem(null)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white rounded-t-[28px] p-6 shadow-2xl z-10 animate-slide-up">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-display font-bold text-base text-gray-800 mb-1">
              补货 — {restockItem.name}
            </h3>
            <p className="text-[10px] text-gray-400 mb-4">输入本次购入量和花费，系统自动更新单价</p>

            <div className="space-y-3">
              {/* 购入量 */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">购入量</label>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="数量" value={restockAmount} onChange={(e) => setRestockAmount(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-150 rounded-xl text-sm font-bold text-[#ab3500] focus:outline-none focus:ring-2 focus:ring-[#ab3500]/30" autoFocus />
                  <select value={restockUnit} onChange={(e) => setRestockUnit(e.target.value)}
                    className="px-3 py-2.5 bg-gray-50 border border-gray-150 rounded-xl text-sm font-bold text-gray-600 focus:outline-none">
                    <option value="斤">斤</option><option value="两">两</option><option value="g">克</option>
                    <option value="kg">千克</option><option value="ml">毫升</option><option value="L">升</option>
                    <option value="个">个</option><option value="包">包</option><option value="瓶">瓶</option>
                  </select>
                </div>
              </div>

              {/* 本次花费 */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">本次花费（选填）</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 font-bold">¥</span>
                  <input type="number" placeholder="金额" value={restockCost} onChange={(e) => setRestockCost(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-150 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ab3500]/30" />
                </div>
              </div>

              {/* 换算预览 */}
              {(() => {
                const amt = parseFloat(restockAmount);
                const cost = parseFloat(restockCost);
                if (isFinite(amt) && amt > 0 && isFinite(cost) && cost > 0) {
                  const norm = normalizeUnit(amt, restockUnit);
                  if (norm) {
                    const newUnitPrice = cost / norm.amount;
                    return (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-[11px] text-green-700">
                        换算：{amt}{restockUnit} 花 ¥{cost.toFixed(2)} → 单价 {formatPrice(newUnitPrice, norm.unit)}
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setRestockItem(null)} className="flex-1 py-2.5 text-xs font-bold text-gray-400 hover:text-gray-600">取消</button>
              <button onClick={handleRestock} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full text-xs font-bold transition-colors">确认补货</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ingredient Bottom Sheet */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div onClick={() => setEditItem(null)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white rounded-t-[28px] p-6 shadow-2xl z-10 animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-display font-bold text-base text-gray-800 mb-4">编辑食材</h3>

            <div className="space-y-4">
              {/* 名称 */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">食材名称</label>
                <input type="text" value={editForm.customName ?? ""} onChange={(e) => setEditForm({ ...editForm, customName: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-150 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ab3500]/30" />
              </div>

              {/* 分类 */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">食材分类</label>
                <select value={editForm.categoryId ?? ""} onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-150 rounded-xl text-sm text-gray-700 focus:outline-none">
                  <option value="">未分类</option>
                  {ingredientCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* 当前库存 */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">当前库存</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={editForm.stockAmount ?? ""} onChange={(e) => setEditForm({ ...editForm, stockAmount: e.target.value })}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-150 rounded-xl text-sm font-bold text-[#ab3500] focus:outline-none focus:ring-2 focus:ring-[#ab3500]/30" />
                  <select value={editForm.stockUnit ?? "g"} onChange={(e) => setEditForm({ ...editForm, stockUnit: e.target.value })}
                    className="px-3 py-2.5 bg-gray-50 border border-gray-150 rounded-xl text-sm text-gray-600 focus:outline-none">
                    <option value="g">克(g)</option><option value="ml">毫升(ml)</option><option value="count">个</option>
                  </select>
                </div>
              </div>

              {/* 采购价格 */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">采购价格（选填，修改后更新单价）</label>
                <p className="text-[9px] text-gray-300 mb-2">
                  当前单价：{formatPrice(editItem.unitPrice, editItem.priceUnit)}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl">
                      <span className="text-[10px] text-gray-400">购买</span>
                      <input type="number" placeholder="数量" value={editForm.buyAmount ?? ""} onChange={(e) => setEditForm({ ...editForm, buyAmount: e.target.value })}
                        className="flex-1 bg-transparent text-sm font-bold text-gray-700 focus:outline-none text-center" />
                      <select value={editForm.buyUnit ?? "斤"} onChange={(e) => setEditForm({ ...editForm, buyUnit: e.target.value })}
                        className="bg-transparent text-[10px] text-gray-500 font-bold focus:outline-none">
                        <option value="斤">斤</option><option value="两">两</option><option value="g">克</option>
                        <option value="kg">千克</option><option value="ml">毫升</option><option value="L">升</option>
                        <option value="个">个</option>
                      </select>
                    </div>
                  </div>
                  <span className="text-gray-300 font-bold">→</span>
                  <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl">
                    <span className="text-[10px] text-gray-400">¥</span>
                    <input type="number" placeholder="花费" value={editForm.buyCost ?? ""} onChange={(e) => setEditForm({ ...editForm, buyCost: e.target.value })}
                      className="w-16 bg-transparent text-sm font-bold text-[#ab3500] focus:outline-none text-center" />
                  </div>
                </div>
                {/* 换算预览 */}
                {(() => {
                  const ba = parseFloat(editForm.buyAmount);
                  const bc = parseFloat(editForm.buyCost);
                  if (isFinite(ba) && ba > 0 && isFinite(bc) && bc > 0) {
                    const bn = normalizeUnit(ba, editForm.buyUnit || "斤");
                    if (bn) return <p className="text-[10px] text-green-600 mt-1">换算单价：{formatPrice(bc / bn.amount, bn.unit)}</p>;
                  }
                  return null;
                })()}
              </div>

              {/* 供应商 */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">供应商</label>
                <input type="text" value={editForm.supplier ?? ""} onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-150 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ab3500]/30" />
              </div>

              {/* 储存方式 */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">储存方式</label>
                <div className="flex gap-2">
                  {(["room_temp", "refrigerated", "frozen"] as StorageType[]).map((st) => (
                    <button key={st} type="button" onClick={() => setEditForm({ ...editForm, storageType: st })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${editForm.storageType === st ? STORAGE_STYLES[st] + " border-current" : "bg-gray-50 text-gray-400 border-gray-150"}`}>
                      {st === "room_temp" ? "常温" : st === "refrigerated" ? "冷藏" : "冷冻"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 保质期 */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">保质期</label>
                <input type="date" value={editForm.expiryDate ?? ""} onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-150 rounded-xl text-sm text-gray-700 focus:outline-none" />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-2">
              <button onClick={handleSaveEdit}
                className="w-full py-3 bg-[#ab3500] hover:bg-[#ff6b35] text-white rounded-full text-xs font-bold transition-colors">
                保存修改
              </button>
              <button onClick={() => { if (confirm('确定删除此食材？所有采购记录将丢失，此操作不可恢复！')) { handleDelete(editItem.id); setEditItem(null); } }}
                className="w-full py-2.5 text-red-500 text-xs font-bold hover:bg-red-50 rounded-full transition-colors">
                删除此食材
              </button>
              <button onClick={() => setEditItem(null)}
                className="w-full py-2 text-gray-400 text-xs font-bold hover:text-gray-600 transition-colors">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
