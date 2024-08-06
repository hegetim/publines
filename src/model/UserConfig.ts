import { DrawingConfig, enumerationStyles, MeetingStyle, Stretch } from "../components/StorylineDrawings";
import { ExcludeInformal, excludeInformalOpts } from "./Metadata";
import { bimap, Codec, concat, enumCodec, numberCodec, or, productCodec, singletonCodec } from "./StringCoded";
import { TupleToUnion, fail, matchString } from "./Util";

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
    authorLineThickness: TupleToUnion<typeof lineThicknesses>,
    stretch: TupleToUnion<typeof stretches>,
}

export const lineThicknesses = ['thin', 'normal', 'heavier', 'fat'] as const;
export const stretches = ['condensed', 'normal', 'expanded'] as const;

export interface DataConfig {
    source: TupleToUnion<typeof dataSources>,
    excludeInformal: ExcludeInformal,
    excludeOld: number | false,
    coauthorCap: number | false,
}

export const dataSources = ['dblp', 'playground'] as const;

export interface AlgoConfig {
    realization: TupleToUnion<typeof realizationAlgos>,
    bundling: TupleToUnion<typeof bundlingOpts>,
}

export const realizationAlgos = ['1scm', '2scm', 'mscm', 'sbcm', 'bi-sbcm'] as const;
export const bundlingOpts = ['bundle', 'ignore', 'unbundle'] as const;

const baseThickness = 3;

export const mkDrawingConfig = (base: StyleConfig): DrawingConfig => ({
    lineDist: base.lineDistance,
    stretch: matchString(base.stretch, {
        'condensed': (): Stretch => ({ kind: 'bezier', incline: 2 / 3, relWidth: Math.pow(2, -1 / 4) }),
        'normal': (): Stretch => ({ kind: 'arc', relWidth: Math.pow(2, 1 / 4) }),
        'expanded': (): Stretch => ({ kind: 'arc', relWidth: Math.pow(2, 3 / 4) }),
    }),
    initialMargin: base.lineDistance / 2,
    finalMargin: base.lineDistance / 2,
    crossing2crossingMargin: 0,
    crossing2meetingMargin: base.lineDistance / 4,
    meeting2meetingMargin: base.lineDistance / 2,
    xAxisLabelMargin: base.lineDistance / 4,
    meetingStyle: matchString(base.meetingStyle, {
        'metro': (): MeetingStyle => ({ kind: 'metro', relWidth: 2 / 3, relStrapSize: 2 / 5 }),
        'bar': (): MeetingStyle => ({ kind: 'bar', relWidth: 1 / 5, relExcess: 1 / 3 }),
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
    algo: { realization: '2scm', bundling: 'bundle' },
    data: { source: 'dblp', excludeInformal: 'repeated', excludeOld: 10, coauthorCap: 10 },
    style: {
        lineDistance: 24,
        meetingStyle: 'metro',
        xAxisPosition: 'bottom',
        enumerationStyle: 'x',
        authorLineThickness: 'normal',
        stretch: 'normal',
    },
}

export const store = (conf: UserConfig) => versionedCodec.enc(conf)

export const loadWithDefaults = (raw: string | undefined) =>
    raw ? ({ ...configDefaults, ...versionedCodec.dec(raw)[0] }) : configDefaults;

const version = 1

const styleCodec: Codec<StyleConfig> = productCodec({
    lineDistance: numberCodec(),
    meetingStyle: enumCodec(['bar', 'metro']),
    xAxisPosition: enumCodec(['bottom', 'top']),
    enumerationStyle: enumCodec(enumerationStyles),
    authorLineThickness: enumCodec(lineThicknesses),
    stretch: enumCodec(stretches),
});

const dataCodec: Codec<DataConfig> = productCodec({
    source: enumCodec(dataSources),
    coauthorCap: or(singletonCodec('f', false), numberCodec(), x => x === false),
    excludeInformal: enumCodec(excludeInformalOpts),
    excludeOld: or(singletonCodec('f', false), numberCodec(), x => x === false),
});

const algoCodec: Codec<AlgoConfig> = productCodec({
    bundling: enumCodec(bundlingOpts),
    realization: enumCodec(realizationAlgos),
});

const configCodec: Codec<UserConfig> = productCodec({ style: styleCodec, data: dataCodec, algo: algoCodec });

const versionedCodec: Codec<UserConfig> = bimap(
    concat([numberCodec(), singletonCodec('_', '_' as const), configCodec] as const),
    ([v, _0, c]) => v !== version ? fail(`unsupported version ${v}`) : c,
    c => [version, '_', c] as const,
);
