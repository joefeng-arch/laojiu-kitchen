<template>
  <view class="page">
    <web-view :src="policyUrl" />
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";

// 从页面参数获取要展示的文档类型
const pages = getCurrentPages();
const current = pages[pages.length - 1] as any;
const query = current?.options ?? {};
const type = query.type ?? "privacy-policy"; // 'privacy-policy' | 'user-agreement'

const H5_BASE_URL: string = (import.meta.env?.VITE_H5_BASE_URL as string) ?? "";

const policyUrl = computed(() => {
  const base = H5_BASE_URL || "https://your-domain.com";
  return `${base}/${type}.html`;
});
</script>

<style scoped>
.page {
  width: 100vw;
  height: 100vh;
}
</style>
