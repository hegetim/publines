import React, { useState } from "react";
import _ from "lodash";
import * as O from 'optics-ts/standalone';
import './Settings.css';
import { AlgoConfig, DataConfig, StyleConfig, UserConfig, dataSources, realizationAlgos } from "../model/UserConfig";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { TupleToUnion, cls, matchString } from "../model/Util";
import { excludeInformalOpts } from "../model/Metadata";
import { DrawingConfig, MeetingStyle, enumerationStyles } from "./StorylineDrawings";
import { BinarySelect, NumericInput, OptionalNumericInput, OptionalSelectInput, SelectButton, SelectInput } from "./InputWidgets";

export const Settings = (props: { config: UserConfig, updateConfig: (f: (c: UserConfig) => UserConfig) => void }) => {
    const [isCollapsed, setCollapsed] = useState(true);

    return <div className="settings-outer-container">
        <div {...cls('settings-header-container', 'click-me')} onClick={() => setCollapsed(s => !s)}>
            <FontAwesomeIcon className="settings-collapse-icon" fixedWidth icon={isCollapsed ? faChevronRight : faChevronDown} />
            <span className="settings-outer-header">Settings</span>
        </div>
        <div {...cls('settings-inner-container', { 'settings-collapsed': isCollapsed })}>
            <div className="settings-inner-header">Data Source</div>
            <div className="settings-inner-par">
                <div className="settings-setting-label">data provider:</div>
                <SelectInput<DataConfig['source']> classNames={['settings-select-provider']}
                    handle={src => props.updateConfig(dataSource(src))} value={props.config.data.source}
                    sanitize={sanitize(dataSources, props.config.data.source)}
                    options={{ dblp: "dblp.org", playground: "playground" }} />
                <div className="settings-setting-label">exclude informal publications:</div>
                <SelectInput<DataConfig['excludeInformal']> classNames={['settings-select-informal']}
                    value={props.config.data.excludeInformal} handle={x => props.updateConfig(excludeInformal(x))}
                    sanitize={sanitize(excludeInformalOpts, props.config.data.excludeInformal)}
                    options={{ all: "exclude all", repeated: "exclude repeated titles", none: "show all" }} />
                <OptionalNumericInput classNames={['settings-setting-oneline', 'settings-input-container']} default={10}
                    value={props.config.data.excludeOld || undefined} isValid={n => isFinite(n) && n > 0}
                    setValue={n => props.updateConfig(excludeOld(n ?? false))}
                    labels={{ infix: "exlude publications older than" }} unitString="years" />
                <OptionalNumericInput classNames={['settings-setting-oneline', 'settings-input-container']} default={10}
                    value={props.config.data.coauthorCap || undefined} isValid={n => isFinite(n) && n > 0}
                    setValue={n => props.updateConfig(coauthorCap(n ?? false))}
                    labels={{ infix: "show only top", suffix: "coauthors" }} />
            </div>
            <div className="settings-inner-header">Algorithms</div>
            <div className="settings-inner-par">
                <div className="settings-setting-label">(block) crossing minimization:</div>
                <SelectInput<AlgoConfig['realization']> classNames={['settings-select-algo']}
                    value={props.config.algo.realization} handle={r => props.updateConfig(algoReal(r))}
                    sanitize={sanitize(realizationAlgos, props.config.algo.realization)}
                    options={{ '1scm': "one-sided SCM", '2scm': "two-sided SCM", sbcm: "greedy SBCM", 'bi-sbcm': "bidirectional SBCM" }} />
                <div className="settings-setting-label">crossings bundling:</div>
                <SelectButton<AlgoConfig['bundling']> value={props.config.algo.bundling}
                    setValue={key => props.updateConfig(algoBundle(key))} additionalClassNames={['settings-input-container']}
                    labels={{ bundle: "bundle", ignore: "ignore", unbundle: "unbundle" }} />
            </div>
            <div className="settings-inner-header">Visuals</div>
            <div className="settings-inner-par">
                <div className="settings-setting-label">distance between author lines:</div>
                <NumericInput classNames={["settings-input-container"]} value={props.config.style.lineDistance}
                    isValid={n => isFinite(n) && n > 4} setValue={d => props.updateConfig(lineDist(d))} unitString="px" />
                <div className="settings-setting-label">author line thickness:</div>
                <SelectButton<StyleConfig['authorLineThickness']> value={props.config.style.authorLineThickness}
                    setValue={key => props.updateConfig(lineThickness(key))} additionalClassNames={['settings-input-container']}
                    labels={{ thin: "thin", normal: "normal", heavier: "heavier", fat: "fat" }} />
                <div className="settings-setting-label">crossings stretch:</div>
                <SelectButton<StyleConfig['stretch']> value={props.config.style.stretch}
                    setValue={key => props.updateConfig(stretch(key))} additionalClassNames={['settings-input-container']}
                    labels={{ condensed: "condensed", normal: "normal", expanded: "expanded" }} />
                <div className="settings-setting-label">draw meetings as:</div>
                <BinarySelect<StyleConfig['meetingStyle']> toggle={() => props.updateConfig(toggleMeetingStyle)}
                    classNames={['settings-input-container']} value={props.config.style.meetingStyle}
                    options={{ left: ['metro', "metro station"], right: ['bar', "vertical bar"] }} />
                <div className="settings-setting-label">place x-axis at:</div>
                <BinarySelect<StyleConfig['xAxisPosition']> classNames={['settings-input-container']}
                    toggle={() => props.updateConfig(toggleXAxisPos)} value={props.config.style.xAxisPosition}
                    options={{ left: ['top', "top"], right: ['bottom', "bottom"] }} />
                <OptionalSelectInput<TupleToUnion<typeof enumerationStyles>> classNames={['settings-setting-oneline']}
                    default='x' value={props.config.style.enumerationStyle} setValue={s => props.updateConfig(enumStyle(s))}
                    sanitize={sanitize(enumerationStyles, 'x')} labels={{ infix: "enumerate publications as" }}
                    options={{ 'x': "plain numbers", '[x]': "numbers with brackets", 'x.': "numbers followed by a period" }} />
            </div>
        </div>
    </div>;
}

