import _ from "lodash";
import { MeetingSect, Section } from "./Sections";
import { TupleToUnion, as, assertExhaustive, calcTextSize, matchByKind, matchString } from "./Util";

export interface DrawingConfig {
    lineDist: number,
    stretch: number,
    meetingStyle: MeetingStyle,
    enumerateMeetings: undefined | TupleToUnion<typeof enumerationStyles>,
    xAxisPos: 'top' | 'bottom',
    crossing2crossingMargin: number,
    crossing2meetingMargin: number,
    meeting2meetingMargin: number,
    initialMargin: number,
    finalMargin: number,
    xAxisLabelMargin: number,
    labelLineSpacing: number,
}

export type MeetingStyle = {
    kind: 'bar',
    relWidth: number,
    relExcess: number,
} | {
    kind: 'metro',
    relWidth: number,
    relStrapSize: number,
}

export const enumerationStyles = ['x', '[x]', 'x.'] as const;

export interface BBox {
    top: number,
    left: number,
    width: number,
    height: number,
}

export interface ProtoLabel<K extends string> {
    kind: K,
    x: number,
    y: number,
    text: string,
}

export interface DrawingResult {
    paths: string[],
    meetings: string[],
    labels: ProtoLabel<"enum" | "tick">[],
    bbox: BBox,
}

export const drawSections = (info: DrawingConfig, sections: Section[], initialPermutation: number[]): DrawingResult => {
    const paths = new Array<string>(initialPermutation.length);
    initialPermutation.forEach((p, i) => paths[p] = `M 0 ${i * info.lineDist}`);

    const xBuf = new Array<[number, Section['kind']]>(initialPermutation.length).fill([0, 'empty']);
    let [enumLabelBuf, tickLabelBuf]: [number, [number, string]] = [0, [0, '']];

    const meetings: string[] = [];
    const labels: ProtoLabel<'enum' | 'tick'>[] = [];

    const textMetrics = calcTextSize("ÅAgç");
    const { enumLabelY, tickLabelY, labelHight } = labelYPos(info, initialPermutation.length - 1, textMetrics);

    for (const sect of sections) {
        if (sect.kind === 'empty') { /* ignore it */ }
        else if (sect.kind === 'meeting') {
            const enumeratedLabel = mkEnumeratedLabel(info, sect.ordinal + 1);
            const ignoreTickLabel = !sect.xTickLabel || tickLabelBuf[1] === sect.xTickLabel;
            const [enumLWidth, tickLWidth] = [labelWidth(enumeratedLabel), labelWidth(sect.xTickLabel)];
            const x = Math.max(
                ..._.range(sect.from, sect.to + 1)
                    .map(i => xBuf[i]![0] + meetingMargin(info, xBuf[i]![1]) + meetingWidth(info) / 2),
                enumLabelBuf + info.xAxisLabelMargin + enumLWidth / 2,
                tickLabelBuf[0] + (ignoreTickLabel ? 0 : info.xAxisLabelMargin + tickLWidth / 2),
            );

            _.range(sect.from, sect.to + 1).forEach(i => xBuf[i] = [x + meetingWidth(info) / 2, sect.kind]);
            enumLabelBuf = x + enumLWidth / 2;
            tickLabelBuf = [x + (ignoreTickLabel ? 0 : tickLWidth / 2), sect.xTickLabel ?? tickLabelBuf[1]];

            meetings.push(drawMeeting(info, x, sect));
            if (enumeratedLabel) {
                labels.push({ kind: 'enum', x, y: enumLabelY, text: enumeratedLabel });
            }
            if (!ignoreTickLabel && sect.xTickLabel) {
                labels.push({ kind: 'tick', x, y: tickLabelY, text: sect.xTickLabel });
            }
        } else if (sect.kind === 'block-crossing') {
            const metrics = mkBcMetrics(info, ...sect.bc);
            const x = _.range(sect.bc[0], sect.bc[2] + 1).reduce((max, i) =>
                Math.max(max, xBuf[i]![0] + crossingMargin(info, xBuf[i]![1])), 0);
            _.range(sect.bc[0], sect.bc[2] + 1).forEach(i => {
                xBuf[i] = [x + bcWidth(metrics), sect.kind];
                paths[sect.perm[i - sect.bc[0]]!] += ` H ${x} ${drawSLine(metrics, i)}`;
            });
        } else { assertExhaustive(sect); }
    }

    const mExcess = meetingExcess(info);
    const bbox: BBox = {
        width: Math.max(...xBuf.map(x => x[0]), enumLabelBuf, tickLabelBuf[0]) + info.finalMargin,
        height: (initialPermutation.length - 1) * info.lineDist + labelHight + mExcess + textMetrics.height,
        left: 0,
        top: (info.xAxisPos === 'top' ? -labelHight : 0) - meetingExcess(info) + textMetrics.y,
    }
    paths.forEach((_, i, self) => self[i] += ` H ${bbox.width}`);

    return { paths, meetings, labels, bbox };
}

