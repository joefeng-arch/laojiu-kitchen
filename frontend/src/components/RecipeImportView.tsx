import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronDown, ChevronUp, ClipboardPaste, Loader2, Sparkles } from "lucide-react";
import { api } from "../api";

type ParsedRecipe = Awaited<ReturnType<typeof api.parseRecipeText>>["recipe"];

interface RecipeImportViewProps {
  onBack: () => void;
  onConfirm: (recipe: ParsedRecipe) => void;
}

type ViewMode = "input" | "preview";

export default function RecipeImportView({ onBack, onConfirm }: RecipeImportViewProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // input state
  const [text, setText] = useState("");
  const [mode, setMode] = useState<ViewMode>("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // preview state
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null);
  const [confidence, setConfidence] = useState<"high" | "medium" | "low">("high");
  const [originalText, setOriginalText] = useState("");
  const [showOriginal, setShowOriginal] = useState(false);

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      setText(clipText);
      textareaRef.current?.focus();
    } catch {
      textareaRef.current?.focus();
    }
  };

  const handleAnalyze = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 20) {
      setError(t("import.tooShort"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await api.parseRecipeText(trimmed);
      setParsed(result.recipe);
      setConfidence(result.confidence);
      setOriginalText(result.originalText);
      setMode("preview");
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("频繁") || msg.includes("429")) {
        setError(t("import.rateLimited"));
      } else if (msg.includes("至少20字") || msg.includes("太少")) {
        setError(t("import.tooShort"));
      } else {
        setError(t("import.failed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (parsed) onConfirm(parsed);
  };

  const handleReanalyze = () => {
    setMode("input");
    setParsed(null);
    setError(null);
  };

  const confidenceBadge = () => {
    if (confidence === "high") {
      return <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{t("import.confidenceHigh")}</span>;
    }
    if (confidence === "medium") {
      return <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{t("import.confidenceMedium")}</span>;
    }
    return <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{t("import.confidenceLow")}</span>;
  };

  return (
    <div className="flex flex-col min-h-full bg-[#fcf9f8]">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-40 bg-white border-b border-gray-100 flex items-center gap-3 px-4 h-14 max-w-md mx-auto">
        <button onClick={onBack} className="p-1 -ml-1 text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-base font-bold text-gray-800 flex-1">{t("import.title")}</h1>
        <Sparkles className="w-5 h-5 text-[#ab3500]" />
      </header>

      <div className="pt-14 flex flex-col flex-1 px-4 pb-8">
        {mode === "input" ? (
          /* ── Input mode ── */
          <div className="flex flex-col flex-1 mt-4 gap-4">
            {/* Text area */}
            <div className="relative flex-1 min-h-[220px]">
              <textarea
                ref={textareaRef}
                className="w-full h-full min-h-[220px] p-4 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ab3500]/30 focus:border-[#ab3500] resize-none leading-relaxed shadow-sm"
                placeholder={t("import.inputPlaceholder")}
                value={text}
                onChange={(e) => { setText(e.target.value); setError(null); }}
                disabled={loading}
              />
              {/* Paste button inside textarea top-right */}
              <button
                onClick={handlePaste}
                disabled={loading}
                className="absolute top-3 right-3 flex items-center gap-1.5 text-xs text-[#ab3500] bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-full font-medium transition-colors"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                {t("import.paste")}
              </button>
            </div>

            {/* Char count */}
            <div className="text-right text-xs text-gray-400">{text.length} / 5000</div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                {error}
              </div>
            )}

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={loading || text.trim().length === 0}
              className={`w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                loading || text.trim().length === 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-[#ab3500] hover:bg-[#ff6b35] text-white shadow-md active:scale-95"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("import.analyzing")}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t("import.analyze")}
                </>
              )}
            </button>

            {/* Tips */}
            <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-700 leading-relaxed border border-amber-100">
              <p className="font-bold mb-1">小贴士</p>
              <p>支持直接粘贴小红书、抖音、微博等平台复制的菜谱文本，建议包含食材用量和步骤描述，识别效果更佳。</p>
            </div>
          </div>
        ) : (
          /* ── Preview mode ── */
          parsed && (
            <div className="flex flex-col gap-4 mt-4">
              {/* Confidence badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">{t("import.parsedTitle")}</span>
                {confidenceBadge()}
              </div>

              {confidence !== "high" && (
                <div className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100">
                  {t("import.lowConfidence")}
                </div>
              )}

              {/* Title */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">标题</p>
                <p className="font-display font-bold text-lg text-gray-800">{parsed.title}</p>
                {parsed.description ? (
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{parsed.description}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 mt-3">
                  {parsed.totalMinutes && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                      {t("import.time")}: {parsed.totalMinutes}分钟
                    </span>
                  )}
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    {t("import.difficulty")}: {
                      parsed.difficulty === "easy" ? "简单" : parsed.difficulty === "medium" ? "中等" : "困难"
                    }
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    {t("import.servings")}: {parsed.baseServings}份
                  </span>
                </div>
              </div>

              {/* Ingredients */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
                  {t("import.ingredients")} ({parsed.ingredients.length})
                </p>
                {(() => {
                  type IngredientItem = (typeof parsed.ingredients)[number];
                  const groups: Record<string, IngredientItem[]> = {};
                  for (const i of parsed.ingredients) {
                    const g = i.groupName || "主料";
                    if (!groups[g]) groups[g] = [];
                    groups[g].push(i);
                  }
                  return Object.entries(groups).map(([group, items]) => (
                    <div key={group} className="mb-3 last:mb-0">
                      <p className="text-[10px] text-gray-400 font-bold mb-1.5">{group}</p>
                      <div className="space-y-1.5">
                        {items.map((ing, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 font-medium">{ing.name}</span>
                            <span className={`text-xs ${ing.amount === 0 ? "text-amber-500" : "text-gray-500"}`}>
                              {ing.amount === 0 ? "适量" : `${ing.amount}${ing.unit}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Steps */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
                  {t("import.steps")} ({parsed.steps.length})
                </p>
                <div className="space-y-3">
                  {parsed.steps.map((step) => (
                    <div key={step.stepNumber} className="flex gap-3">
                      <span className="flex-none w-6 h-6 rounded-full bg-[#ab3500] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                        {step.stepNumber}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 leading-relaxed">{step.description}</p>
                        {step.durationSeconds && step.durationSeconds > 0 ? (
                          <span className="text-[10px] text-[#ab3500] font-bold mt-1 inline-block">
                            ⏱ {Math.round(step.durationSeconds / 60)}分钟
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Original text (collapsible) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium">{t("import.originalText")}</span>
                  {showOriginal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showOriginal && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {originalText}
                    </p>
                  </div>
                )}
              </div>

              {/* Tip before confirm */}
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-700">
                <span className="mt-0.5 text-base leading-none">💡</span>
                <span>确认导入后可以进入菜谱编辑界面修改哦，食材用量、步骤描述都可以调整。</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleReanalyze}
                  className="flex-1 h-11 rounded-2xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-95"
                >
                  {t("import.reanalyze")}
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-[2] h-11 rounded-2xl bg-[#ab3500] hover:bg-[#ff6b35] text-white text-sm font-bold shadow-md transition-all active:scale-95"
                >
                  {t("import.confirm")}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
