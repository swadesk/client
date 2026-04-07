/** Shadcn-style HSL triples: `"h s% l%"` for `hsl(var(--primary))`. */
export type QrVenueThemeCssVars = {
  primary: string;
  primaryForeground: string;
  ring: string;
};

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const l = (max + min) / 2;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslTriple(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.min(100, Math.max(0, Math.round(s)))}% ${Math.min(100, Math.max(0, Math.round(l)))}%`;
}

function relativeLuminance255(r: number, g: number, b: number): number {
  const lin = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function themeFromRgb(r: number, g: number, b: number): QrVenueThemeCssVars {
  let { h, s, l } = rgbToHsl(r, g, b);
  if (s < 18) s = Math.min(88, s + 40);
  else s = Math.min(92, s + 10);
  l = Math.min(54, Math.max(40, l > 72 ? l - 14 : l < 32 ? l + 8 : l));
  const primary = hslTriple(h, s, l);
  const lum = relativeLuminance255(r, g, b);
  const primaryForeground = lum > 0.52 ? "222 47% 11%" : "0 0% 100%";
  const ring = hslTriple(h, Math.min(95, s + 6), Math.min(60, l + 8));
  return { primary, primaryForeground, ring };
}

export function qrThemeFromHex(hex: string): QrVenueThemeCssVars | null {
  const t = hex.trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(t);
  if (!m?.[1]) return null;
  const n = Number.parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return themeFromRgb(r, g, b);
}

export async function qrThemeFromLogoUrl(logoUrl: string): Promise<QrVenueThemeCssVars | null> {
  const url = logoUrl.trim();
  if (!url) return null;
  if (typeof window === "undefined") return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const w = 40;
        const h = 40;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3] ?? 0;
          if (a < 32) continue;
          const rr = data[i] ?? 0;
          const gg = data[i + 1] ?? 0;
          const bb = data[i + 2] ?? 0;
          const mx = Math.max(rr, gg, bb);
          const mn = Math.min(rr, gg, bb);
          if (mx - mn < 10 && mx > 248) continue;
          r += rr;
          g += gg;
          b += bb;
          n++;
        }
        if (n < 8) {
          r = 0;
          g = 0;
          b = 0;
          n = 0;
          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3] ?? 0;
            if (a < 16) continue;
            r += data[i] ?? 0;
            g += data[i + 1] ?? 0;
            b += data[i + 2] ?? 0;
            n++;
          }
        }
        if (n === 0) {
          resolve(null);
          return;
        }
        r /= n;
        g /= n;
        b /= n;
        resolve(themeFromRgb(r, g, b));
      } catch {
        resolve(null);
      }
    };
    img.src = url;
  });
}
