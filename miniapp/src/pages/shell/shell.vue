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

    <!-- ── 完善资料（首次登录采集微信头像 + 昵称）──────────────── -->
    <view v-else-if="showProfileSetup" class="consent-mask">
      <view class="consent-card">
        <view class="consent-header">
          <text class="consent-app-name">完善个人资料</text>
        </view>
        <text class="consent-body">设置你的头像和昵称，让老舅厨房更懂你～</text>

        <!-- 微信头像选择（官方头像昵称填写能力）-->
        <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
          <image v-if="avatarPath" :src="avatarPath" class="avatar-img" mode="aspectFill" />
          <view v-else class="avatar-placeholder">
            <text class="avatar-plus">＋</text>
            <text class="avatar-tip">选择头像</text>
          </view>
        </button>

        <!-- 微信昵称填写 -->
        <input
          class="nickname-input"
          type="nickname"
          placeholder="点击填写昵称"
          :value="nickname"
          @input="onNicknameInput"
          @blur="onNicknameInput"
        />

        <button class="btn-agree" :disabled="savingProfile" @tap="completeSetup">
          {{ savingProfile ? "保存中…" : "完成" }}
        </button>
        <button class="btn-decline" @tap="skipSetup">暂不设置</button>
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
import { onLoad, onShareAppMessage, onShareTimeline } from "@dcloudio/uni-app";

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

// 扫码进入时携带的 scene（分享菜谱二维码 → 深链到详情页）
const sceneParam = ref<string>("");

// ── 完善资料状态 ──────────────────────────────────────────────
const PROFILE_SETUP_KEY = "profile_setup_v1";
const showProfileSetup = ref(false);
const avatarPath = ref<string>(""); // 微信返回的临时头像路径
const nickname = ref<string>("");
const savingProfile = ref(false);
let authToken = ""; // 缓存换到的用户 token
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

// onLoad 早于 onMounted：捕获扫码/转发带来的 scene 参数
onLoad((query: Record<string, string> | undefined) => {
  if (query?.scene) {
    try {
      sceneParam.value = decodeURIComponent(query.scene);
    } catch {
      sceneParam.value = query.scene;
    }
  }
});

// 「···」转发给朋友
onShareAppMessage(() => ({
  title: "老舅厨房 — 把家的味道记录下来",
  path: "/pages/shell/shell",
}));

// 「···」分享到朋友圈
onShareTimeline(() => ({
  title: "老舅厨房 — 把家的味道记录下来",
}));

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
function appendScene(url: string): string {
  if (!sceneParam.value) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}scene=${encodeURIComponent(sceneParam.value)}`;
}

function buildUrl(token: string): string {
  const sep = H5_BASE_URL.includes("?") ? "&" : "?";
  return appendScene(`${H5_BASE_URL}${sep}token=${encodeURIComponent(token)}`);
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
    webUrl.value = appendScene(H5_BASE_URL);
    return;
  }

  status.value = "正在登录微信…";
  try {
    const code = await wxLogin();
    status.value = "正在换取 token…";
    authToken = await exchangeToken(code);

    // 首次登录：引导填写微信头像 + 昵称
    if (await needsProfileSetup()) {
      showProfileSetup.value = true;
      return; // 等用户填完/跳过后再加载 H5
    }

    status.value = "登录成功，加载中…";
    webUrl.value = buildUrl(authToken);
  } catch (e: any) {
    status.value = e?.message || "登录失败";
    failed.value = true;
  }
}

// ── 完善资料：判断是否需要提示 ─────────────────────────────────
async function needsProfileSetup(): Promise<boolean> {
  try {
    if (uni.getStorageSync(PROFILE_SETUP_KEY) === "true") return false;
  } catch { /* ignore */ }
  return new Promise((resolve) => {
    uni.request({
      url: `${API_BASE_URL}/users/me`,
      method: "GET",
      header: { Authorization: `Bearer ${authToken}` },
      success: (res: any) => {
        const u = res?.data?.data ?? res?.data ?? {};
        // 仍是默认昵称且无头像 → 视为未设置
        const isDefault = (!u.nickname || u.nickname === "吃货") && !u.avatar;
        resolve(Boolean(isDefault));
      },
      fail: () => resolve(false),
    });
  });
}

function onChooseAvatar(e: any) {
  const url = e?.detail?.avatarUrl;
  if (url) avatarPath.value = url;
}

function onNicknameInput(e: any) {
  nickname.value = e?.detail?.value ?? nickname.value;
}

function uploadAvatar(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}/uploads/image`,
      filePath,
      name: "file",
      header: { Authorization: `Bearer ${authToken}` },
      success: (res) => {
        try {
          const body = JSON.parse(res.data);
          const rel = body?.data?.url;
          if (rel) resolve(`${API_ORIGIN}${rel}`);
          else reject(new Error(body?.message || "头像上传失败"));
        } catch {
          reject(new Error("头像上传响应解析失败"));
        }
      },
      fail: (err) => reject(new Error(err?.errMsg || "头像上传失败")),
    });
  });
}

function patchProfile(data: { nickname?: string; avatar?: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}/users/me`,
      method: "PATCH",
      data,
      header: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      success: () => resolve(),
      fail: (err) => reject(new Error(err?.errMsg || "保存失败")),
    });
  });
}

function finishSetup() {
  try { uni.setStorageSync(PROFILE_SETUP_KEY, "true"); } catch { /* ignore */ }
  showProfileSetup.value = false;
  webUrl.value = buildUrl(authToken);
}

async function completeSetup() {
  if (savingProfile.value) return;
  savingProfile.value = true;
  try {
    const payload: { nickname?: string; avatar?: string } = {};
    if (nickname.value.trim()) payload.nickname = nickname.value.trim();
    if (avatarPath.value) {
      try {
        payload.avatar = await uploadAvatar(avatarPath.value);
      } catch (e: any) {
        uni.showToast({ title: e?.message || "头像上传失败", icon: "none" });
      }
    }
    if (Object.keys(payload).length > 0) {
      await patchProfile(payload);
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || "保存失败", icon: "none" });
  } finally {
    savingProfile.value = false;
    finishSetup();
  }
}

function skipSetup() {
  finishSetup();
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

/* ── 头像 / 昵称 ── */
.avatar-btn {
  width: 160rpx;
  height: 160rpx;
  padding: 0;
  margin-bottom: 28rpx;
  border-radius: 50%;
  background: #f3f4f6;
  border: 2rpx solid #e5e7eb;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-btn::after {
  border: none;
}

.avatar-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
}

.avatar-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.avatar-plus {
  font-size: 48rpx;
  line-height: 1;
}

.avatar-tip {
  font-size: 22rpx;
  margin-top: 8rpx;
}

.nickname-input {
  width: 100%;
  height: 88rpx;
  background: #f9fafb;
  border: 2rpx solid #e5e7eb;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #1f2937;
  margin-bottom: 32rpx;
  box-sizing: border-box;
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
