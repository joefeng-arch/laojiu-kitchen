import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  User, BookOpen, Utensils, Heart, ChevronRight, Bell, Settings,
  ArrowRight, Share2, MessageSquare, Info, ShieldCheck, Coins, History,
  Star, PackageMinus, ArrowLeft, Camera, X, FileText, Lock, ExternalLink,
  RefreshCw, CalendarDays, ShoppingCart, HelpCircle,
} from "lucide-react";
import { UserProfile, CookingLog } from "../types";
import { api } from "../api";

interface ProfileViewProps {
  onNavigate: (view: string) => void;
}

// ─── Sub-view: 编辑资料 ───────────────────────────────────────
function EditProfileSubView({
  profile,
  onBack,
  onSaved,
}: {
  profile: UserProfile;
  onBack: () => void;
  onSaved: (p: UserProfile) => void;
}) {
  const { t } = useTranslation();
  const [nickname, setNickname] = useState(profile.nickname);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.uploadPhoto(file);
      setAvatarUrl(url);
    } catch (err: any) {
      alert(t('profile.edit.avatarUploadFailed', { error: err?.message ?? err }));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      alert(t('profile.edit.nicknameRequired'));
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({ nickname: nickname.trim(), avatarUrl });
      onSaved({ ...profile, nickname: nickname.trim(), avatarUrl });
    } catch (err: any) {
      alert(t('profile.edit.saveFailed', { error: err?.message ?? t('common.retry') }));
    } finally {
      setSaving(false);
    }
  };

  const changed = nickname.trim() !== profile.nickname || avatarUrl !== profile.avatarUrl;

  return (
    <div className="flex flex-col min-h-full pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 flex items-center justify-between px-4 h-14">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-800 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display font-bold text-sm text-gray-800">{t('profile.edit.title')}</h1>
        <button
          onClick={handleSave}
          disabled={saving || !changed}
          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
            changed ? "text-[#ab3500] hover:bg-[#ab3500]/10" : "text-gray-300"
          }`}
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </header>

      <main className="px-4 pt-8 space-y-8 flex-1">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <div
            onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 cursor-pointer group shadow-md"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={t('profile.edit.nicknameLabel')} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <User className="w-10 h-10 text-gray-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">{t('profile.edit.avatarHint')}</p>
        </div>

        {/* Nickname */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500">{t('profile.edit.nicknameLabel')}</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            placeholder={t('profile.edit.nicknamePlaceholder')}
            className="w-full bg-white border border-gray-150 rounded-xl px-4 py-3 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#ab3500] focus:border-transparent transition-all placeholder:text-gray-300"
          />
          <p className="text-[10px] text-gray-400 text-right">{nickname.length}/20</p>
        </div>

        {/* Read-only info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-xs text-gray-500">{t('profile.edit.userId')}</span>
            <span className="text-xs text-gray-400 font-mono">{profile.id.slice(0, 8)}…</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-xs text-gray-500">{t('profile.edit.role')}</span>
            <span className="text-xs font-bold text-gray-400">
              {t('profile.edit.roleUser')}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-xs text-gray-500">{t('profile.edit.registeredAt')}</span>
            <span className="text-xs text-gray-400">
              {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("zh-CN") : "—"}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Sub-view: 关于我们 ───────────────────────────────────────
function AboutSubView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col min-h-full pb-24">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 flex items-center px-4 h-14 gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-800 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display font-bold text-sm text-gray-800">{t('profile.about.title')}</h1>
      </header>

      <main className="px-4 pt-8 flex-1 space-y-6">
        {/* Logo + version */}
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff6b35] to-[#ab3500] flex items-center justify-center shadow-lg">
            <Utensils className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-display font-bold text-lg text-gray-800 mt-4">{t('app.name')}</h2>
          <p className="text-xs text-gray-400 mt-1">{t('app.nameEn')}</p>
          <span className="mt-2 text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {t('profile.about.version', { version: '1.0.0' })}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 leading-relaxed text-center px-4">
          {t('profile.about.description')}
        </p>

        {/* Legal links — 小程序审核必需 */}
        <div className="bg-white rounded-2xl shadow-tactile border border-gray-150/50 overflow-hidden">
          <a
            href="/privacy-policy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-4.5 h-4.5 text-gray-400 group-hover:text-[#ab3500]" />
              <span className="text-xs font-semibold text-gray-700">{t('profile.about.privacy')}</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </a>

          <div className="h-[1px] bg-gray-100 mx-4" />

          <a
            href="/user-agreement.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4.5 h-4.5 text-gray-400 group-hover:text-[#ab3500]" />
              <span className="text-xs font-semibold text-gray-700">{t('profile.about.terms')}</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </a>
        </div>

        {/* Contact */}
        <div className="text-center space-y-1 pt-4">
          <p className="text-[10px] text-gray-400">{t('profile.about.contactHint')}</p>
          <p className="text-xs font-bold text-[#ab3500]">joefeng1998@gmail.com</p>
        </div>
      </main>

      <footer className="text-center py-6 opacity-30 text-[10px]">
        <p className="text-gray-500">© 2025 老舅厨房. All rights reserved.</p>
      </footer>
    </div>
  );
}

// ─── Main ProfileView ─────────────────────────────────────────
type SubView = "main" | "edit-profile" | "about";

export default function ProfileView({ onNavigate }: ProfileViewProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<CookingLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [subView, setSubView] = useState<SubView>("main");

  useEffect(() => {
    loadProfileAndHistory();
  }, []);

  const loadProfileAndHistory = async () => {
    try {
      const [p, h] = await Promise.all([
        api.getProfile(),
        api.getCookingHistory().catch(() => [] as CookingLog[]),
      ]);
      setProfile(p);
      setHistory(h);
    } catch (e) {
      console.error(e);
    }
  };

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <History className="w-10 h-10 text-gray-300 animate-spin" />
        <p className="text-xs text-gray-400 mt-2">{t('profile.loading')}</p>
      </div>
    );
  }

  // ─── Sub-view routing ───
  if (subView === "edit-profile") {
    return (
      <EditProfileSubView
        profile={profile}
        onBack={() => setSubView("main")}
        onSaved={(updated) => {
          setProfile(updated);
          setSubView("main");
        }}
      />
    );
  }

  if (subView === "about") {
    return <AboutSubView onBack={() => setSubView("main")} />;
  }

  // ─── Handlers ───
  const handleToggleAutoDeduct = async () => {
    const next = !profile.autoDeductStock;
    setProfile({ ...profile, autoDeductStock: next });
    try {
      await api.updateProfile({ autoDeductStock: next });
    } catch (e) {
      console.error(e);
      setProfile({ ...profile, autoDeductStock: !next });
      alert(t('common.saveFailed'));
    }
  };

  const handleShare = () => {
    // 微信小程序 web-view 内：无法用 JS 直接拉起转发，必须引导用户点右上角「···」
    const inMiniProgram =
      (window as any).__wxjs_environment === "miniprogram" ||
      (typeof (window as any).wx !== "undefined" && (window as any).wx.miniProgram);
    if (inMiniProgram) {
      alert(t('profile.share.wxHint'));
      return;
    }
    // 普通浏览器 / H5：用 Web Share API 或复制链接
    fallbackShare();
  };

  const fallbackShare = () => {
    // H5 / 浏览器环境：尝试 Web Share API，否则复制链接
    if (navigator.share) {
      navigator.share({
        title: t('profile.share.title'),
        text: t('profile.share.text'),
        url: window.location.origin,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.origin)
        .then(() => alert(t('profile.share.copied')))
        .catch(() => alert(t('profile.share.copyFailed')));
    }
  };

  const handleBentoClick = (action: string) => {
    if (action === "pantry") {
      onNavigate("pantry");
    } else if (action === "history") {
      setShowHistory(!showHistory);
    } else if (action === "favorites") {
      onNavigate("home-favorites"); // 跳到首页并切到「我收藏的」tab
    } else {
      alert(t('profile.featureComingSoon', { name: action }));
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-24 select-none">
      {/* Top Navbar */}
      <header className="w-full top-0 sticky z-40 bg-white flex items-center justify-center px-4 py-2 h-14 border-b border-gray-100">
        <h1 className="font-display font-bold text-sm text-gray-800">老舅厨房</h1>
      </header>

      {/* Profile Hero — 点击头像/昵称跳转编辑资料 */}
      <section className="bg-gradient-to-b from-[#2D5016] to-[#43682b] pt-8 pb-10 px-4 text-white text-center rounded-b-[32px] shadow-lg">
        <div className="flex flex-col items-center">
          <div
            onClick={() => setSubView("edit-profile")}
            className="relative group cursor-pointer"
          >
            <div className="w-18 h-18 rounded-full border-4 border-white/20 p-0.5 shadow-md active:scale-95 duration-200 transition-transform bg-white overflow-hidden">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.nickname}
                  className="w-full h-full rounded-full object-cover bg-white"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            {/* Edit hint overlay */}
            <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </div>
          <button
            onClick={() => setSubView("edit-profile")}
            className="flex items-center gap-1.5 mt-3 active:opacity-70 transition-opacity"
          >
            <h2 className="font-display font-bold text-sm tracking-wide text-white">
              {profile.nickname}
            </h2>
            <ChevronRight className="w-3.5 h-3.5 text-white/60" />
          </button>

          {/* User Stats */}
          <div className="flex justify-center gap-6 mt-5 bg-white/10 backdrop-blur-md rounded-2xl py-3 px-8 border border-white/10 shadow-inner w-full max-w-xs">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/70 font-semibold tracking-wider">{t('profile.stats.recipes')}</span>
              <span className="font-display font-bold text-base text-white mt-0.5">{profile.stats.recipeCount}</span>
            </div>
            <div className="w-[1px] bg-white/20 h-6 self-center" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/70 font-semibold tracking-wider">{t('profile.stats.cooking')}</span>
              <span className="font-display font-bold text-base text-white mt-0.5">{profile.stats.cookingCount}</span>
            </div>
            <div className="w-[1px] bg-white/20 h-6 self-center" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/70 font-semibold tracking-wider">{t('profile.stats.favorites')}</span>
              <span className="font-display font-bold text-base text-white mt-0.5">{profile.stats.favoriteCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid - Bento Grid */}
      <section className="mt-6 px-4">
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => handleBentoClick("pantry")}
            className="bg-white p-4 rounded-2xl shadow-tactile border border-gray-150/40 flex flex-col items-center gap-2.5 active:scale-95 duration-100 cursor-pointer hover:bg-gray-50/50"
          >
            <div className="w-12 h-12 rounded-full bg-[#c1eca1] flex items-center justify-center text-[#43682b]">
              <ShieldCheck className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs font-bold text-gray-700 tracking-wide">{t('profile.bento.pantry')}</span>
          </div>

          <div
            onClick={() => handleBentoClick("pantry")}
            className="bg-white p-4 rounded-2xl shadow-tactile border border-gray-150/40 flex flex-col items-center gap-2.5 active:scale-95 duration-100 cursor-pointer hover:bg-gray-50/50"
          >
            <div className="w-12 h-12 rounded-full bg-[#ffdbd0] flex items-center justify-center text-[#ab3500]">
              <Coins className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs font-bold text-gray-700 tracking-wide">{t('profile.bento.cost')}</span>
          </div>

          <div
            onClick={() => handleBentoClick("history")}
            className="bg-white p-4 rounded-2xl shadow-tactile border border-gray-150/40 flex flex-col items-center gap-2.5 active:scale-95 duration-100 cursor-pointer hover:bg-gray-50/50"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <History className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs font-bold text-gray-700 tracking-wide">
              {showHistory ? t('profile.bento.historyCollapse') : t('profile.bento.history')}
            </span>
          </div>

          <div
            onClick={() => handleBentoClick("favorites")}
            className="bg-white p-4 rounded-2xl shadow-tactile border border-gray-150/40 flex flex-col items-center gap-2.5 active:scale-95 duration-100 cursor-pointer hover:bg-gray-50/50"
          >
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-500">
              <Star className="w-6 h-6 stroke-[1.8] fill-current" />
            </div>
            <span className="text-xs font-bold text-gray-700 tracking-wide">{t('profile.bento.favorites')}</span>
          </div>
        </div>
      </section>

      {/* History list */}
      {showHistory && (
        <section className="mt-4 px-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-tactile space-y-3.5">
            <h4 className="text-xs font-bold text-gray-400 tracking-wider">{t('profile.history.title')}</h4>
            {history.length === 0 ? (
              <p className="text-[10px] text-gray-400 text-center py-4">{t('profile.history.empty')}</p>
            ) : (
              history.map((log) => (
                <div key={log.id} className="flex gap-3 justify-between items-start border-b border-gray-50 pb-3 last:border-b-0 last:pb-0 text-xs">
                  <div className="flex gap-2.5 items-center">
                    {log.recipe.coverImageUrl ? (
                      <img src={log.recipe.coverImageUrl} className="w-11 h-11 rounded-lg object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-gray-100" />
                    )}
                    <div>
                      <h5 className="font-bold text-gray-800 line-clamp-1">{log.recipe.title}</h5>
                      <p className="text-[9px] text-gray-400 mt-1">
                        {t('profile.history.meta', { date: new Date(log.startedAt).toLocaleDateString(), servings: log.targetServings, unit: log.servingUnit })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#ab3500]">¥{log.totalCost.toFixed(2)}</span>
                    <div className="flex gap-0.5 text-amber-400 mt-1 justify-end">
                      {Array.from({ length: log.rating }).map((_, k) => (
                        <Star key={k} className="w-2.5 h-2.5 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Auto deduct toggle */}
      <section className="mt-5 px-4">
        <div className="bg-white rounded-2xl shadow-tactile border border-gray-150/50 overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <PackageMinus className="w-4.5 h-4.5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700">{t('profile.autoDeduct.title')}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                  {t('profile.autoDeduct.desc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!profile.autoDeductStock}
              onClick={handleToggleAutoDeduct}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
                profile.autoDeductStock ? "bg-[#ab3500]" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  profile.autoDeductStock ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Menu list */}
      <section className="mt-5 px-4 mb-10">
        <div className="bg-white rounded-2xl shadow-tactile border border-gray-150/50 overflow-hidden">
          {/* 我的菜谱 */}
          <div
            onClick={() => onNavigate("my-recipes")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-4.5 h-4.5 text-gray-400 group-hover:text-[#ab3500]" />
              <span className="text-xs font-semibold text-gray-700">{t('profile.menu.myRecipes')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          <div className="h-[1px] bg-gray-100 mx-4" />

          {/* 餐单规划 */}
          <div
            onClick={() => onNavigate("meal-plan")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="w-4.5 h-4.5 text-gray-400 group-hover:text-[#ab3500]" />
              <span className="text-xs font-semibold text-gray-700">{t('profile.menu.mealPlan')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          <div className="h-[1px] bg-gray-100 mx-4" />

          {/* 采购清单 */}
          <div
            onClick={() => onNavigate("shopping-list")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-4.5 h-4.5 text-gray-400 group-hover:text-[#ab3500]" />
              <span className="text-xs font-semibold text-gray-700">{t('profile.menu.shoppingList')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          <div className="h-[1px] bg-gray-100 mx-4" />

          {/* 消息通知 */}
          <div
            onClick={() => handleBentoClick("通知")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4.5 h-4.5 text-gray-400 group-hover:text-[#ab3500]" />
              <span className="text-xs font-semibold text-gray-700">{t('profile.menu.notifications')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          <div className="h-[1px] bg-gray-100 mx-4" />

          {/* 推荐给好友 */}
          <div
            onClick={handleShare}
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Share2 className="w-4.5 h-4.5 text-gray-400 group-hover:text-[#ab3500]" />
              <span className="text-xs font-semibold text-gray-700">{t('profile.menu.share')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          <div className="h-[1px] bg-gray-100 mx-4" />

          {/* 意见反馈 */}
          <div
            onClick={() => handleBentoClick("反馈")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4.5 h-4.5 text-gray-400 group-hover:text-[#ab3500]" />
              <span className="text-xs font-semibold text-gray-700">{t('profile.menu.feedback')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          <div className="h-[1px] bg-gray-100 mx-4" />

          {/* 帮助中心 */}
          <div
            onClick={() => onNavigate("help")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-4.5 h-4.5 text-gray-400 group-hover:text-[#ab3500]" />
              <span className="text-xs font-semibold text-gray-700">{t('profile.menu.help')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          <div className="h-[1px] bg-gray-100 mx-4" />

          {/* 重新查看引导 */}
          <div
            onClick={() => {
              localStorage.removeItem("hasSeenOnboarding");
              onNavigate("onboarding");
            }}
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4.5 h-4.5 text-gray-400 group-hover:text-[#ab3500]" />
              <span className="text-xs font-semibold text-gray-700">{t('profile.menu.replayOnboarding')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          <div className="h-[1px] bg-gray-100 mx-4" />

          {/* 关于我们 */}
          <div
            onClick={() => setSubView("about")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Info className="w-4.5 h-4.5 text-gray-400 group-hover:text-[#ab3500]" />
              <span className="text-xs font-semibold text-gray-700">{t('profile.menu.about')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </section>

      {/* App Version */}
      <footer className="text-center py-6 opacity-30 text-[10px]">
        <p className="text-gray-500 font-bold">老舅厨房 v1.0.0</p>
      </footer>
    </div>
  );
}
