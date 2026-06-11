import { defineStore } from "pinia";
import { ref } from "vue";
import { api, tokenStore } from "@/api";
import type { UserProfile } from "@/types";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<UserProfile | null>(null);
  const ready = ref(false);

  async function bootstrap() {
    // 微信小程序：拿 code 走 wx-login
    // H5 调试：没有 wx.login，用 mock 登录
    // #ifdef MP-WEIXIN
    try {
      const { code } = await new Promise<UniApp.LoginRes>((resolve, reject) => {
        uni.login({ provider: "weixin", success: resolve, fail: reject });
      });
      const res = await api.wxLogin(code);
      user.value = res.user;
    } catch (e) {
      console.error("wx login failed", e);
    }
    // #endif

    // #ifdef H5
    if (!tokenStore.get()) {
      try {
        const res = await api.mockLogin("mock-dev-user");
        user.value = res.user;
      } catch (e) {
        console.error("mock login failed", e);
      }
    } else {
      try {
        user.value = await api.getProfileBasic();
      } catch {
        tokenStore.clear();
      }
    }
    // #endif

    ready.value = true;
  }

  function logout() {
    api.logout();
    user.value = null;
  }

  return { user, ready, bootstrap, logout };
});
