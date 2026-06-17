<template>
  <view class="shell">
    <!-- ── 隐私同意弹窗（首次启动显示，同意后不再显示）────────── -->
    <view v-if="showConsent" class="consent-mask">
      <view class="consent-card">
        <!-- Logo & Title -->
        <view class="consent-header">
          <text class="consent-logo">🍳</text>
          <text class="consent-app-name">老舅厨房</text>
        </view>

        <!-- 说明文字 -->
        <text class="consent-body">
          感谢使用老舅厨房！在继续使用之前，请您阅读并同意以下条款：
        </text>

        <!-- 协议链接 -->
        <view class="consent-links">
          <text class="consent-link" @tap="openPolicy('user-agreement')">
            《用户协议》
          </text>
          <text class="consent-sep">和</text>
          <text class="consent-link" @tap="openPolicy('privacy-policy')">
            《隐私政策》
          </text>
        </view>

        <text class="consent-hint">
          我们承诺保护您的个人隐私，仅收集必要信息用于提供服务。
        </text>

        <!-- 操作按钮 -->
        <button class="btn-agree" @tap="handleAgree">同意并继续</button>
        <button class="btn-decline" @tap="handleDecline">不同意，退出</button>
      </view>
    </view>

    <!-- ── 主内容区（同意后展示）──────────────────────────────── -->
    <template v-else>
      <web-view v-if="webUrl" :src="webUrl" @error="onWebError" />
      <view v-else class="boot">
        <text class="boot-text">{{ status }}</text>
        <button v-if="failed" class="retry" @tap="bootstrap">重试</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

// ── 环境变量注入（.env.development / .env.production）─────────
const info = uni.getSystemInfoSync();
const isDevtools = info.platform === "devtools";

const PROD_H5_URL: string = (import.meta.env?.VITE_H5_BASE_URL as string) ?? "";
const PROD_API_URL: string = (import.meta.env?.VITE_API_BASE_URL as string) ?? "";
const LAN_IP: string = (import.meta.env?.VITE_LAN_IP as string) ?? "192.168.1.100";

const HOST = isDevtools ? "localhost" : LAN_IP;
const H5_BASE_URL = PROD_H5_URL || `http://${HOST}:3000`;
const API_BASE_URL = PROD_API_URL || (PROD_H5_URL
  ? `${PROD_H5_URL.replace(/\/$/, "")}/api`
  : `http://${HOST}:3001/api`);

// ── 隐私同意状态 ──────────────────────────────────────────────
const CONSENT_KEY = "privacy_agreed_v1";
const showConsent = ref(false);
const webUrl = ref<string>("");
const status = ref<string>("正在登录…");
const failed = ref(false);

function checkConsent(): boolean {
  try {
    return uni.getStorageSync(CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

function handleAgree() {
  try {
    uni.setStorageSync(CONSENT_KEY, "true");
  } catch { /* ignore */ }
  showConsent.value = false;
  bootstrap();
}

function handleDecline() {
  // 用户拒绝 → 退出小程序
  uni.showToast({ title: "感谢您的使用，期待下次再见", icon: "none", duration: 1500 });
  setTimeout(() => {
    uni.exitMiniProgram({ fail: () => { status.value = "请手动退出小程序"; } });
  }, 1500);
}

function openPolicy(type: "privacy-policy" | "user-agreement") {
  uni.navigateTo({ url: `/pages/policy/policy?type=${type}` });
}

// ── 微信登录 & Token 换取 ──────────────────────────────────────
function buildUrl(token: string): string {
  const sep = H5_BASE_URL.includes("?") ? "&" : "?";
  return `${H5_BASE_URL}${sep}token=${encodeURIComponent(token)}`;
}

async function wxLogin(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: "weixin",
      success: (res) => (res.code ? resolve(res.code) : reject(new Error("无 code"))),
      fail: (err) => reject(new Error(err?.errMsg || "uni.login 失败")),
    });
  });
}

async function exchangeToken(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}/auth/wx-login`,
      method: "POST",
      data: { code },
      header: { "Content-Type": "application/json" },
      success: (res: any) => {
        const body = res.data;
        if (
          res.statusCode >= 200 &&
          res.statusCode < 300 &&
          body?.code === 200 &&
          body?.data?.token
        ) {
          resolve(body.data.token as string);
        } else {
          reject(new Error(body?.message || `换取 token 失败 (${res.statusCode})`));
        }
      },
      fail: (err) => reject(new Error(err?.errMsg || "网络错误")),
    });
  });
}

async function bootstrap() {
  failed.value = false;

  // 模拟器里跳过微信登录，直接加载 H5
  if (isDevtools) {
    webUrl.value = H5_BASE_URL;
    return;
  }

  status.value = "正在登录微信…";
  try {
    const code = await wxLogin();
    status.value = "正在换取 token…";
    const token = await exchangeToken(code);
    status.value = "登录成功，加载中…";
    webUrl.value = buildUrl(token);
  } catch (e: any) {
    status.value = e?.message || "登录失败";
    failed.value = true;
  }
}

function onWebError(e: any) {
  console.error("[web-view error]", e);
}

// ── 启动 ──────────────────────────────────────────────────────
onMounted(() => {
  if (checkConsent()) {
    // 已同意过，直接进入
    bootstrap();
  } else {
    // 首次启动，显示同意弹窗
    showConsent.value = true;
  }
});
</script>

<style lang="scss" scoped>
.shell {
  width: 100vw;
  height: 100vh;
  background: #fcf9f8;
}

/* ── 同意弹窗 ── */
.consent-mask {
  position: fixed;
  inset: 0;
  background: #fcf9f8;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 999;
}

.consent-card {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 48rpx 40rpx 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 -8rpx 40rpx rgba(0, 0, 0, 0.08);
}

.consent-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32rpx;
}

.consent-logo {
  font-size: 72rpx;
  margin-bottom: 12rpx;
}

.consent-app-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #ab3500;
  letter-spacing: 2rpx;
}

.consent-body {
  font-size: 26rpx;
  color: #6b7280;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.consent-links {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 20rpx;
}

.consent-link {
  font-size: 28rpx;
  color: #ab3500;
  font-weight: bold;
  text-decoration: underline;
}

.consent-sep {
  font-size: 26rpx;
  color: #9ca3af;
}

.consent-hint {
  font-size: 22rpx;
  color: #9ca3af;
  text-align: center;
  line-height: 1.5;
  margin-bottom: 40rpx;
}

.btn-agree {
  width: 100%;
  height: 88rpx;
  background: #ab3500;
  color: #ffffff;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: bold;
  border: none;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-agree::after {
  border: none;
}

.btn-decline {
  width: 100%;
  height: 72rpx;
  background: transparent;
  color: #9ca3af;
  border: none;
  font-size: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-decline::after {
  border: none;
}

/* ── 启动等待页 ── */
.boot {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.boot-text {
  color: #6b7280;
  font-size: 28rpx;
}

.retry {
  background: #ab3500;
  color: #fff;
  font-size: 28rpx;
  padding: 16rpx 48rpx;
  border-radius: 999rpx;
  border: none;
}

.retry::after {
  border: none;
}
</style>