const meetingMargin = (info: DrawingConfig, previous: Section['kind']) => matchString(previous, {
    'empty': () => info.initialMargin,
    'meeting': () => info.meeting2meetingMargin,
    'block-crossing': () => info.crossing2meetingMargin,
});

const meetingWidth = (info: DrawingConfig) => info.lineDist * info.meetingStyle.relWidth

const meetingExcess = (info: DrawingConfig): number => matchByKind(info.meetingStyle, {
    'bar': bar => bar.relExcess * info.lineDist,
    'metro': metro => metro.relWidth * info.lineDist / 2,
})

const drawMeeting = (info: DrawingConfig, atX: number, meeting: MeetingSect): string => matchByKind(info.meetingStyle, {
    'bar': bar => drawBar(info.lineDist, bar.relWidth, bar.relExcess, atX, meeting.from, meeting.to),
    'metro': metro => drawMetroStation(info.lineDist, metro.relWidth, metro.relStrapSize, atX, meeting.from, meeting.to),
});

const drawBar = (dist: number, relWidth: number, relExcess: number, atX: number, from: number, to: number) => {
    const w = dist * relWidth;
    const h = (to - from + 2 * relExcess) * dist;
    return `M ${atX - w / 2} ${(from - relExcess) * dist} h ${w} v ${h} h ${-w} z`;
}

/// see ../../docu/metro-stations.pdf
const drawMetroStation = (d: number, relW: number, relS: number, atX: number, from: number, to: number) => {
    const r = d * relW / 2;
    const s = 2 * r * relS;
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

const mkEnumeratedLabel = (info: DrawingConfig, i: number) =>
    !info.enumerateMeetings ? undefined : matchString(info.enumerateMeetings, {
        'x': () => i.toString(),
        'x.': () => `${i}.`,
        '[x]': () => `[${i}]`,
    });

const labelYPos = (info: DrawingConfig, n: number, text: DOMRect) => {
    const mExcess = meetingExcess(info);
    const enumLabelOffset = info.xAxisLabelMargin + mExcess;
    const tickLabelOffset = info.xAxisLabelMargin + mExcess
        + (info.enumerateMeetings ? info.labelLineSpacing : 0) * text.height;
    const [enumLabelY, tickLabelY] = matchString(info.xAxisPos, {
        'top': () => [-enumLabelOffset - text.height - text.y, -tickLabelOffset - text.height - text.y],
        'bottom': () => [n * info.lineDist + enumLabelOffset - text.y, n * info.lineDist + tickLabelOffset - text.y],
    });
    const labelHight = info.xAxisLabelMargin + mExcess
        + (info.enumerateMeetings ? info.labelLineSpacing + 1 : 1) * text.height;
    return { enumLabelY, tickLabelY, labelHight };
}

const labelWidth = (s: string | undefined) => s ? calcTextSize(s).width : 0;

export const bbox2viewBox = (bbox: BBox) => ({
    viewBox: `${bbox.left} ${bbox.top} ${bbox.width} ${bbox.height}`,
    width: bbox.width,
    height: bbox.height
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
