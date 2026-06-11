import React, { useState } from "react";
import { Lock, User, ChefHat, Loader2, AlertCircle } from "lucide-react";
import { adminApi, adminTokenStore, AdminInfo } from "../api";

interface AdminLoginViewProps {
  onLoginSuccess: (admin: AdminInfo) => void;
}

export default function AdminLoginView({ onLoginSuccess }: AdminLoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await adminApi.login(username.trim(), password);
      adminTokenStore.set(res.token);
      onLoginSuccess(res.admin);
    } catch (err: any) {
      setError(err?.message ?? "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 mb-4">
            <ChefHat className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            老舅厨房
          </h1>
          <p className="text-sm text-gray-400 mt-1">管理后台</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit} className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-sm font-semibold text-gray-300 mb-5">管理员登录</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="输入管理员用户名"
                  autoComplete="username"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  autoComplete="current-password"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-bold text-sm rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>登录中…</span>
              </>
            ) : (
              "登 录"
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-600 mt-6">
          Uncle Joe's Kitchen Admin Panel
        </p>
      </div>
    </div>
  );
}
