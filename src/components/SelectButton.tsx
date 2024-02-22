import _ from "lodash";
import "./SelectButton.css";
import React from "react";
import { ClassNames, cls } from "../model/Util";

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
