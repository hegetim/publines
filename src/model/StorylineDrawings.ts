import _ from "lodash";
import { MeetingSect, Section } from "./Sections";
import { TupleToUnion, as, assertExhaustive, calcTextSize, matchByKind, matchString } from "./Util";

export interface DrawingConfig {
    lineDist: number,
    stretch: Stretch,
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
    authorLineStrokeWidth: number,
}

export type Stretch = {
    kind: 'arc',
    relWidth: number,
} | {
    kind: 'bezier',
    relWidth: number,
    incline: number,
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
    yLabelPositions: LabelPos[][],
}

export interface LabelPos {
    fromX: number,
    y: number,
}

export const drawSections = (info: DrawingConfig, sections: Section[], initialPermutation: number[]): DrawingResult => {
    const paths = new Array<string>(initialPermutation.length);
    initialPermutation.forEach((p, i) => paths[p] = `M 0 ${i * info.lineDist}`);

    const yLabelPositions = new Array<LabelPos[]>(initialPermutation.length);
    initialPermutation.forEach((p, i) => yLabelPositions[p] = [{ fromX: 0, y: i * info.lineDist }]);

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
                ..._.range(sect.fromIncl, sect.toIncl + 1)
                    .map(i => xBuf[i]![0] + meetingMargin(info, xBuf[i]![1]) + meetingWidth(info) / 2),
                enumLabelBuf + info.xAxisLabelMargin + enumLWidth / 2,
                tickLabelBuf[0] + (ignoreTickLabel ? 0 : info.xAxisLabelMargin + tickLWidth / 2),
            );

            _.range(sect.fromIncl, sect.toIncl + 1).forEach(i => xBuf[i] = [x + meetingWidth(info) / 2, sect.kind]);
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
            const x = Math.max(..._.range(sect.bc[0], sect.bc[2] + 1)
                .map((i) => xBuf[i]![0] + crossingMargin(info, xBuf[i]![1])));
            _.range(sect.bc[0], sect.bc[2] + 1).forEach(i => {
                const w = bcWidth(metrics);
                xBuf[i] = [x + w, sect.kind];
                paths[sect.perm[i - sect.bc[0]]!] += ` H ${x} ${drawSLine(metrics, i)}`;
                yLabelPositions[sect.perm[i - sect.bc[0]]!]!.push({ fromX: x + w / 2, y: bcY(metrics, i) });
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

    return { paths, meetings, labels, bbox, yLabelPositions };
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
    'bar': bar => drawBar(info.lineDist, bar.relExcess, atX, meeting.fromIncl, meeting.toIncl),
    'metro': metro => drawMetroStation(info.lineDist, metro.relWidth, metro.relStrapSize, atX, meeting.fromIncl, meeting.toIncl),
});

const drawBar = (dist: number, relExcess: number, atX: number, from: number, to: number) =>
    `M ${atX} ${(from - relExcess) * dist} v ${(to - from + 2 * relExcess) * dist}`

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

/// see ../../docu/storyline-utils.pdf
interface ArcMetrics {
    kind: 'arc',
    cs: number,
    ct: number,
    ds: number,
    dt: number,
}

interface BezierMetrics {
    kind: 'bezier',
    incline: number,
}

interface CommonMetrics {
    lineDist: number,
    bc: [number, number, number]
    w: number,
}

type BcMetrics = (ArcMetrics | BezierMetrics) & CommonMetrics;

const mkBcMetrics = (info: DrawingConfig, a: number, b: number, c: number): BcMetrics => {
    const w = (Math.max(b - a + 1, c - b) + Math.min(b - a, c - b - 1) / 2) * info.stretch.relWidth;
    const common: CommonMetrics = { lineDist: info.lineDist, bc: [a, b, c], w };
    const special: ArcMetrics | BezierMetrics = matchByKind(info.stretch, {
        'bezier': bezier => ({ kind: 'bezier', incline: bezier.incline }),
        'arc': () => {
            const [s, t] = [c - b, b - a + 1];
            const [rs, rt] = [(t * t + w * w) / (4 * t), (s * s + w * w) / (4 * s)];
            return { kind: 'arc', cs: (b + c + 1) / 2 - rs, ct: (a + b) / 2 + rt, ds: 2 * rs, dt: 2 * rt };
        },
    })
    return { ...common, ...special };
}

const bcWidth = (m: BcMetrics) => m.w * m.lineDist;

const bcY = (m: BcMetrics, startIndex: number) => {
    const [a, b, c] = m.bc;
    return m.lineDist * (startIndex <= b ? startIndex + c - b : startIndex + a - b - 1);
}

const drawSLine = (bcm: BcMetrics, i: number): string => {
    const [a, b, c, d] = [...bcm.bc, bcm.lineDist];
    return matchByKind(bcm, {
        'arc': m => {
            const [r1, r2, dx1, dx2, dy1, dy2] = (() => {
                if (i <= b) {
                    const r1 = m.ct - i;
                    const [dx1, dy1] = [(r1 / m.dt) * m.w, (r1 / m.dt) * (c - b)];
                    return [r1, m.dt - r1, dx1, m.w - dx1, dy1, c - b - dy1];
                } else {
                    const r1 = i - m.cs;
                    const [dx1, dy1] = [(r1 / m.ds) * m.w, (r1 / m.ds) * (a - b - 1)];
                    return [r1, m.ds - r1, dx1, m.w - dx1, dy1, a - b - 1 - dy1];
                }
            })();
            return `a ${r1 * d} ${r1 * d} 0 0 ${+(i <= b)} ${dx1 * d} ${dy1 * d}`
                + ` a ${r2 * d} ${r2 * d} 0 0 ${+(i > b)} ${dx2 * d} ${dy2 * d}`;
        },
        'bezier': m => {
            const e = m.incline;
            return i <= b ?
                `c ${e * m.w * d} 0 ${(1 - e) * m.w * d} ${(c - b) * d} ${m.w * d} ${(c - b) * d}` :
                `c ${e * m.w * d} 0 ${(1 - e) * m.w * d} ${(a - b - 1) * d} ${m.w * d} ${(a - b - 1) * d}`;
        }
    },
    );
}
