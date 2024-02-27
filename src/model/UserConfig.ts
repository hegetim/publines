import { DrawingConfig, MeetingStyle, Stretch } from "./StorylineDrawings";
import { ExcludeInformal } from "./Metadata";
import { TupleToUnion, matchString } from "./Util";

export interface UserConfig {
    style: StyleConfig,
    data: DataConfig,
    algo: AlgoConfig,
}

export interface StyleConfig {
    lineDistance: DrawingConfig['lineDist'],
    meetingStyle: MeetingStyle['kind'],
    xAxisPosition: DrawingConfig['xAxisPos'],
    enumerationStyle: DrawingConfig['enumerateMeetings'],
    authorLineThickness: 'thin' | 'normal' | 'heavier' | 'fat',
    stretch: 'condensed' | 'normal' | 'expanded',
}

export interface DataConfig {
    source: TupleToUnion<typeof dataSources>,
    excludeInformal: ExcludeInformal,
    coauthorCap: number | false,
}

export const dataSources = ['dblp', 'playground'] as const;

export interface AlgoConfig {
    kind: TupleToUnion<typeof sbcmAlgos>
}

export const sbcmAlgos = ['1scm', '2scm'] as const;

const baseThickness = 3;

export const mkDrawingConfig = (base: StyleConfig): DrawingConfig => ({
    lineDist: base.lineDistance,
    stretch: matchString(base.stretch, {
        'condensed': (): Stretch => ({ kind: 'bezier', incline: 2 / 3, relWidth: Math.pow(2, -1 / 3) }),
        'normal': (): Stretch => ({ kind: 'arc', relWidth: Math.pow(2, 1 / 3) }),
        'expanded': (): Stretch => ({ kind: 'arc', relWidth: 2 }),
    }),
    initialMargin: base.lineDistance / 2,
    finalMargin: base.lineDistance / 2,
    crossing2crossingMargin: 0,
    crossing2meetingMargin: base.lineDistance / 4,
    meeting2meetingMargin: base.lineDistance / 2,
    xAxisLabelMargin: base.lineDistance / 4,
    meetingStyle: matchString(base.meetingStyle, {
        'metro': (): MeetingStyle => ({ kind: 'metro', relWidth: 2 / 3, relStrapSize: 2 / 5 }),
        'bar': (): MeetingStyle => ({ kind: 'bar', relWidth: 1 / 5, relExcess: 1 / 5 }),
    }),
    xAxisPos: base.xAxisPosition,
    enumerateMeetings: base.enumerationStyle,
    labelLineSpacing: 1.2,
    authorLineStrokeWidth: matchString(base.authorLineThickness, {
        'thin': () => baseThickness * Math.SQRT1_2,
        'normal': () => baseThickness,
        'heavier': () => baseThickness * Math.SQRT2,
        'fat': () => baseThickness * 2,
    })
});

export const configDefaults: UserConfig = {
    algo: { kind: '2scm' },
    data: { source: 'dblp', excludeInformal: 'repeated', coauthorCap: 10 },
    style: {
        lineDistance: 24,
        meetingStyle: 'metro',
        xAxisPosition: 'bottom',
        enumerationStyle: 'x',
        authorLineThickness: 'normal',
        stretch: 'normal',
    },
}