const dataSource: (src: DataConfig['source']) => (c: UserConfig) => UserConfig = O.set(O.compose('data', 'source'));

const excludeInformal: (exc: DataConfig['excludeInformal']) => (c: UserConfig) => UserConfig =
    O.set(O.compose('data', 'excludeInformal'));

const excludeOld: (v: number | false) => (c: UserConfig) => UserConfig = O.set(O.compose('data', 'excludeOld'));

const coauthorCap: (v: number | false) => (c: UserConfig) => UserConfig = O.set(O.compose('data', 'coauthorCap'));

const algoReal: (r: AlgoConfig['realization']) => (c: UserConfig) => UserConfig = O.set(O.compose('algo', 'realization'));

const algoBundle: (key: AlgoConfig['bundling']) => (c: UserConfig) => UserConfig = O.set(O.compose('algo', 'bundling'));

const lineDist: (d: number) => (c: UserConfig) => UserConfig = O.set(O.compose('style', 'lineDistance'));

const lineThickness: (key: StyleConfig['authorLineThickness']) => (c: UserConfig) => UserConfig =
    O.set(O.compose('style', 'authorLineThickness'));

const stretch: (key: StyleConfig['stretch']) => (c: UserConfig) => UserConfig = O.set(O.compose('style', 'stretch'));

type K1 = MeetingStyle['kind'];
const toggleMeetingStyle: (c: UserConfig) => UserConfig = O.modify(O.compose('style', 'meetingStyle'), (s: K1) =>
    matchString<K1, K1>(s, { 'metro': () => 'bar', 'bar': () => 'metro' }));

type K2 = DrawingConfig['xAxisPos'];
const toggleXAxisPos: (c: UserConfig) => UserConfig = O.modify(O.compose('style', 'xAxisPosition'), (s: K2) =>
    matchString<K2, K2>(s, { 'top': () => 'bottom', 'bottom': () => 'top' }));

const enumStyle: (v: DrawingConfig['enumerateMeetings']) => (c: UserConfig) => UserConfig =
    O.set(O.compose('style', 'enumerationStyle'));

const sanitize = <T extends readonly string[]>(options: T, orElse: TupleToUnion<T>): (v: string) => TupleToUnion<T> =>
    (value: string) => options.includes(value) ? value as TupleToUnion<T> : orElse;
