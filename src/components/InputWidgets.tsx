/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useState } from "react";
import { ClassNames, cls } from "../model/Util";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleExclamation, faToggleOff, faToggleOn } from "@fortawesome/free-solid-svg-icons";
import "./InputWidgets.css";

interface OptionalWidgetProps<S> {
    value: S | undefined,
    setValue: (s: S | undefined) => void;
    default: S,
    labels: { infix?: string, suffix?: string },
    classNames?: ClassNames,
}

const useShadowState = <S,>(props: Pick<OptionalWidgetProps<S>, 'default' | 'setValue' | 'value'>) => {
    const [shadowState, setShadowState] = useState(props.default);
    useEffect(() => { if (props.value) { setShadowState(props.value); } }, [props.value]);
    const toggle = useCallback(() => {
        const isDisabled = props.value === undefined;
        props.setValue(isDisabled ? shadowState : undefined);
    }, [props.value, shadowState, props.setValue]);
    const handleChange = useCallback((s: S) => {
        setShadowState(s);
        props.setValue(s);
    }, [props.setValue, setShadowState]);
    return [shadowState, toggle, handleChange] as const;
}

export const OptionalNumericInput = (props: OptionalWidgetProps<number> & {
    isValid: (n: number) => boolean,
    unitString?: string,
}) => {
    const [shadowState, toggle, handleChange] = useShadowState(props);
    const disabled = props.value === undefined;

    return <div {...cls(...props.classNames ?? [])}>
        <span className="click-me" onClick={toggle}>
            <FontAwesomeIcon icon={disabled ? faToggleOff : faToggleOn} />
            <span>{props.labels.infix}</span>
        </span>
        <NumericInput value={shadowState} setValue={handleChange} disabled={disabled} isValid={props.isValid}
            {...(props.unitString ? { unitString: props.unitString } : [])} classNames={['inner-numeric-input']} />
        <span>{props.labels.suffix}</span>
    </div>;
}

export const OptionalSelectInput = <K extends string>(props: OptionalWidgetProps<K> & {
    options: SelectOptions<K>,
    sanitize: (raw: string) => K,
}) => {
    const [shadowState, toggle, handleChange] = useShadowState(props);
    const disabled = props.value === undefined;

    return <div {...cls(...props.classNames ?? [])}>
        <span className="click-me" onClick={toggle}>
            <FontAwesomeIcon icon={disabled ? faToggleOff : faToggleOn} />
            <span>{props.labels.infix}</span>
        </span>
        <SelectInput value={shadowState} handle={handleChange} disabled={disabled} sanitize={props.sanitize}
            options={props.options} classNames={['inner-select-input']} />
        <span>{props.labels.suffix}</span>
    </div>;
}

export const SelectInput = <K extends string>(props: {
    options: SelectOptions<K>,
    value: K,
    sanitize: (raw: string) => K,
    handle: (k: K) => void,
    disabled?: boolean,
    classNames?: ClassNames,
}) => {
    const handleChange = (ev: React.ChangeEvent<HTMLSelectElement>) => props.handle(props.sanitize(ev.target.value));
    return <select {...cls(...props.classNames ?? [])} value={props.value} onChange={handleChange} disabled={props.disabled}>
        {...mkOptions(props.options)}
    </select>;
}

type SelectOptions<K extends string> = { [P in K]: string };

const mkOptions = <K extends string>(body: SelectOptions<K>) =>
    Object.entries<string>(body).map(([value, text]) => <option key={value} value={value}>{text}</option>);

export const BinarySelect = <K extends string>(props: {
    options: { left: readonly [K, string], right: readonly [K, string] },
    value: K,
    toggle: () => void,
    classNames?: ClassNames,
}) => {
    const selectRight = props.value === props.options.right[0];
    return <div onClick={() => props.toggle()} {...cls('click-me', ...props.classNames ?? [])}>
        <span>{props.options.left[1]}</span>
        <FontAwesomeIcon icon={faToggleOff} {...(selectRight ? { flip: 'horizontal' } : {})} />
        <span>{props.options.right[1]}</span>
    </div>;
}

export const NumericInput = (props: {
    value: number,
    isValid: (n: number) => boolean,
    setValue: (n: number) => void,
    unitString?: string,
    disabled?: boolean,
    classNames?: ClassNames,
}) => {
    const [shadowValue, setShadowValue] = useState(props.value.toString());
    useEffect(() => { if (props.value) { setShadowValue(props.value.toString()); } }, [props.value]);

    const valid = props.isValid(parseInt(shadowValue));
    const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setShadowValue(ev.target.value);
        const parsed = parseInt(ev.target.value);
        if (props.isValid(parsed)) { props.setValue(parsed); }
    }

    return <div {...cls(...props.classNames ?? [])}>
        <input type="number" value={shadowValue} onChange={handleChange} disabled={props.disabled} />
        <span>{props.unitString}</span>
        {valid ? "" : <FontAwesomeIcon className="numeric-input-invalid" icon={faCircleExclamation} />}
    </div>
}

export const SelectButton = <K extends string>(props: {
    labels: { [_ in K]: string },
    value: K,
    setValue: (k: K) => void,
    additionalClassNames?: ClassNames,
}) => {
    const buttons: React.ReactElement[] = []
    for (let k in props.labels) {
        buttons.push(
            <span key={k} {...cls('select-button-option', { 'select-button-selected': props.value === k })}
                onClick={() => props.setValue(k)}>{props.labels[k]}</span>
        );
    }
    return <div {...cls("select-button-container", ...(props.additionalClassNames ?? []))}>{buttons}</div>;
}
