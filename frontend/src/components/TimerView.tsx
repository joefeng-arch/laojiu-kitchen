import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Timer as TimerIcon, Plus, Play, Pause, X, RotateCcw, CheckCircle, PlusCircle } from "lucide-react";
import { Timer } from "../types";
import { api } from "../api";

/** Scroll-wheel number picker (0..max) */
function ScrollPicker({ value, max, onChange, label }: { value: number; max: number; onChange: (v: number) => void; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ITEM_H = 40; // px per item

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = value * ITEM_H;
  }, []);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(max, idx));
    if (clamped !== value) onChange(clamped);
  };

  const items = Array.from({ length: max + 1 }, (_, i) => i);

  return (
    <div className="flex flex-col items-center w-16">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[120px] overflow-y-auto snap-y snap-mandatory no-scrollbar"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {/* Top spacer */}
        <div style={{ height: ITEM_H }} />
        {items.map((n) => (
          <div
            key={n}
            onClick={() => { onChange(n); if (containerRef.current) containerRef.current.scrollTop = n * ITEM_H; }}
            className="snap-center flex items-center justify-center cursor-pointer"
            style={{ height: ITEM_H }}
          >
            <span className={`font-mono text-2xl font-bold transition-colors ${n === value ? "text-[#ab3500]" : "text-gray-300"}`}>
              {String(n).padStart(2, "0")}
            </span>
          </div>
        ))}
        {/* Bottom spacer */}
        <div style={{ height: ITEM_H }} />
      </div>
      <span className="text-[10px] text-gray-400 font-bold mt-1">{label}</span>
    </div>
  );
}

