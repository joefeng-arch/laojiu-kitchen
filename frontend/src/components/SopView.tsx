import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bell, Flame, ChevronLeft, ChevronRight, Timer, Pause, Play, AlertCircle, AlertTriangle, CheckCircle2, Undo2, PackageX, Share2 } from "lucide-react";
import { Recipe } from "../types";
import { api, DeductionPreview, DeductionResult } from "../api";
import SharePosterModal from "./SharePosterModal";
import FeatureHint from "./FeatureHint";

interface SopViewProps {
  recipeId: string;
  targetServings: number;
  onExit: () => void;
}

export default function SopView({ recipeId, targetServings, onExit }: SopViewProps) {
  const { t } = useTranslation();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [activeTimersCount, setActiveTimersCount] = useState(2);

  // Active step countdown timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 库存预扣检查 + 完成回执
  const [shortagePreview, setShortagePreview] = useState<DeductionPreview | null>(null);
  const [showShortageModal, setShowShortageModal] = useState(false);
  const [deductionReceipt, setDeductionReceipt] = useState<DeductionResult | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(30);
  const [undoUsed, setUndoUsed] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadRecipeData();
  }, [recipeId]);

  // 撤销倒计时
  useEffect(() => {
    if (deductionReceipt && !undoUsed) {
      setUndoCountdown(30);
      undoTimerRef.current = setInterval(() => {
        setUndoCountdown((c) => {
          if (c <= 1) {
            if (undoTimerRef.current) clearInterval(undoTimerRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => {
        if (undoTimerRef.current) clearInterval(undoTimerRef.current);
      };
    }
  }, [deductionReceipt, undoUsed]);

  const loadRecipeData = async () => {
    try {
      const res = await api.getRecipe(recipeId);
      setRecipe(res);
      const mult = targetServings / res.baseServings;
      setMultiplier(mult);

      // Load active timers count
      const active = await api.getTimers();
      setActiveTimersCount(active.filter(t => t.status === "running").length);

      // 预扣检查（无论用户是否开 autoDeductStock 都查；前端决定要不要弹窗）
      try {
        const preview = await api.previewDeduction(recipeId, targetServings);
        setShortagePreview(preview);
        if (preview.hasShortage) {
          setShowShortageModal(true);
        }
      } catch (e) {
        // 失败不阻断烹饪
        console.error("[preview-deduction]", e);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUndoDeduction = async () => {
    if (!deductionReceipt || undoUsed || undoCountdown <= 0) return;
    try {
      await api.undoDeduction(deductionReceipt.undoToken);
      setUndoUsed(true);
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    } catch (e: any) {
      alert(e?.message || t('common.operationFailed'));
    }
  };

  const handleCloseReceipt = () => {
    setDeductionReceipt(null);
    setShowReceipt(false);
    onExit();
  };

  const currentStep = recipe?.steps[currentStepIndex];

  // Initialize countdown whenever step changes
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimerRunning(false);
    if (currentStep?.timerSeconds) {
      setTimeRemaining(currentStep.timerSeconds);
    } else {
      setTimeRemaining(null);
    }
  }, [currentStepIndex, recipe]);

  const handleStartTimer = () => {
    if (timerRunning) {
      // Pause
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerRunning(false);
      api.createTimer({
        label: currentStep?.timerLabel || t('sop.timerLabel', { title: recipe?.title, step: currentStep?.stepNumber }),
        totalSeconds: currentStep?.timerSeconds || 180,
        status: "paused"
      });
    } else {
      // Start
      setTimerRunning(true);
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev !== null && prev > 1) {
            return prev - 1;
          } else {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimerRunning(false);
            // play completion chime
            try {
              alert(t('sop.timerDone', { title: recipe?.title, step: currentStep?.stepNumber }));
            } catch (e) {}
            return 0;
          }
        });
      }, 1000);

      // Add to server timers list
      api.createTimer({
        label: currentStep?.timerLabel || t('sop.timerLabel', { title: recipe?.title, step: currentStep?.stepNumber }),
        totalSeconds: currentStep?.timerSeconds || 180,
        status: "running"
      });
      setActiveTimersCount(prev => prev + 1);
    }
  };

  const handleNextStep = async () => {
    if (recipe && currentStepIndex < recipe.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      return;
    }
    // Complete cooking log — always show receipt
    try {
      const result = await api.completeCooking(recipeId, targetServings, 5, t('sop.allDone'));
      if (result.deduction) {
        setDeductionReceipt(result.deduction);
      }
      setShowReceipt(true);
    } catch (e: any) {
      alert(e?.message || t('sop.logFailed'));
      onExit();
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  if (!recipe || !currentStep) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-white">
        <Timer className="w-10 h-10 text-gray-400 animate-spin" />
        <p className="text-xs text-gray-400 mt-2">{t('sop.loading')}</p>
      </div>
    );
  }

  // Scaling helper for ingredients matching the step description keywords
  const getReferencedIngredients = () => {
    const desc = currentStep.description;
    // Only match ingredient names that are 2+ chars to avoid false positives with short names
    return recipe.ingredients.filter(ing => {
      return ing.name.length >= 2 && desc.includes(ing.name);
    });
  };

  const referencedIngs = getReferencedIngredients();

  const prevStep = currentStepIndex > 0 ? recipe.steps[currentStepIndex - 1] : null;
  const nextStep = currentStepIndex < recipe.steps.length - 1 ? recipe.steps[currentStepIndex + 1] : null;

  const formatMinSec = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#1A1A2E] text-white overflow-hidden pb-24 font-sans select-none">
      {/* Feature hint for SOP mode */}
      <div className="px-4 pt-1">
        <FeatureHint hintKey="sop_mode_hint" message={t('hints.sopMode')} position="bottom" />
      </div>

      {/* Top Navbar */}
      <header className="flex justify-between items-center px-4 h-14 w-full bg-[#1A1A2E] border-b border-white/5 z-40">
        <div className="flex items-center gap-2">
          <button onClick={onBackStep} className="text-white hover:opacity-80">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-display font-bold text-sm text-white">
            {t('sop.stepProgress', { current: currentStep.stepNumber, total: recipe.steps.length })}
          </h1>
        </div>
        <div className="relative flex items-center justify-center w-10 h-10">
          <Bell className="w-5 h-5 text-white" />
          {activeTimersCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow">
              {activeTimersCount}
            </span>
          )}
        </div>
      </header>

      {/* Main Focus Area */}
      <main className="flex-1 flex flex-col px-4 pt-3 pb-8 overflow-y-auto no-scrollbar">
        
        {/* Previous Step (Faded 50% relative) */}
        {prevStep ? (
          <section className="mb-4 opacity-40 px-2 transition-all duration-300">
            <p className="text-[10px] text-gray-400 font-bold mb-0.5">{t('sop.stepLabel', { number: prevStep.stepNumber })}</p>
            <p className="text-xs text-gray-200 line-clamp-1 leading-snug">{prevStep.description}</p>
          </section>
        ) : (
          <div className="h-6" /> // spacer
        )}

        {/* Focus step container card (Image 4 - vibrant design) */}
        <article className="flex-1 min-h-[360px] flex flex-col bg-[#2D5016] rounded-2.5xl p-6 shadow-xl relative overflow-hidden transition-all duration-300 border border-white/10">
          {/* Subtle overlay illustration */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <img 
              alt="Cook illustration overlay" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfuNgcvM449Adt0na-r-z8PGrjf1CjlTWT-vjhBxRv2hPkTrl3yoxJ9u0lCOWYIAFRsuIZeuw4M4r1BCcLTeK4tJWu0hcYjMQZbJPclaIFa-_3mxmmDlsdj2Nn4B4hSS7NP_3vpmBV1sJ2HOmI3vSl1mRYSPvE6lU61njIRqrIg_7J_UXodQGmEHdhKhKJIg82WymdcSxYEKhb11WBtUzPm_XNhiUS8S5Ysc0KIHXSoJUgrqgV4LNaocG115_6w5EzonwShZNmq2ln" 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative z-10 flex flex-col h-full justify-between">
            {/* Step text instruction scaled visible from distance */}
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="font-display font-semibold text-lg md:text-xl text-white text-center leading-relaxed tracking-wide px-1">
                {currentStep.description}
              </h2>

              {/* Dynamic references parameters tags chips inside step */}
              {referencedIngs.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-8 max-h-24 overflow-y-auto no-scrollbar">
                  {referencedIngs.map((ing) => {
                    let scaledVal = ing.amount;
                    if (ing.scaleType === "linear") {
                      scaledVal = ing.amount * multiplier;
                    } else if (ing.scaleType === "sub_linear") {
                      scaledVal = ing.amount * Math.sqrt(multiplier);
                    } else if (ing.scaleType === "fixed") {
                      scaledVal = ing.amount;
                    }

                    return (
                      <div
                        key={ing.id}
                        className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-full px-3 py-1.5"
                      >
                        <span className="text-[10px] text-white/92 font-bold select-none">
                          {ing.name} {Math.round(scaledVal)}{ing.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step trigger timer controls if defined */}
            {currentStep.timerSeconds ? (
              <div className="mt-8">
                <button
                  onClick={handleStartTimer}
                  className={`w-full py-3.5 rounded-full flex items-center justify-center gap-2 shadow-lg transition-all duration-150 active:scale-95 border-b border-black/10 font-bold text-sm ${
                    timerRunning
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "bg-[#4aad4e] hover:bg-[#006e1c] text-white"
                  }`}
                >
                  <Timer className="w-4 h-4 text-white/94" />
                  <span>
                    {timerRunning
                      ? `${t('sop.timerRunning')} ${timeRemaining !== null ? formatMinSec(timeRemaining) : "0:00"}`
                      : `${t('sop.timerStart')} ${formatMinSec(timeRemaining || currentStep.timerSeconds)}`
                    }
                  </span>
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-[10px] text-white/50">{t('sop.noTimer')}</p>
              </div>
            )}
          </div>
        </article>

        {/* Next Step (Faded 50% relative preview) */}
        {nextStep ? (
          <section className="mt-4 opacity-40 px-2 transition-all duration-300">
            <p className="text-[10px] text-gray-400 font-bold mb-0.5">{t('sop.stepLabel', { number: nextStep.stepNumber })}</p>
            <p className="text-xs text-gray-200 line-clamp-1 leading-snug">{nextStep.description}</p>
          </section>
        ) : (
          <div className="h-6" /> // spacer
        )}
      </main>

      {/* Floating active background timers preview bar */}
      <div className="fixed top-20 right-4 z-50">
        <div className="bg-[#ff6b35]/25 border border-[#ff6b35]/30 backdrop-blur-md px-3.5 py-1 rounded-full flex items-center gap-1 shadow-md animate-pulse">
          <span className="text-xs">🔥</span>
          <span className="text-[10px] font-bold text-[#FFA726]">{t('sop.activeTimers', { count: activeTimersCount })}</span>
        </div>
      </div>

      {/* Bottom fixed navigation bar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-[#1A1A2E] border-t border-white/5 flex flex-col items-center pt-3 pb-8 px-4">
        <div className="w-full flex gap-3">
          <button
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
            className={`flex-1 flex items-center justify-center gap-1 border border-white/10 hover:bg-white/5 text-xs font-bold py-3.5 rounded-full transition-all active:scale-95 ${
              currentStepIndex === 0 ? "opacity-30 pointer-events-none" : "text-gray-300"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t('sop.prevStep')}</span>
          </button>
          <button
            onClick={handleNextStep}
            className="flex-1 flex items-center justify-center gap-1 bg-[#43682b] hover:bg-[#2c4f15] text-white text-xs font-bold py-3.5 rounded-full transition-all active:scale-95 shadow-md border-b border-black/15"
          >
            <span>{currentStepIndex === recipe.steps.length - 1 ? t('sop.finish') : t('sop.nextStep')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onExit}
          className="mt-3.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {t('sop.exit')}
        </button>
      </nav>

      {/* 缺货预警弹窗 */}
      {showShortageModal && shortagePreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowShortageModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 text-gray-800 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-display font-bold text-base">{t('sop.shortage.title')}</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {t('sop.shortage.desc')}
            </p>
            <ul className="space-y-2 mb-5">
              {shortagePreview.matches
                .filter((m) => m.status !== "ok")
                .map((m, i) => {
                  const isShort = m.status === "short";
                  const isUnmatched = m.status === "unmatched";
                  const isNoStock = m.status === "no_stock";
                  const isUnitMismatch = m.status === "unit_mismatch";
                  return (
                    <li
                      key={i}
                      className={`rounded-lg p-3 text-xs border ${
                        isUnmatched
                          ? "bg-red-50 border-red-200"
                          : "bg-amber-50 border-amber-200"
                      }`}
                    >
                      <div className="font-bold text-gray-800 flex items-center justify-between">
                        <span>{m.recipe.name}</span>
                        {isUnmatched && (
                          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">{t('sop.shortage.notInPantry')}</span>
                        )}
                        {isNoStock && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{t('sop.shortage.noStock')}</span>
                        )}
                        {isUnitMismatch && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{t('sop.shortage.unitMismatch')}</span>
                        )}
                      </div>
                      <div className="text-gray-500 mt-1">
                        {t('sop.shortage.need')} <span className="text-amber-700 font-semibold">{m.recipe.displayAmount}</span>
                        {isShort && (
                          <>
                            {t('sop.shortage.stockIs')} <span className="text-gray-700 font-semibold">{m.userIngredient?.displayStock}</span>
                            {typeof m.deficit === "number" && (
                              <span className="text-red-500 ml-1">{t('sop.shortage.deficit', { amount: m.deficit.toFixed(0), unit: m.recipe.unit })}</span>
                            )}
                          </>
                        )}
                        {isNoStock && <>{t('sop.shortage.noStockDetail')}</>}
                        {isUnmatched && <>{t('sop.shortage.unmatchedDetail')}</>}
                        {isUnitMismatch && m.userIngredient && (
                          <>{t('sop.shortage.stockIs')} <span className="text-gray-700 font-semibold">{m.userIngredient.displayStock}</span></>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowShortageModal(false);
                  onExit();
                  // 简化：直接退出回 detail；用户可去食材库
                }}
                className="flex-1 py-3 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                {t('sop.shortage.goShop')}
              </button>
              <button
                onClick={() => setShowShortageModal(false)}
                className="flex-1 py-3 rounded-full bg-[#ab3500] text-white text-xs font-bold hover:bg-[#ff6b35]"
              >
                {t('sop.shortage.continueCooking')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 完成回执：始终显示 */}
      {showReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 text-gray-800 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="font-display font-bold text-base">{t('sop.receipt.title')}</h3>
            </div>

            {deductionReceipt && deductionReceipt.deducted.length > 0 ? (
              <>
                <p className="text-xs text-gray-500 mb-4">{t('sop.receipt.deducted')}</p>
                <div className="space-y-1.5 mb-3">
                  {deductionReceipt.deducted.map((d) => (
                    <div key={d.userIngredientId} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">· {d.name}</span>
                      <span className="text-gray-500">
                        {d.displayAmount}
                        <span className="text-[#ab3500] font-semibold ml-2">¥{d.estimatedCost.toFixed(2)}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 mb-4 flex justify-between text-xs font-bold">
                  <span>{t('sop.receipt.totalCost')}</span>
                  <span className="text-[#ab3500]">¥{deductionReceipt.totalEstimatedCost.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500 mb-4">{deductionReceipt ? t('sop.receipt.noDeduction') : t('sop.allDone')}</p>
            )}

            {/* 未关联库存提示 */}
            {deductionReceipt && deductionReceipt.matches.filter((m) => m.status === "unmatched" || m.status === "unit_mismatch" || m.status === "no_stock").length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-1 text-xs font-bold text-amber-700 mb-1">
                  <PackageX className="w-3.5 h-3.5" />
                  {t('sop.receipt.unmatched')}
                </div>
                <ul className="text-[11px] text-gray-600 space-y-0.5">
                  {deductionReceipt.matches
                    .filter((m) => m.status === "unmatched" || m.status === "unit_mismatch" || m.status === "no_stock")
                    .map((m, i) => (
                      <li key={i}>
                        · {m.recipe.name}
                        {m.status === "unit_mismatch" && <span className="text-amber-600 ml-1">{t('sop.receipt.unitMismatch')}</span>}
                        {m.status === "no_stock" && <span className="text-amber-600 ml-1">{t('sop.receipt.noStockNote')}</span>}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* 无扣减时的提示 */}
            {!deductionReceipt && (
              <div className="bg-gray-50 border border-gray-150 rounded-lg p-3 mb-4 text-[11px] text-gray-500 leading-relaxed">
                {t('sop.receipt.tipBefore')}
                <span className="inline-flex items-center mx-1 align-middle">
                  <Undo2 className="w-3 h-3 rotate-180" />
                </span>
                {t('sop.receipt.tipAfter')}
              </div>
            )}

            <div className="flex gap-2">
              {deductionReceipt && !undoUsed && undoCountdown > 0 ? (
                <button
                  onClick={handleUndoDeduction}
                  className="flex-1 py-3 rounded-full border border-amber-300 text-amber-700 bg-amber-50 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  {t('sop.receipt.undo', { seconds: undoCountdown })}
                </button>
              ) : deductionReceipt ? (
                <div className="flex-1 py-3 rounded-full bg-gray-50 text-gray-300 text-xs font-bold text-center">
                  {undoUsed ? t('sop.receipt.undone') : t('sop.receipt.undoExpired')}
                </div>
              ) : null}
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center justify-center gap-1 px-4 py-3 rounded-full border border-[#ab3500] text-[#ab3500] text-xs font-bold hover:bg-orange-50"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCloseReceipt}
                className="flex-1 py-3 rounded-full bg-[#ab3500] text-white text-xs font-bold hover:bg-[#ff6b35]"
              >
                {t('sop.receipt.done')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Poster Modal */}
      {showShareModal && recipe && (
        <SharePosterModal recipe={recipe} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );

  function onBackStep() {
    onExit();
  }
}
