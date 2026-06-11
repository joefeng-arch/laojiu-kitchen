import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X, Download, Share2, Loader2 } from "lucide-react";
import { Recipe } from "../types";
import { api } from "../api";

interface SharePosterModalProps {
  recipe: Recipe;
  onClose: () => void;
}

const CANVAS_W = 750;
const CANVAS_H = 1334;

/** Resolve image URL (relative → absolute) */
function absUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//.test(url) || /^data:/.test(url)) return url;
  const base = (
    (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:3001/api"
  ).replace(/\/api\/?$/, "");
  return `${base}${url}`;
}

/** Load image as promise */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Image load failed: ${src}`));
    img.src = src;
  });
}

/** Draw rounded rectangle path */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Truncate text to fit width */
function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "…").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}

export default function SharePosterModal({ recipe, onClose }: SharePosterModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);

  const generatePoster = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Generate QR code via API
      const { qrcodeUrl } = await api.generateQrcode(recipe.id);

      // 2. Load images in parallel
      const [coverImg, qrImg] = await Promise.all([
        recipe.coverImageUrl
          ? loadImage(absUrl(recipe.coverImageUrl)).catch(() => null)
          : Promise.resolve(null),
        loadImage(absUrl(qrcodeUrl)).catch(() => null),
      ]);

      // 3. Draw on canvas
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not found");

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Cannot get 2d context");

      drawPoster(ctx, recipe, coverImg, qrImg, t);

      // 4. Export
      const dataUrl = canvas.toDataURL("image/png");
      setPosterDataUrl(dataUrl);
    } catch (err: any) {
      console.error("Poster generation failed:", err);
      setError(err?.message || t("share.error.canvasFailed"));
    } finally {
      setLoading(false);
    }
  }, [recipe, t]);

  useEffect(() => {
    generatePoster();
  }, [generatePoster]);

  const handleSave = () => {
    if (!posterDataUrl) return;
    const link = document.createElement("a");
    link.download = `${recipe.title}-share.png`;
    link.href = posterDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-display font-bold text-sm text-gray-800">
            {t("share.shareRecipe")}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas (hidden) + Preview */}
        <div className="flex-1 overflow-y-auto p-4">
          <canvas ref={canvasRef} className="hidden" />

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-xs font-medium">{t("share.generating")}</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 text-red-400">
              <p className="text-xs font-medium mb-3">{error}</p>
              <button
                onClick={generatePoster}
                className="text-xs text-[#ab3500] font-bold hover:underline"
              >
                {t("common.retry")}
              </button>
            </div>
          )}

          {posterDataUrl && !loading && (
            <img
              src={posterDataUrl}
              alt="Share poster"
              className="w-full rounded-lg shadow-md"
            />
          )}
        </div>

        {/* Actions */}
        {posterDataUrl && !loading && (
          <div className="px-4 pb-4 pt-2 flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-full bg-[#ab3500] hover:bg-[#ff6b35] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {t("share.saveImage")}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-full border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors"
            >
              {t("share.close")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Canvas Drawing ──────────────────────────────────────────
function drawPoster(
  ctx: CanvasRenderingContext2D,
  recipe: Recipe,
  coverImg: HTMLImageElement | null,
  qrImg: HTMLImageElement | null,
  t: (key: string, opts?: any) => string,
) {
  const W = CANVAS_W;
  const H = CANVAS_H;

  // Background
  ctx.fillStyle = "#fcf9f8";
  ctx.fillRect(0, 0, W, H);

  // ── Cover Image (top area) ──
  const coverH = 420;
  if (coverImg) {
    // Cover entire area, cropping as needed
    const imgRatio = coverImg.width / coverImg.height;
    const areaRatio = W / coverH;
    let sx = 0,
      sy = 0,
      sw = coverImg.width,
      sh = coverImg.height;
    if (imgRatio > areaRatio) {
      sw = coverImg.height * areaRatio;
      sx = (coverImg.width - sw) / 2;
    } else {
      sh = coverImg.width / areaRatio;
      sy = (coverImg.height - sh) / 2;
    }
    ctx.drawImage(coverImg, sx, sy, sw, sh, 0, 0, W, coverH);
  } else {
    // Placeholder gradient
    const grad = ctx.createLinearGradient(0, 0, W, coverH);
    grad.addColorStop(0, "#ff6b35");
    grad.addColorStop(1, "#FF7F50");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, coverH);
  }

  // Gradient overlay at bottom of cover
  const coverGrad = ctx.createLinearGradient(0, coverH - 100, 0, coverH);
  coverGrad.addColorStop(0, "rgba(252,249,248,0)");
  coverGrad.addColorStop(1, "#fcf9f8");
  ctx.fillStyle = coverGrad;
  ctx.fillRect(0, coverH - 100, W, 100);

  let y = coverH + 10;

  // ── Recipe Title ──
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 48px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  const titleText = truncateText(ctx, recipe.title, W - 80);
  ctx.fillText(titleText, W / 2, y);
  y += 20;

  // ── Tags (difficulty, cook time) ──
  const tags: string[] = [];
  if (recipe.difficulty) {
    const diffLabels: Record<string, string> = {
      easy: t("common.difficulty.easy"),
      medium: t("common.difficulty.medium"),
      hard: t("common.difficulty.hard"),
    };
    tags.push(diffLabels[recipe.difficulty] || recipe.difficulty);
  }
  if (recipe.cookTime) tags.push(recipe.cookTime);
  if (recipe.estimatedCost) tags.push(`≈¥${recipe.estimatedCost.toFixed(0)}`);

  if (tags.length > 0) {
    y += 16;
    ctx.font = "bold 24px system-ui, sans-serif";
    const tagPadH = 12,
      tagPadV = 8,
      tagGap = 12,
      tagR = 16;

    // Measure total width
    let totalTagW = 0;
    const tagWidths = tags.map((tag) => {
      const w = ctx.measureText(tag).width + tagPadH * 2;
      totalTagW += w;
      return w;
    });
    totalTagW += (tags.length - 1) * tagGap;

    let tagX = (W - totalTagW) / 2;
    const tagH = 24 + tagPadV * 2;

    tags.forEach((tag, i) => {
      const tw = tagWidths[i];
      // Pill background
      roundRect(ctx, tagX, y - tagPadV, tw, tagH, tagR);
      ctx.fillStyle = "#fff3ee";
      ctx.fill();
      // Pill text
      ctx.fillStyle = "#ab3500";
      ctx.textAlign = "center";
      ctx.fillText(tag, tagX + tw / 2, y + 18);
      tagX += tw + tagGap;
    });
    y += tagH + 16;
  }

  // ── Description (optional, 2 lines max) ──
  if (recipe.description) {
    y += 8;
    ctx.fillStyle = "#666";
    ctx.font = "26px system-ui, sans-serif";
    ctx.textAlign = "center";
    const descText = truncateText(ctx, recipe.description, W - 100);
    ctx.fillText(descText, W / 2, y);
    y += 16;
  }

  // ── Ingredients Section ──
  y += 24;
  ctx.fillStyle = "#ab3500";
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(t("share.poster.ingredientsTitle"), 60, y);
  y += 12;

  // Divider
  ctx.strokeStyle = "#f0e6e0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, y);
  ctx.lineTo(W - 60, y);
  ctx.stroke();
  y += 16;

  const mainIngredients = recipe.ingredients.filter(
    (i) => i.groupName === "主料" || i.groupName === "调料",
  );
  const displayIngs = mainIngredients.slice(0, 5);
  const remaining = mainIngredients.length - displayIngs.length;

  ctx.font = "26px system-ui, sans-serif";
  displayIngs.forEach((ing) => {
    // Dot
    ctx.fillStyle = "#ff6b35";
    ctx.beginPath();
    ctx.arc(76, y + 1, 5, 0, Math.PI * 2);
    ctx.fill();

    // Name
    ctx.fillStyle = "#333";
    ctx.textAlign = "left";
    ctx.fillText(ing.name, 96, y + 8);

    // Amount
    ctx.fillStyle = "#999";
    ctx.textAlign = "right";
    const amtText = `${ing.amount}${ing.unit}`;
    ctx.fillText(amtText, W - 60, y + 8);
    y += 42;
  });

  if (remaining > 0) {
    ctx.fillStyle = "#999";
    ctx.font = "italic 24px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      t("share.poster.moreIngredients", { count: remaining }),
      96,
      y + 8,
    );
    y += 42;
  }

  // ── Bottom Section: QR Code + Branding ──
  const bottomY = H - 220;

  // Separator
  ctx.strokeStyle = "#f0e6e0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, bottomY);
  ctx.lineTo(W - 60, bottomY);
  ctx.stroke();

  // QR Code
  const qrSize = 160;
  const qrX = 60;
  const qrY = bottomY + 20;
  if (qrImg) {
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } else {
    // Placeholder
    roundRect(ctx, qrX, qrY, qrSize, qrSize, 12);
    ctx.fillStyle = "#f0f0f0";
    ctx.fill();
    ctx.fillStyle = "#ccc";
    ctx.font = "20px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("QR", qrX + qrSize / 2, qrY + qrSize / 2 + 8);
  }

  // Branding text (right of QR)
  const textX = qrX + qrSize + 30;
  ctx.fillStyle = "#ab3500";
  ctx.font = "bold 32px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(t("share.poster.brandName"), textX, qrY + 45);

  ctx.fillStyle = "#666";
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillText(t("share.poster.scanToView"), textX, qrY + 85);

  ctx.fillStyle = "#999";
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText(t("share.poster.brandSlogan"), textX, qrY + 120);
}
