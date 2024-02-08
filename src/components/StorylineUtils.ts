import _ from "lodash";
import { SBCMRealization, Storyline, applyBc, supportsMeeting } from "../model/Storyline";
import { as, assertExhaustive, matchString } from "../model/Util";

export interface DrawingConfig {
    lineDist: number,
    stretch: number,
    meetingStyle: MeetingStyle,
    crossing2crossingMargin: number,
    crossing2meetingMargin: number,
    meeting2meetingMargin: number,
    initialMargin: number,
    finalMargin: number,
}

export const defaultConfig = (lineDist: number) => as<DrawingConfig>({
    lineDist,
    stretch: .4,
    initialMargin: lineDist / 2,
    finalMargin: lineDist / 2,
    crossing2crossingMargin: lineDist / 4,
    crossing2meetingMargin: lineDist / 4,
    meeting2meetingMargin: lineDist / 2,
    meetingStyle: 'Metro',
});

export type MeetingStyle = 'Bar' | 'Metro'

export type Section = MeetingSect | BlockCrossingSect | EmptySect

export interface MeetingSect {
    kind: 'meeting',
    from: number,
    to: number,
}

export interface BlockCrossingSect {
    kind: 'block-crossing'
    bc: [number, number, number],
    perm: number[],
}

export interface EmptySect {
    kind: 'empty'
}

export const mkSections = (story: Storyline, realization: SBCMRealization) => {
    let perm = realization.initialPermutation;
    // console.log({ init: realization.initialPermutation })
    let [i, j] = [0, 0];
    const result: Section[] = []; // mutable :(
    while (true) {
        const meeting = story.meetings[i];
        if (meeting === undefined) {
            // console.log({ result });
            return result;
        } else {
            const supported = supportsMeeting(perm, meeting)
            if (supported !== false) {
                result.push({ kind: 'meeting', ...supported });
                i += 1;
            } else {
                const nextBc = realization.blockCrossings[j];
                if (nextBc === undefined) {
                    console.error(`no block crossing left but meeting ${meeting} is unsupported`);
                    return undefined;
                } else {
                    result.push({ kind: 'block-crossing', bc: nextBc, perm: perm.slice(nextBc[0], nextBc[2] + 1) });
                    j += 1;
                    perm = applyBc(perm, ...nextBc);
                }
            }
        }
    }
}

export const drawSections = (info: DrawingConfig, sections: Section[], initialPermutation: number[]) => {
    const paths = new Array(initialPermutation.length);
    initialPermutation.forEach((p, i) => paths[p] = `M 0 ${i * info.lineDist}`);
    // console.log(`drawSections->initialPermutation: ${initialPermutation}`)
    const xBuf = new Array<[number, Section['kind']]>(initialPermutation.length).fill([0, 'empty']);
    // console.log({ paths, xBuf })
    const meetings: string[] = [];
    for (const sect of sections) {
        if (sect.kind === 'empty') { /* ignore it */ }
        else if (sect.kind === 'meeting') {
            const x = _.range(sect.from, sect.to + 1).reduce((max, i) =>
                Math.max(max, xBuf[i]![0] + meetingMargin(info, xBuf[i]![1]) + meetingWidth(info) / 2), 0);
            _.range(sect.from, sect.to + 1).forEach(i => xBuf[i] = [x + meetingWidth(info) / 2, sect.kind]);
            meetings.push(drawMeeting(info, x, sect));
            // console.log({ sect, at: x })
        } else if (sect.kind === 'block-crossing') {
            const metrics = mkBcMetrics(info, ...sect.bc);
            const x = _.range(sect.bc[0], sect.bc[2] + 1).reduce((max, i) =>
                Math.max(max, xBuf[i]![0] + crossingMargin(info, xBuf[i]![1])), 0);
            _.range(sect.bc[0], sect.bc[2] + 1).forEach(i => {
                xBuf[i] = [x + bcWidth(metrics), sect.kind];
                // console.log(`bc: ${sect.bc} index ${i} set path ${sect.perm[i - sect.bc[0]]}`)
                paths[sect.perm[i - sect.bc[0]]!] += ` H ${x} ${drawSLine(metrics, i)}`;
            });
            // console.log({ sect, at: x })
        } else { assertExhaustive(sect); }
    }
    const width = Math.max(...xBuf.map(x => x[0])) + info.finalMargin;
    const height = initialPermutation.length * info.lineDist;
    paths.forEach((_, i, self) => self[i] += ` H ${width}`);
    return { paths, meetings, width, height };
}

const meetingMargin = (info: DrawingConfig, previous: Section['kind']) => matchString(previous, {
    'empty': () => info.initialMargin,
    'meeting': () => info.meeting2meetingMargin,
    'block-crossing': () => info.crossing2meetingMargin,
});

const meetingWidth = (info: DrawingConfig) => matchString(info.meetingStyle, {
    'Bar': () => info.lineDist / 5,
    'Metro': () => info.lineDist * 2 / 3
});

const drawMeeting = (info: DrawingConfig, atX: number, meeting: MeetingSect) => matchString(info.meetingStyle, {
    'Bar': () => drawBar(info, atX, meeting.from, meeting.to),
    'Metro': () => drawMetroStation(info, atX, meeting.from, meeting.to),
});

const drawBar = (info: DrawingConfig, atX: number, from: number, to: number) => {
    const w = info.lineDist / 5;
    const h = (to - from + 0.2) * info.lineDist;
    return `M ${atX - w / 2} ${(from - 0.1) * info.lineDist} h ${w} v ${h} h ${-w} z`;
}

/// see ../../docu/metro-stations.pdf
const drawMetroStation = (info: DrawingConfig, atX: number, from: number, to: number) => {
    const d = info.lineDist
    const r = d / 3;
    const s = 4 / 5 * r;
    const t = Math.sqrt(r * r - s * s / 4);
    const pre = `M ${atX - s / 2} ${from * d + t}`;
    if (from === to) {
        return `${pre} a ${r} ${r} 0 1 1 ${s} 0 a ${r} ${r} 0 0 1 ${-s} 0 z`; // obfuscated circle :(
    } else {
        const top = `a ${r} ${r} 0 1 1 ${s} 0 v ${d - 2 * t}`;
        const midR = _.range(from + 1, to).map(() => `a ${r} ${r} 0 0 1 0 ${2 * t} v ${d - 2 * t}`).join(" ");
        const bottom = `a ${r} ${r} 0 1 1 ${-s} 0 v ${2 * t - d}`;
        const midL = _.range(from + 1, to).map(() => `a ${r} ${r} 0 0 1 0 ${-2 * t} v ${2 * t - d}`).join(" ");
        return `${pre} ${top} ${midR} ${bottom} ${midL} z`;
    }
}

const crossingMargin = (info: DrawingConfig, previous: Section['kind']) => matchString(previous, {
    'empty': () => info.initialMargin,
    'meeting': () => info.crossing2meetingMargin,
    'block-crossing': () => info.crossing2crossingMargin,
});

/// see ../../docu/storylineUtils.pdf
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
