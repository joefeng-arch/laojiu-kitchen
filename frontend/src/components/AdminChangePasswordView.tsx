import React, { useState } from "react";
import { AlertCircle, ChefHat, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { adminApi, AdminInfo } from "../api";

interface AdminChangePasswordViewProps {
  admin: AdminInfo;
  onSuccess: (updatedAdmin: AdminInfo) => void;
}

export default function AdminChangePasswordView({ admin, onSuccess }: AdminChangePasswordViewProps) {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPwd || !newPwd || !confirmPwd) {
      setError("请填写所有密码字段");
      return;
    }
    if (newPwd.length < 8) {
      setError("新密码不能少于 8 位");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("两次输入的新密码不一致");
      return;
    }
    if (newPwd === currentPwd) {
      setError("新密码不能与当前密码相同");
      return;
    }

    setLoading(true);
    try {
      await adminApi.changePassword(currentPwd, newPwd);
      // 修改成功后更新 admin 对象，清除强制改密标志
      onSuccess({ ...admin, mustChangePassword: false });
    } catch (err: any) {
      setError(err?.message ?? "修改失败，请检查当前密码是否正确");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 mb-4">
            <ChefHat className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">老舅厨房</h1>
          <p className="text-sm text-gray-400 mt-1">管理后台</p>
        </div>

        {/* Card */}
        <div className="bg-gray-800/60 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6 shadow-2xl">
          {/* Warning banner */}
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-3 mb-5">
            <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-300">首次登录，请修改初始密码</p>
              <p className="text-[10px] text-amber-400/80 mt-0.5">
                为保障账号安全，必须将初始密码修改为新密码后方可进入管理后台。
              </p>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-gray-300 mb-4">
            修改密码 — <span className="text-orange-400">{admin.username}</span>
          </h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                当前密码（初始密码）
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="输入当前密码"
                  autoComplete="current-password"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                新密码（至少 8 位）
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="输入新密码"
                  autoComplete="new-password"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                确认新密码
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                  className={`w-full bg-gray-900/50 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 transition-all ${
                    confirmPwd && confirmPwd !== newPwd
                      ? "border-red-500/50 focus:ring-red-500/30"
                      : "border-gray-700 focus:ring-orange-500/50 focus:border-orange-500/50"
                  }`}
                />
              </div>
              {confirmPwd && confirmPwd !== newPwd && (
                <p className="text-[10px] text-red-400 mt-1">两次密码不一致</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-bold text-sm rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>修改中…</span>
                </>
              ) : (
                "确认修改密码"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-gray-600 mt-6">
          Uncle Joe's Kitchen Admin Panel
        </p>
      </div>
    </div>
  );
}
