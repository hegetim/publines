import { as } from "../model/util";

export interface DrawingInfo {
    lineDist: number,
    stretch: number,
}

export interface BcMetrics {
    info: DrawingInfo,
    smallGroupAtTop: boolean,
    bc: [number, number, number]
    p: number,
    s: number,
    k: number,
    t: number,
    w: number,
}

export const bcWidth = (m: BcMetrics) => m.w * m.info.lineDist

export const mkBcMetrics = (info: DrawingInfo, a: number, b: number, c: number) => {
    const smallGroupAtTop = b - a + 1 <= c - b;
    const p = b + 0.5 + (smallGroupAtTop ? 1 : -1) * info.stretch * (c - a);
    const q = c - p + a;
    const s = smallGroupAtTop ? 2 * p - a - b : b + c + 1 - 2 * p;
    const w = Math.sqrt(s * s - (p - q) * (p - q));
    const m = smallGroupAtTop ? b + (c - b + 1) / 2 : a + (b - a) / 2;
    const n = c - m + a;
    const f = Math.sqrt(s * s - (p - q) * (p - q) + (m - n) * (m - n));
    const t = 2 * f * f / (4 * Math.sqrt(f * f - w * w));
    const k = m + (smallGroupAtTop ? -1 : 1) * t / 2;
    return as<BcMetrics>({ info, smallGroupAtTop, bc: [a, b, c], p, s, k, w, t });
}

export const drawSLine = (m: BcMetrics, startIndex: number) => {
    const [a, b, c] = m.bc;
    const i = startIndex;
    const isTL2BR = i <= b;

    const [r1, r2, dx1, dx2, dy1, dy2] = (() => {
        if (m.smallGroupAtTop) {
            if (isTL2BR) {
                const j = i + c - b;
                const [dx1, dy1, r1] = [m.w * (m.p - i) / m.s, (j - i) * (m.p - i) / m.s, m.p - i];
                return [r1, m.s - r1, dx1, m.w - dx1, dy1, j - i - dy1];
            } else {
                const j = i + a - b - 1;
                const [dx1, dy1, r1] = [m.w * (i - m.k) / m.t, (j - i) * (i - m.k) / m.t, i - m.k];
                return [r1, m.t - r1, dx1, m.w - dx1, dy1, j - i - dy1];
            }
        } else {
            if (isTL2BR) {
                const j = i + c - b;
                const [dx1, dy1, r1] = [m.w * (m.k - i) / m.t, (j - i) * (m.k - i) / m.t, m.k - i];
                return [r1, m.t - r1, dx1, m.w - dx1, dy1, j - i - dy1];
            } else {
                const j = i + a - b - 1;
                const [dx1, dy1, r1] = [m.w * (i - m.p) / m.s, (j - i) * (i - m.p) / m.s, i - m.p];
                return [r1, m.s - r1, dx1, m.w - dx1, dy1, j - i - dy1];
            }
        }
    })();

    const d = m.info.lineDist;
    return `a ${r1 * d} ${r1 * d} 0 0 ${+isTL2BR} ${dx1 * d} ${dy1 * d}`
        + ` a ${r2 * d} ${r2 * d} 0 0 ${+!isTL2BR} ${dx2 * d} ${dy2 * d}`;
}