import { DrawingConfig, MeetingStyle } from "./StorylineDrawings";
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
}

export interface DataConfig {
    source: 'Dblp',
    filterInformal: ExcludeInformal,
    coauthorCap: number | false,
}

export interface AlgoConfig {
    kind: TupleToUnion<typeof sbcmAlgos>
}

export const sbcmAlgos = ['1scm', '2scm'] as const;

export const mkDrawingConfig = (base: StyleConfig): DrawingConfig => ({
    lineDist: base.lineDistance,
    stretch: .4,
    initialMargin: base.lineDistance / 2,
    finalMargin: base.lineDistance / 2,
    crossing2crossingMargin: 0,
    crossing2meetingMargin: base.lineDistance / 4,
    meeting2meetingMargin: base.lineDistance / 2,
    xAxisLabelMargin: base.lineDistance / 4,
    meetingStyle: matchString<MeetingStyle['kind'], MeetingStyle>(base.meetingStyle, {
        'metro': () => ({ kind: 'metro', relWidth: 2 / 3, relStrapSize: 2 / 5 }),
        'bar': () => ({ kind: 'bar', relWidth: 1 / 5, relExcess: 1 / 5 }),
    }),
    xAxisPos: base.xAxisPosition,
    enumerateMeetings: base.enumerationStyle,
    labelLineSpacing: 1.2,
});

export const configDefaults: UserConfig = {
    algo: { kind: '2scm' },
    data: { source: 'Dblp', filterInformal: 'repeated', coauthorCap: 10 },
    style: { lineDistance: 24, meetingStyle: 'metro', xAxisPosition: 'bottom', enumerationStyle: 'x' },
}
