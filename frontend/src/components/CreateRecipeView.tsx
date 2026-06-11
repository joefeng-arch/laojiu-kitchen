import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Plus, Trash2, Scale, ListPlus, ToggleLeft, ToggleRight, ArrowDownUp, Info, Clock, PlayCircle, X, Check, Link2, Search, Layers, Globe, Lock, Sparkles } from "lucide-react";
import { Recipe, Ingredient, Step, Category, UserIngredient } from "../types";
import { api } from "../api";
import FeatureHint from "./FeatureHint";

type ImportedRecipeData = Awaited<ReturnType<typeof api.parseRecipeText>>["recipe"];

interface CreateRecipeViewProps {
  onCancel: () => void;
  onSaveSuccess: () => void;
  editRecipeId?: string | null;
  initialData?: ImportedRecipeData | null;
  onClickImport?: () => void;
}

/**
 * 食材名自由文本输入框 + 搜索下拉建议。
 * 输入时同时搜索「公共食材库」和「我的食材库」，合并展示。
 * 用户可以选择一条建议（自动关联 ingredientId），也可以直接手动输入任意文本（customName）。
 */
function IngredientNameInput({
  value,
  linkedId,
  pantry,
  onChange,
  onPick,
}: {
  value: string;
  linkedId: number | null;
  pantry: UserIngredient[];
  onChange: (name: string) => void;
  onPick: (picked: { id: number; name: string; defaultUnit: string }) => void;
}) {
  const { t } = useTranslation();
  const [publicHits, setPublicHits] = useState<Array<{ id: number; name: string; defaultUnit: string }>>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 搜索公共食材库
  useEffect(() => {
    if (!value || value.trim().length < 1) {
      setPublicHits([]);
      return;
    }
    if (linkedId) return;
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        const list = await api.searchIngredients(value.trim());
        setPublicHits(list.slice(0, 6));
      } catch {
        setPublicHits([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [value, linkedId]);

  // 过滤我的食材库（本地 fuzzy）
  const pantryHits = (() => {
    if (!value || value.trim().length < 1) return [];
    const q = value.trim().toLowerCase();
    return pantry.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  })();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const hasSuggestions = publicHits.length > 0 || pantryHits.length > 0;

  return (
    <div ref={ref} className="relative flex-[2]">
      <div className="flex items-center gap-1">
        <input
          className="w-full bg-transparent border-none focus:ring-0 text-xs text-gray-700 font-medium placeholder:text-gray-300"
          placeholder={t('create.ingredients.namePlaceholder')}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => { if (value) setOpen(true); }}
          type="text"
        />
        {linkedId ? (
          <span title={t('create.ingredients.linkedHint')} className="text-emerald-600">
            <Link2 className="w-3 h-3" />
          </span>
        ) : null}
      </div>
      {open && !linkedId && value && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {/* 我的食材库匹配 */}
          {pantryHits.length > 0 && (
            <>
              <div className="px-2 py-1 bg-gray-50 text-[10px] font-bold text-gray-400 sticky top-0 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {t('create.ingredients.myPantry')}
              </div>
              {pantryHits.map((p) => (
                <div
                  key={`p-${p.id}`}
                  onClick={() => {
                    if (p.ingredientId != null) {
                      onPick({ id: p.ingredientId, name: p.name, defaultUnit: p.priceUnit || "g" });
                    } else {
                      onChange(p.name);
                    }
                    setOpen(false);
                  }}
                  className="px-2 py-1.5 text-xs text-gray-700 hover:bg-amber-50 cursor-pointer flex items-center justify-between"
                >
                  <span className="flex items-center gap-1">
                    {p.name}
                    {p.categoryName && (
                      <span className="text-[8px] text-gray-400 bg-gray-100 rounded px-1">{p.categoryName}</span>
                    )}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {p.stockAmount != null ? `库存 ${p.stockAmount}${p.stockUnit ?? ""}` : ""}
                  </span>
                </div>
              ))}
            </>
          )}
          {/* 公共食材库匹配 */}
          {publicHits.length > 0 && (
            <>
              <div className="px-2 py-1 bg-gray-50 text-[10px] font-bold text-gray-400 sticky top-0 flex items-center gap-1">
                <Search className="w-3 h-3" />
                {t('create.ingredients.publicLibrary')}
              </div>
              {publicHits.map((h) => (
                <div
                  key={`pub-${h.id}`}
                  onClick={() => {
                    onPick(h);
                    setOpen(false);
                  }}
                  className="px-2 py-1.5 text-xs text-gray-700 hover:bg-amber-50 cursor-pointer flex items-center justify-between"
                >
                  <span>{h.name}</span>
                  <span className="text-[10px] text-gray-400">{h.defaultUnit}</span>
                </div>
              ))}
            </>
          )}
          {/* 无匹配时提示 */}
          {!hasSuggestions && !loading && (
            <div className="text-[10px] text-gray-400 px-2 py-2">
              {t('create.ingredients.noMatch')}
            </div>
          )}
          {loading && !hasSuggestions && (
            <div className="text-[10px] text-gray-400 px-2 py-2">{t('create.ingredients.searching')}</div>
          )}
        </div>
      )}
    </div>
  );
}

const INGREDIENT_GROUPS = ["主料", "腌料", "配料", "调料"] as const;
type IngredientGroup = typeof INGREDIENT_GROUPS[number];

export default function CreateRecipeView({ onCancel, onSaveSuccess, editRecipeId, initialData, onClickImport }: CreateRecipeViewProps) {
  const { t } = useTranslation();
  const isEdit = !!editRecipeId;
  const [coverUrl, setCoverUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [baseServings, setBaseServings] = useState(1);
  const [servingUnit, setServingUnit] = useState("份");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [cookTime, setCookTime] = useState("30-60min");
  const [tags, setTags] = useState<string[]>(["中餐", "家常菜"]);

  // Ingredients and Steps state
  const [ingredients, setIngredients] = useState<Partial<Ingredient>[]>([
    { name: "", groupName: "主料", amount: 100, unit: "g", scaleType: "linear" },
    { name: "", groupName: "调料", amount: 5, unit: "g", scaleType: "sub_linear" }
  ]);

  const [steps, setSteps] = useState<Partial<Step>[]>([
    { stepNumber: 1, description: "", timerSeconds: 180, timerLabel: "定时", timerType: "countdown" }
  ]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 多分类（recipe 类型）
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  // 是否公开到发现页
  const [isPublic, setIsPublic] = useState(false);

  // 当前用户的食材库（供 IngredientNameInput 在「我的食材库」tab 中选用）
  const [pantry, setPantry] = useState<UserIngredient[]>([]);

  // "其他分组"下拉菜单开关
  const [addGroupMenuOpen, setAddGroupMenuOpen] = useState(false);

  // 点击外部关闭"其他分组"下拉
  useEffect(() => {
    if (!addGroupMenuOpen) return;
    const handler = () => setAddGroupMenuOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [addGroupMenuOpen]);

  useEffect(() => {
    (async () => {
      try {
        const cats = await api.getCategories("recipe");
        setAllCategories(cats);
      } catch (e) {
        console.error(e);
      }
    })();
    (async () => {
      try {
        const list = await api.getUserIngredients();
        setPantry(list);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // 智能导入预填：initialData 优先于 editRecipeId
  useEffect(() => {
    if (!initialData) return;
    setTitle(initialData.title ?? "");
    setDescription(initialData.description ?? "");
    setDifficulty((initialData.difficulty as any) ?? "medium");
    if (initialData.totalMinutes) setCookTime(`${initialData.totalMinutes}min`);
    setBaseServings(initialData.baseServings ?? 2);
    if (initialData.ingredients?.length) {
      setIngredients(
        initialData.ingredients.map((i) => ({
          name: i.name,
          groupName: i.groupName ?? "主料",
          amount: i.amount,
          unit: i.unit,
          scaleType: (i.scaleType as any) ?? "linear",
          ingredientId: null,
        })),
      );
    }
    if (initialData.steps?.length) {
      setSteps(
        initialData.steps.map((s) => ({
          stepNumber: s.stepNumber,
          description: s.description,
          timerSeconds: s.durationSeconds ?? 0,
          timerLabel: s.durationSeconds ? "计时" : "",
          timerType: s.durationSeconds ? "countdown" : null,
        })),
      );
    }
  }, [initialData]);

  // 编辑模式：加载现有菜谱回填表单
  useEffect(() => {
    if (!editRecipeId) return;
    (async () => {
      try {
        const r = await api.getRecipe(editRecipeId);
        setTitle(r.title ?? "");
        setDescription(r.description ?? "");
        setCoverUrl(r.coverImageUrl ?? "");
        setBaseServings(r.baseServings ?? 1);
        setServingUnit(r.servingUnit ?? "份");
        setDifficulty((r.difficulty as any) ?? "medium");
        setCookTime(r.cookTime ?? "30-60min");
        setTags(r.tags ?? []);
        setIsPublic(r.isPublic ?? false);
        if (r.ingredients?.length) {
          setIngredients(
            r.ingredients.map((i) => ({
              name: i.name ?? (i as any).customName ?? "",
              ingredientId: (i as any).ingredientId ?? null,
              groupName: i.groupName ?? "主料",
              amount: Number(i.amount) || 0,
              unit: i.unit ?? "g",
              scaleType: (i.scaleType as any) ?? "linear",
            })),
          );
        }
        if (r.steps?.length) {
          setSteps(
            r.steps.map((s, idx) => ({
              stepNumber: s.stepNumber ?? idx + 1,
              description: s.description ?? "",
              timerSeconds: s.timerSeconds ?? 0,
              timerLabel: s.timerLabel ?? "计时",
              timerType: (s.timerType as any) ?? "countdown",
            })),
          );
        }
        if (r.categories?.length) {
          setSelectedCategoryIds(r.categories.map((c) => c.id));
        }
      } catch (e: any) {
        alert(e?.message ?? t('common.loadFailed'));
      }
    })();
  }, [editRecipeId]);

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  };

  const handleCreateCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    setCreatingCat(true);
    try {
      const cat = await api.createMyCategory({ type: "recipe", name });
      const adapted: Category = {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        parentId: null,
        icon: cat.icon ?? "",
        sortOrder: cat.sort ?? 0,
        ownerId: cat.ownerId ?? null,
      };
      setAllCategories((s) => [...s, adapted]);
      setSelectedCategoryIds((s) => [...s, adapted.id]);
      setNewCatName("");
    } catch (e: any) {
      alert(e?.message ?? t('create.category.createFailed'));
    } finally {
      setCreatingCat(false);
    }
  };

  const handleCoverUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.uploadPhoto(file);
      setCoverUrl(url);
    } catch (err: any) {
      alert(`${t('common.operationFailed')}: ${err?.message ?? err}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const lastIngredientRef = useRef<HTMLDivElement>(null);
  const justAddedIngredient = useRef(false);

  // 新增食材后自动滚动到该行
  useEffect(() => {
    if (!justAddedIngredient.current) return;
    justAddedIngredient.current = false;
    setTimeout(() => {
      lastIngredientRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 60);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredients.length]);

  const handleAddIngredient = (group: IngredientGroup) => {
    justAddedIngredient.current = true;
    setIngredients([
      ...ingredients,
      {
        name: "",
        groupName: group,
        amount: 0,
        unit: "g",
        scaleType: group === "调料" || group === "腌料" ? "sub_linear" : "linear",
      },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddStep = () => {
    setSteps([...steps, { stepNumber: steps.length + 1, description: "", timerSeconds: 0, timerLabel: "计时" }]);
  };

  const handleRemoveStep = (index: number) => {
    const filtered = steps.filter((_, i) => i !== index);
    const updated = filtered.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setSteps(updated);
  };

  const handleStepChange = (index: number, field: string, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleSaveRecipe = async (isDraft = false) => {
    if (!title.trim()) {
      alert(t('create.name.required'));
      return;
    }
    // Filter out empty ingredients and steps definitions
    const cleanIngs = ingredients.filter(i => i.name && i.name.trim());
    const cleanSteps = steps.filter(s => s.description && s.description.trim());

    // 完整性提醒：只有当用户选择"发布"（非草稿）时强制要求；草稿允许半成品
    if (!isDraft) {
      if (cleanIngs.length === 0 || cleanSteps.length === 0) {
        const missing = [
          cleanIngs.length === 0 ? t('create.submit.missingIngredients') : null,
          cleanSteps.length === 0 ? t('create.submit.missingSteps') : null,
        ].filter(Boolean).join("、");
        const go = confirm(
          t('create.submit.incomplete', { missing }),
        );
        if (go) isDraft = true;
        else return;
      } else if (cleanIngs.length < 2) {
        if (!confirm(t('create.submit.fewIngredients'))) return;
      }
    }
    // 封面图软性提醒（不强制，用户可以跳过）
    if (!coverUrl && !isDraft) {
      const go = confirm("还没有添加封面图，有图片的菜谱更容易被发现哦 📷\n\n确认不添加，直接保存？");
      if (!go) return;
    }

    // 食材量化提醒：超过一半食材为"适量"时提示
    if (!isDraft) {
      const namedIngs = cleanIngs.filter((i: any) => i.name?.trim());
      const approxCount = namedIngs.filter((i: any) => Number(i.amount) === 0).length;
      if (namedIngs.length > 0 && approxCount > namedIngs.length / 2) {
        const go = confirm(
          `有 ${approxCount} 个食材（超过一半）未填写具体用量。\n\n填写具体用量后，成本估算和采购清单会更准确哦 📊\n\n确认直接保存？`
        );
        if (!go) return;
      }
    }

    setIsSubmitting(true);
    try {
      const willBePublic = !isDraft && isPublic;

      // 公开发布时做文本内容安全检查
      if (willBePublic) {
        const textToCheck = [title, description].filter(Boolean).join("\n");
        try {
          const check = await api.checkTextContent(textToCheck);
          if (!check.safe) {
            alert("内容包含违规信息，请修改后重新发布");
            return;
          }
        } catch (e: any) {
          // 检查接口本身异常（网络超时等）不阻断，仅打日志
          console.warn("内容安全检查异常，已跳过：", e?.message);
        }
      }

      const payload = {
        title,
        description,
        coverImageUrl: coverUrl,
        baseServings,
        servingUnit,
        difficulty,
        cookTime,
        ingredients: cleanIngs as any,
        steps: cleanSteps as any,
        tags,
        isPublic: willBePublic,
        categoryIds: selectedCategoryIds,
      } as any;
      if (isEdit && editRecipeId) {
        await api.updateRecipe(editRecipeId, payload);
      } else {
        await api.createRecipe(payload);
      }
      onSaveSuccess();
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || t(isEdit ? 'create.submit.failedEdit' : 'create.submit.failedCreate');
      alert(t(isEdit ? 'create.submit.failedEdit' : 'create.submit.failedCreate') + '：' + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-40">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 w-full h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-50">
        <button
          onClick={onCancel}
          className="text-gray-500 font-bold hover:bg-gray-50 px-3 py-1.5 rounded-full transition-colors text-xs"
        >
          {t('common.cancel')}
        </button>
        <h1 className="font-display font-bold text-sm text-gray-800">{isEdit ? t('create.titleEdit') : t('create.title')}</h1>
        <button
          onClick={() => handleSaveRecipe(false)}
          disabled={isSubmitting}
          className="text-[#43682b] font-bold hover:bg-[#c1eca1] px-4 py-1.5 rounded-full transition-colors text-xs"
        >
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </header>

      {/* Primary Workspace Scroll Form */}
      <main className="max-w-md w-full mx-auto px-4 pt-16 space-y-6 flex-1">
        {/* AI Import entry point — shown when not in edit mode and handler is provided */}
        {!isEdit && onClickImport && (
          <button
            onClick={onClickImport}
            className="w-full flex items-center gap-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl px-4 py-3 text-left hover:from-orange-100 hover:to-amber-100 transition-colors"
          >
            <span className="w-9 h-9 rounded-full bg-[#ab3500] flex items-center justify-center flex-none">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
            <div>
              <p className="text-sm font-bold text-gray-800">从文本智能导入</p>
              <p className="text-xs text-gray-500 mt-0.5">粘贴小红书、抖音等平台菜谱，AI 自动提取内容</p>
            </div>
          </button>
        )}

        {/* Cover Photo card switcher */}
        <section className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div
            onClick={handleCoverUpload}
            className="relative aspect-[3/2] w-full border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 flex flex-col items-center justify-center space-y-2 text-gray-400 hover:border-[#ff6b35] hover:bg-[#ff6b35]/5 transition-colors cursor-pointer group overflow-hidden"
          >
            {coverUrl ? (
              <>
                <img src={coverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-md">
                  {uploading ? t('create.cover.uploading') : t('create.cover.change')}
                </span>
              </>
            ) : (
              <>
                <Camera className="w-10 h-10 text-gray-300 group-hover:text-[#ff6b35] transition-colors" />
                <span className="text-[11px] font-bold">{uploading ? t('create.cover.uploading') : t('create.cover.add')}</span>
                <span className="text-[10px] text-gray-400">建议上传封面图，让菜谱更吸引人 ✨</span>
              </>
            )}
          </div>
        </section>

        {/* Recipe title Input */}
        <section className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500">
            {t('create.name.label')} <span className="text-[#ff6b35]">*</span>
          </label>
          <input
            className="w-full bg-white border border-gray-150 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent font-medium text-xs text-gray-800 transition-all placeholder:text-gray-300"
            placeholder={t('create.name.placeholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            type="text"
          />
        </section>

        {/* Recipe story */}
        <section className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500">{t('create.story.label')}</label>
          <textarea
            className="w-full bg-white border border-gray-150 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent text-xs text-gray-700 font-medium transition-all placeholder:text-gray-300"
            placeholder={t('create.story.placeholder')}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </section>

        {/* 分类多选 + 创建新分类 */}
        <section className="space-y-2">
          <label className="text-xs font-bold text-gray-500">{t('create.category.label')}</label>
          <div className="flex flex-wrap gap-1.5">
            {allCategories.map((c) => {
              const active = selectedCategoryIds.includes(c.id);
              const isMine = !!c.ownerId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all border ${
                    active
                      ? "bg-[#ab3500] text-white border-[#ab3500]"
                      : isMine
                      ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                  title={isMine ? t('create.category.myCategory') : t('create.category.systemCategory')}
                >
                  {active && <Check className="w-3 h-3" />}
                  {isMine && !active && "★ "}
                  {c.name}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              placeholder={t('create.category.newPlaceholder')}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateCategory();
                }
              }}
              maxLength={32}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#ab3500]"
            />
            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={!newCatName.trim() || creatingCat}
              className="flex items-center gap-1 px-3 py-2 bg-[#ab3500] text-white text-xs font-bold rounded-lg hover:bg-[#ff6b35] disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('create.category.newButton')}
            </button>
          </div>
        </section>

        {/* 是否公开到发现页 */}
        <section className="space-y-1.5">
          <div
            onClick={() => setIsPublic(!isPublic)}
            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
              isPublic
                ? "bg-[#ff6b35]/5 border-[#ff6b35]/30"
                : "bg-white border-gray-150"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isPublic ? (
                <Globe className="w-4.5 h-4.5 text-[#ff6b35]" />
              ) : (
                <Lock className="w-4.5 h-4.5 text-gray-400" />
              )}
              <div>
                <span className="text-xs font-bold text-gray-800">
                  {isPublic ? t('create.visibility.public') : t('create.visibility.private')}
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {isPublic ? t('create.visibility.publicDesc') : t('create.visibility.privateDesc')}
                </p>
              </div>
            </div>
            {isPublic ? (
              <ToggleRight className="w-7 h-7 text-[#ff6b35]" />
            ) : (
              <ToggleLeft className="w-7 h-7 text-gray-300" />
            )}
          </div>
        </section>

        {/* Sliders selectors */}
        <section className="flex flex-wrap gap-2 py-1">
          <button
            onClick={() => setDifficulty(difficulty === "easy" ? "medium" : difficulty === "medium" ? "hard" : "easy")}
            className="flex items-center space-x-1 px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-xs text-gray-700 font-semibold"
          >
            <span>{t('create.meta.difficulty', { level: t(`common.difficulty.${difficulty}`) })}</span>
          </button>
          <button
            onClick={() => setCookTime(cookTime === "15md-30min" ? "30-60min" : cookTime === "30-60min" ? "60min+" : "15md-30min")}
            className="flex items-center space-x-1 px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-xs text-gray-700 font-semibold"
          >
            <span>{t('create.meta.cookTime', { time: cookTime })}</span>
          </button>
        </section>

        {/* Servings stepper */}
        <section className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500">{t('create.servings.label')}</label>
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-white border border-gray-150 rounded-full p-1 leading-none">
              <button
                type="button"
                onClick={() => baseServings > 1 && setBaseServings(baseServings - 1)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-[#ff6b35] active:scale-90 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <span className="px-4 text-sm font-bold text-[#ff6b35]">{baseServings}</span>
              <button
                type="button"
                onClick={() => setBaseServings(baseServings + 1)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-[#ff6b35] active:scale-90 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative flex-1">
              <select
                value={servingUnit}
                onChange={(e) => setServingUnit(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-150 rounded-xl px-4 py-2.5 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
              >
                <option value="份">{t('create.servings.units.serving')}</option>
                <option value="人份">{t('create.servings.units.perPerson')}</option>
                <option value="克">{t('create.servings.units.gram')}</option>
                <option value="碗">{t('create.servings.units.bowl')}</option>
              </select>
            </div>
          </div>
        </section>

        {/* Ingredients configuration lists */}
        <section className="space-y-4">
          <FeatureHint hintKey="create_recipe_scaling" message={t('hints.createRecipe')} position="bottom" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-gray-800">{t('create.ingredients.title')}</h3>
              {/* 量化提示：当"适量"项目数量 > 1 时显示 */}
              {(() => {
                const approxCount = ingredients.filter(i => i.name?.trim() && Number(i.amount) === 0).length;
                return approxCount > 1 ? (
                  <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                    <span>💡</span>
                    <span>有 {approxCount} 个食材未填用量，建议填写具体数值，成本估算和采购清单会更准确</span>
                  </p>
                ) : null;
              })()}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddIngredient("主料")}
                className="bg-[#ab3500]/10 hover:bg-[#ab3500]/15 text-[#ab3500] px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3" />
                {t('create.ingredients.addMain')}
              </button>
              {/* 更多分组下拉 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAddGroupMenuOpen(!addGroupMenuOpen); }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  其他分组
                  <span className="text-[9px] opacity-60">▾</span>
                </button>
                {addGroupMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[90px]">
                    {(["调料", "腌料", "配料"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => { handleAddIngredient(g); setAddGroupMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-orange-50 hover:text-[#ab3500] font-medium"
                      >
                        + 加{g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {ingredients.map((ing, k) => (
              <div
                key={k}
                ref={k === ingredients.length - 1 ? lastIngredientRef : null}
                className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm space-y-2"
              >
                {/* Row 1: Group tag (editable) + Name + Delete */}
                <div className="flex items-center gap-2">
                  <select
                    value={ing.groupName || "主料"}
                    onChange={(e) => handleIngredientChange(k, "groupName", e.target.value)}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-[#ff6b35]/14 text-[#ab3500] shrink-0 border-none focus:ring-1 focus:ring-[#ab3500]/30 cursor-pointer appearance-none"
                    title="点击可修改分组"
                  >
                    {INGREDIENT_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>

                  <IngredientNameInput
                    value={ing.name || ""}
                    linkedId={(ing as any).ingredientId ?? null}
                    pantry={pantry}
                    onChange={(name) => {
                      handleIngredientChange(k, "name", name);
                      handleIngredientChange(k, "ingredientId", null);
                    }}
                    onPick={(picked) => {
                      handleIngredientChange(k, "name", picked.name);
                      handleIngredientChange(k, "ingredientId", picked.id);
                      if (!ing.unit) handleIngredientChange(k, "unit", picked.defaultUnit || "g");
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(k)}
                    className="text-gray-300 hover:text-red-500 p-1 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Row 2: Amount + Unit + Scale type */}
                <div className="flex items-center gap-2 pl-1">
                  <input
                    className="w-20 bg-gray-50 rounded-lg px-2 py-1.5 text-xs text-right text-[#ab3500] font-bold placeholder:text-gray-300 border border-gray-100 focus:outline-none focus:ring-1 focus:ring-[#ab3500]/30"
                    placeholder={t('create.ingredients.amountPlaceholder')}
                    value={ing.amount || ""}
                    onChange={(e) => handleIngredientChange(k, "amount", e.target.value ? Number(e.target.value) : "")}
                    type="number"
                  />

                  <input
                    className="w-14 bg-gray-50 rounded-lg px-2 py-1.5 text-xs text-gray-500 placeholder:text-gray-300 border border-gray-100 focus:outline-none focus:ring-1 focus:ring-[#ab3500]/30"
                    placeholder={t('create.ingredients.unitPlaceholder')}
                    value={ing.unit || ""}
                    onChange={(e) => handleIngredientChange(k, "unit", e.target.value)}
                    type="text"
                  />

                  <select
                    value={ing.scaleType || "linear"}
                    onChange={(e) => handleIngredientChange(k, "scaleType", e.target.value)}
                    className="text-[10px] bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-gray-500 font-bold focus:outline-none focus:ring-1 focus:ring-[#ab3500]/30 cursor-pointer"
                  >
                    <option value="linear">{t('create.ingredients.scaleLinear')}</option>
                    <option value="sub_linear">{t('create.ingredients.scaleSubLinear')}</option>
                    <option value="fixed">{t('create.ingredients.scaleFixed')}</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

        </section>

        {/* Steps and interactive timers config */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-gray-800">{t('create.steps.title')}</h3>
            <button
              type="button"
              onClick={handleAddStep}
              className="bg-[#ab3500] text-white px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm hover:shadow-md hover:bg-[#ff6b35] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('create.steps.add')}
            </button>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-150 rounded-2xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-3 py-1 bg-[#ff6b35]/10 text-[#ab3500] rounded-full">
                    {t('create.steps.step', { number: step.stepNumber })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="text-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  className="w-full bg-gray-50 border-none rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/20 text-xs text-gray-700 placeholder:text-gray-300 font-medium"
                  placeholder={t('create.steps.descPlaceholder')}
                  rows={3}
                  value={step.description || ""}
                  onChange={(e) => handleStepChange(idx, "description", e.target.value)}
                />

                {/* Timer toggle + settings */}
                <div className="pt-2 border-t border-gray-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold">
                      <Clock className="w-4 h-4" />
                      <span>{t('create.steps.timerLabel')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStepChange(idx, "timerSeconds", step.timerSeconds ? 0 : 180)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${step.timerSeconds ? "bg-[#ab3500]" : "bg-gray-200"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${step.timerSeconds ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  {step.timerSeconds > 0 && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-150 px-2 py-1">
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            className="w-10 bg-transparent text-xs text-center text-[#ab3500] font-bold focus:outline-none"
                            value={Math.floor((step.timerSeconds || 0) / 60) || ""}
                            onChange={(e) => {
                              const mins = Math.max(0, Number(e.target.value) || 0);
                              const secs = (step.timerSeconds || 0) % 60;
                              handleStepChange(idx, "timerSeconds", mins * 60 + secs);
                            }}
                          />
                          <span className="text-[10px] text-gray-400 font-bold">分</span>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-150 px-2 py-1">
                          <input
                            type="number"
                            min={0}
                            max={59}
                            placeholder="0"
                            className="w-10 bg-transparent text-xs text-center text-[#ab3500] font-bold focus:outline-none"
                            value={(step.timerSeconds || 0) % 60 || ""}
                            onChange={(e) => {
                              const mins = Math.floor((step.timerSeconds || 0) / 60);
                              const secs = Math.min(59, Math.max(0, Number(e.target.value) || 0));
                              handleStepChange(idx, "timerSeconds", mins * 60 + secs);
                            }}
                          />
                          <span className="text-[10px] text-gray-400 font-bold">秒</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-500 text-xs font-bold">
                          <Scale className="w-4 h-4" />
                          <span>{t('create.steps.tagLabel')}</span>
                        </div>
                        <input
                          type="text"
                          placeholder={t('create.steps.tagPlaceholder')}
                          className="w-32 bg-gray-50 text-xs border border-gray-150 rounded-lg px-2 py-1 text-right text-gray-700 font-medium"
                          value={step.timerLabel || ""}
                          onChange={(e) => handleStepChange(idx, "timerLabel", e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Collapsible Advanced setup */}
        <section className="border-t border-gray-200/60 pt-4">
          <div
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between cursor-pointer group hover:opacity-80"
          >
            <span className="font-display font-semibold text-sm text-gray-500 group-hover:text-gray-800">
              {t('create.advanced.title')}
            </span>
            <Plus className={`w-4 h-4 text-gray-400 transition-transform ${showAdvanced ? "rotate-45" : ""}`} />
          </div>
          {showAdvanced && (
            <div className="mt-3 p-3 bg-white border border-gray-100 rounded-xl space-y-3 shadow-sm text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-500">{t('create.advanced.tagsLabel')}</label>
                <input
                  type="text"
                  placeholder={t('create.advanced.tagsPlaceholder')}
                  className="w-full bg-gray-50 border border-gray-150 rounded-lg p-2 font-medium focus:ring-1 focus:ring-[#ab3500] focus:outline-none"
                  value={tags.join(", ")}
                  onChange={(e) => setTags(e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                />
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Fixed action drawers */}
      <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 shadow-lg z-50">
        <div className="max-w-md mx-auto space-y-3">
          <button
            onClick={() => handleSaveRecipe(false)}
            disabled={isSubmitting}
            className="w-full h-12 bg-[#006e1c] hover:bg-[#2c4f15] text-white rounded-full font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-sm leading-none border-t border-white/10"
          >
            {isEdit ? t('create.submit.saveEdit') : t('create.submit.publish')}
          </button>
          <button
            onClick={() => handleSaveRecipe(true)}
            disabled={isSubmitting}
            className="w-full text-center text-xs text-gray-500 hover:text-[#ab3500] font-bold transition-colors py-1.5"
          >
            {t('create.submit.draft')}
          </button>
        </div>
      </footer>
    </div>
  );
}