export default function TimerView() {
  const { t } = useTranslation();
  const [timers, setTimers] = useState<Timer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newHours, setNewHours] = useState(0);
  const [newMinutes, setNewMinutes] = useState(15);
  const [newSeconds, setNewSeconds] = useState(30);

  // Interval reference for timing ticks
  const tickInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTimers();
    return () => {
      if (tickInterval.current) clearInterval(tickInterval.current);
    };
  }, []);

  const loadTimers = async () => {
    try {
      const res = await api.getTimers();
      setTimers(res);
      startTicks();
    } catch (e) {
      console.error(e);
    }
  };

  const startTicks = () => {
    if (tickInterval.current) clearInterval(tickInterval.current);
    tickInterval.current = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((t) => {
          if (t.status === "running") {
            const nextRemaining = t.remainingSeconds - 1;
            if (nextRemaining <= 0) {
              return { ...t, remainingSeconds: 0, status: "completed" };
            }
            return { ...t, remainingSeconds: nextRemaining };
          }
          return t;
        })
      );
    }, 1000);
  };

  const handlePause = async (id: string) => {
    try {
      await api.pauseTimer(id);
      setTimers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "paused" } : t))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.resumeTimer(id);
      setTimers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "running" } : t))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTimer(id);
      setTimers((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestart = async (id: string) => {
    // restart completed timer
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, remainingSeconds: t.totalSeconds, status: "running" }
          : t
      )
    );
  };

  const handleCreateTimer = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalSecs = (Number(newHours) * 3600) + (Number(newMinutes) * 60) + Number(newSeconds);
    if (totalSecs <= 0) {
      alert(t('timer.custom.alertZeroDuration'));
      return;
    }

    try {
      const created = await api.createTimer({
        label: newLabel.trim() || t('timer.custom.defaultLabel'),
        totalSeconds: totalSecs,
      });
      setTimers((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setNewLabel("");
      setNewHours(0);
      setNewMinutes(15);
      setNewSeconds(30);
    } catch (err) {
      console.error(err);
    }
  };

  const formatMinSec = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col min-h-full pb-32">
      {/* Top Header App Bar */}
      <header className="fixed top-0 left-0 w-full z-40 bg-white/94 backdrop-blur-md flex items-center justify-between px-4 h-14 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <TimerIcon className="w-5 h-5 text-[#ab3500]" />
          <h1 className="font-display font-bold text-sm text-gray-800">{t('timer.title')}</h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#ff6b35]/14 text-[#ab3500] active:scale-95 transition-transform"
          aria-label="Add custom timer"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {/* Timer Scroll Workspace */}
      <main className="pt-18 px-4 space-y-4 flex-1">
        
        {timers.map((t) => {
          const isRunning = t.status === "running";
          const isPaused = t.status === "paused";
          const isCompleted = t.status === "completed";
          const percent = isCompleted ? 100 : Math.max(0, Math.min(100, Math.round((t.remainingSeconds / t.totalSeconds) * 100)));

          // Green for fermentation, orange for preheating/running low, grey for paused
          const isLow = t.remainingSeconds > 0 && t.remainingSeconds <= 300;
          const borderClass = isPaused 
            ? "border-l-4 border-gray-400" 
            : isLow 
              ? "border-l-4 border-amber-500" 
              : "border-l-4 border-[#4aad4e]";

          return (
            <div
              key={t.id}
              className="bg-white rounded-xl shadow-tactile border border-gray-150/40 relative overflow-hidden flex flex-col transition-all"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-sm">🔥</span>
                    <span className="text-[11px] font-bold text-gray-500 tracking-wide uppercase">
                      {t.label}
                    </span>
                    {isPaused && (
                      <span className="ml-1.5 px-2 py-0.5 bg-gray-100 text-gray-400 text-[8px] font-bold rounded-full">
                        {t('timer.paused')}
                      </span>
                    )}
                  </div>
                  
                  {isCompleted ? (
                    <div className="flex items-center gap-1 text-[#4aad4e] mt-1">
                      <CheckCircle className="w-4 h-4 fill-current" />
                      <span className="text-sm font-bold">{t('timer.completed')}</span>
                    </div>
                  ) : (
                    <span className={`font-mono text-3xl font-bold tracking-tight ${
                      isLow ? "text-[#ff6b35]" : isRunning ? "text-gray-800" : "text-gray-400"
                    }`}>
                      {formatMinSec(t.remainingSeconds)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <button
                      onClick={() => handleRestart(t.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#ab3500] text-[#ab3500] text-[10px] font-bold bg-white hover:bg-orange-50 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {t('timer.restart')}
                    </button>
                  ) : isRunning ? (
                    <button
                      onClick={() => handlePause(t.id)}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleResume(t.id)}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-[#ff6b35] text-white shadow-md active:scale-90 duration-100"
                    >
                      <Play className="w-4 h-4 fill-current text-white" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(t.id)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress shimmer track */}
              {!isCompleted && (
                <div className="h-1 w-full bg-gray-100">
                  <div
                    style={{ width: `${percent}%` }}
                    className={`h-full transition-all duration-1000 ${
                      isLow ? "bg-amber-500" : isRunning ? "bg-[#4aad4e]" : "bg-gray-300"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}

        {timers.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center opacity-35 text-center">
            <TimerIcon className="w-12 h-12 text-gray-400 stroke-1 mb-2 animate-bounce" />
            <p className="text-xs text-gray-500">{t('timer.empty')}</p>
          </div>
        )}
      </main>

      {/* Fixed bottom action button matches image 5 */}
      <div className="fixed bottom-24 left-0 w-full px-4 z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full py-3.5 bg-[#ab3500] hover:bg-[#ff6b35] text-white rounded-full font-bold flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-transform duration-150 leading-none text-xs tracking-wider"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('timer.custom.title')}</span>
        </button>
      </div>

      {/* Customizable timer slider drawer sheet */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop screen filter */}
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />
          
          {/* Slider Drawer card body */}
          <div className="relative w-full max-w-md bg-white rounded-t-[28px] p-6 shadow-2xl z-10 animate-slide-up border-t border-gray-100">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="font-display font-bold text-lg text-gray-800 mb-5">{t('timer.custom.create')}</h2>
            
            <form onSubmit={handleCreateTimer} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 tracking-wide">{t('timer.custom.nameLabel')}</label>
                <input
                  type="text"
                  placeholder={t('timer.custom.namePlaceholder')}
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl focus:border-[#ab3500] focus:ring-0 text-xs font-medium text-gray-800 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 tracking-wide">{t('timer.custom.durationLabel')}</label>
                <div className="flex items-center justify-center gap-1 bg-gray-50 rounded-2xl py-3 border border-gray-150/40">
                  <ScrollPicker value={newHours} max={23} onChange={setNewHours} label={t('timer.custom.hours') || '时'} />
                  <span className="text-2xl font-mono font-bold text-gray-300 pb-4">:</span>
                  <ScrollPicker value={newMinutes} max={59} onChange={setNewMinutes} label={t('timer.custom.minutes')} />
                  <span className="text-2xl font-mono font-bold text-gray-300 pb-4">:</span>
                  <ScrollPicker value={newSeconds} max={59} onChange={setNewSeconds} label={t('timer.custom.seconds')} />
                </div>
              </div>

              {/* Action buttons drawer */}
              <div className="pt-4 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#ab3500] hover:bg-[#ff6b35] text-white rounded-full font-bold text-xs tracking-wider shadow-md hover:shadow-lg transition-all border-b border-[#832600]"
                >
                  {t('timer.custom.start')}
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
    </div>
  );
}
