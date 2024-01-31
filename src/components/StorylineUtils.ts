import { SBCMRealization, Storyline, applyBc, supportsMeeting } from "../model/Sbcm";
import { as, assertExhaustive } from "../model/util";

export interface DrawingConfig {
    lineDist: number,
    stretch: number,
    crossing2crossingMargin: number,
    crossing2meetingMargin: number,
    meeting2meetingMargin: number,
    meetingStyle: MeetingStyle,
}

export type MeetingStyle = 'Bar' | 'Metro'

export type Section = MeetingSect | BlockCrossingSect | EmptySect

export interface MeetingSect {
    type: 'meeting',
    from: number,
    to: number,
}

export interface BlockCrossingSect {
    type: 'block-crossing'
    bc: [number, number, number],
}

export interface EmptySect {
    type: 'empty'
}

export const mkSections = (story: Storyline, realization: SBCMRealization) => {
    let perm = realization.initialPermutation;
    let [i, j] = [0, 0];
    const result: Section[] = []; // mutable :(
    while (true) {
        const meeting = story.meetings[i];
        if (meeting === undefined) {
            return result;
        } else {
            const supported = supportsMeeting(perm, meeting)
            if (supported !== false) {
                result.push({ type: 'meeting', ...supported });
                i += 1;
            } else {
                const nextBc = realization.blockCrossings[j];
                if (nextBc === undefined) {
                    console.log(`no block crossing left but meeting ${meeting} is unsupported`);
                    return undefined;
                } else {
                    result.push({ type: 'block-crossing', bc: nextBc });
                    j += 1;
                    perm = applyBc(perm, ...nextBc);
                }
            }
        }
    }
}

export const drawSections = (info: DrawingConfig, sections: Section[], initialPermutation: number[]) => {
    const paths = new Array<string>(initialPermutation.length).fill("");
    const xBuf = new Array<[number, Section['type']]>(initialPermutation.length).fill([0, 'empty']);
    const meetings: string[] = [];
    for (const sect of sections) {
        if (sect.type === 'empty') { /* ignore it */ }
        else if (sect.type === 'meeting') {
            // update xbuf
            // create meeting
        } else if (sect.type === 'block-crossing') {
            // update xbuf
            // update paths
        } else { assertExhaustive(sect) }
    }
}

const drawBar = (info: DrawingConfig, atX: number, from: number, to: number) => {
    const w = Math.min(info.crossing2meetingMargin, info.meeting2meetingMargin) * 0.5;
    const h = (to - from + 0.5) * info.lineDist;
    return `M ${atX - w / 2} ${(from - 0.25) * info.lineDist} h ${w} v ${h} h ${-w} z`;
}

export interface BcMetrics {
    info: DrawingConfig,
    smallGroupAtTop: boolean,
    bc: [number, number, number]
    p: number,
    s: number,
    k: number,
    t: number,
    w: number,
}

export const bcWidth = (m: BcMetrics) => m.w * m.info.lineDist;

export const mkBcMetrics = (info: DrawingConfig, a: number, b: number, c: number) => {
    const smallGroupAtTop = b - a + 1 <= c - b;
    const p = b + 0.5 + (smallGroupAtTop ? 1 : -1) * info.stretch * (c - a);
    const q = c - p + a;
    const s = smallGroupAtTop ? 2 * p - a - b : b + c + 1 - 2 * p;
    const w = Math.sqrt(s * s - (p - q) * (p - q));
    const m = smallGroupAtTop ? b + (c - b + 1) / 2 : a + (b - a) / 2;
    const n = c - m + a;
    const f = Math.sqrt(s * s - (p - q) * (p - q) + (m - n) * (m - n));
    const t = f * f / (2 * Math.sqrt(f * f - w * w));
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
