import React, { useEffect, useState } from "react";
import _ from "lodash";
import * as O from 'optics-ts/standalone';
import './Settings.css';
import { AlgoConfig, DataConfig, StyleConfig, UserConfig, dataSources, sbcmAlgos } from "../model/UserConfig";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight, faToggleOff, faToggleOn } from "@fortawesome/free-solid-svg-icons";
import { TupleToUnion, cls, matchString } from "../model/Util";
import { ExcludeInformal, excludeInformalOpts } from "../model/Metadata";
import { DrawingConfig, MeetingStyle, enumerationStyles } from "../model/StorylineDrawings";
import { SelectButton } from "./SelectButton";

export const Settings = (props: Props) => {
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
                <select {...cls('settings-setting-input', 'settings-input-container', 'settings-select-provider')}
                    value={props.config.data.source} onChange={x => props.updateConfig(dataSource(x.target.value))}>
                    {...mkOptions<DataConfig['source']>({ 'dblp': "dblp.org", 'playground': "playground" })}
                </select>
                <div className="settings-setting-label">exclude informal publications:</div>
                <select {...cls('settings-setting-input', 'settings-input-container', 'settings-select-informal')}
                    value={props.config.data.excludeInformal} onChange={x => props.updateConfig(excludeInformal(x.target.value))}>
                    {...mkOptions<ExcludeInformal>({
                        'all': "exclude all",
                        'repeated': "exclude repeated titles",
                        'none': "show all"
                    })}
                </select>
                <CoauthorCapWidget {...props} />
            </div>
            <div className="settings-inner-header">Algorithms</div>
            <div className="settings-inner-par">
                <div className="settings-setting-label">(block) crossing minimization:</div>
                <select {...cls('settings-setting-input', 'settings-input-container', 'settings-select-algo')}
                    value={props.config.algo.kind} onChange={x => props.updateConfig(algoKind(x.target.value))}>
                    {...mkOptions<AlgoConfig['kind']>({ '1scm': "one-sided SCM", '2scm': "two-sided SCM" })}
                </select>
            </div>
            <div className="settings-inner-header">Visuals</div>
            <div className="settings-inner-par">
                <div className="settings-setting-label">distance between author lines:</div>
                <div className="settings-input-container">
                    <input {...cls('settings-setting-input', 'settings-input-cap')} type="number" min={1}
                        value={props.config.style.lineDistance} onChange={ev => props.updateConfig(lineDist(ev.target.value))} />
                    <span className="settings-setting-label">px</span>
                </div>
                <div className="settings-setting-label">author line thickness:</div>
                <SelectButton<StyleConfig['authorLineThickness']> value={props.config.style.authorLineThickness}
                    setValue={key => props.updateConfig(lineThickness(key))} additionalClassNames={['settings-input-container']}
                    labels={{ thin: "thin", normal: "normal", heavier: "heavier", fat: "fat" }} />
                <ToggleMeetingStyleWidget {...props} />
                <div className="settings-setting-label">crossings stretch:</div>
                <SelectButton<StyleConfig['stretch']> value={props.config.style.stretch}
                    setValue={key => props.updateConfig(stretch(key))} additionalClassNames={['settings-input-container']}
                    labels={{ condensed: "condensed", normal: "normal", expanded: "expanded" }} />
                <ToggleXAxisPosWidget {...props} />
                <EnumerationStyleWidget {...props} />
            </div>
        </div>
    </div>;
}

const CoauthorCapWidget = (props: Props) => {
    const [capShadow, setCapShadow] = useState(props.config.data.coauthorCap || 10);

    useEffect(() => {
        if (props.config.data.coauthorCap !== false) { setCapShadow(props.config.data.coauthorCap) }
    }, [props.config.data.coauthorCap]);

    const toggleDisable = () => {
        const isDisabled = props.config.data.coauthorCap === false;
        props.updateConfig(coauthorCap(isDisabled ? capShadow : false));
    }

    const handleNumberChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        const number = parsePositiveOrElse(ev.target.value, capShadow);
        setCapShadow(number);
        props.updateConfig(coauthorCap(number));
    }

    return <div className="settings-setting-oneline">
        <span className="click-me" onClick={toggleDisable}>
            <FontAwesomeIcon className="settings-setting-input"
                icon={props.config.data.coauthorCap === false ? faToggleOff : faToggleOn} />
            <span className="settings-setting-label">show only top</span>
        </span>
        <input {...cls('settings-setting-input', 'settings-input-cap')} type="number" min={1}
            value={capShadow} onChange={handleNumberChange} disabled={props.config.data.coauthorCap === false} />
        <span className="settings-setting-label">coauthors</span>
    </div>;
}

const ToggleMeetingStyleWidget = (props: Props) => {
    const selectRight = matchString(props.config.style.meetingStyle, { 'metro': () => false, 'bar': () => true });
    return <React.Fragment>
        <div className="settings-setting-label">draw meetings as:</div>
        <div onClick={() => props.updateConfig(toggleMeetingStyle)} {...cls('click-me', 'settings-input-container')}>
            <span className="settings-setting-label">metro station</span>
            <FontAwesomeIcon className="settings-setting-input" icon={faToggleOff} {...(selectRight ? { flip: 'horizontal' } : {})} />
            <span className="settings-setting-label">vertical bar</span>
        </div>
    </React.Fragment>;
}

const ToggleXAxisPosWidget = (props: Props) => {
    const selectRight = matchString(props.config.style.xAxisPosition, { 'top': () => false, 'bottom': () => true });
    return <React.Fragment>
        <div className="settings-setting-label">place x-axis at:</div>
        <div onClick={() => props.updateConfig(toggleXAxisPos)} {...cls('click-me', 'settings-input-container')}>
            <span className="settings-setting-label">top</span>
            <FontAwesomeIcon className="settings-setting-input" icon={faToggleOff} {...(selectRight ? { flip: 'horizontal' } : {})} />
            <span className="settings-setting-label">bottom</span>
        </div>
    </React.Fragment>;
}

const EnumerationStyleWidget = (props: Props) => {
    const [styleShadow, setStyleShadow] = useState(props.config.style.enumerationStyle ?? 'x');

    useEffect(() => {
        if (props.config.style.enumerationStyle) { setStyleShadow(props.config.style.enumerationStyle); }
    }, [props.config.style.enumerationStyle]);

    const toggleDisable = () => {
        const isDisabled = props.config.style.enumerationStyle === undefined;
        props.updateConfig(enumStyle(isDisabled ? styleShadow : undefined));
    }

    const handleSelectionChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = sanitize(ev.target.value, enumerationStyles, styleShadow);
        setStyleShadow(selected);
        props.updateConfig(enumStyle(selected));
    }

    return <div className="settings-setting-oneline">
        <span className="click-me" onClick={toggleDisable}>
            <FontAwesomeIcon className="settings-setting-input"
                icon={props.config.style.enumerationStyle ? faToggleOn : faToggleOff} />
            <span className="settings-setting-label">enumerate publications as</span>
        </span>
        <select {...cls('settings-setting-input', 'settings-input-enum')}
            value={styleShadow} onChange={handleSelectionChange} disabled={props.config.style.enumerationStyle === undefined}>
            {...mkOptions<TupleToUnion<typeof enumerationStyles>>({
                'x': "plain numbers",
                '[x]': "numbers with brackets",
                'x.': "numbers followed by a period"
            })}
        </select>
    </div>;
}

const parsePositiveOrElse = (raw: string, orElse: number) => {
    const res = parseInt(raw);
    return res > 0 ? res : orElse;
}

const dataSource = (raw: string) => (c: UserConfig) =>
    O.set(O.compose('data', 'source'), sanitize(raw, dataSources, c.data.source), c);

const excludeInformal = (raw: string) => (c: UserConfig) =>
    O.set(O.compose('data', 'excludeInformal'), sanitize(raw, excludeInformalOpts, c.data.excludeInformal), c);

const coauthorCap: (v: number | false) => (c: UserConfig) => UserConfig = O.set(O.compose('data', 'coauthorCap'));

const algoKind = (raw: string) => (c: UserConfig) =>
    O.set(O.compose('algo', 'kind'), sanitize(raw, sbcmAlgos, c.algo.kind), c);

const lineDist = (raw: string) => (c: UserConfig) =>
    O.set(O.compose('style', 'lineDistance'), parsePositiveOrElse(raw, c.style.lineDistance), c);

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

const sanitize = <T extends readonly string[]>(value: string, options: T, orElse: TupleToUnion<T>): TupleToUnion<T> =>
    options.includes(value) ? value as TupleToUnion<T> : orElse;

const mkOptions = <K extends string>(body: { [P in K]: string }) =>
    Object.entries<string>(body).map(([value, text]) => <option key={value} value={value}>{text}</option>);

interface Props {
    config: UserConfig,
    updateConfig: (f: (c: UserConfig) => UserConfig) => void,
}
