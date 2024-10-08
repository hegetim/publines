/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from "react";
import './Loading.css';
import { ClassNames, cls } from "../model/Util";

export const Loading = (props: { className?: ClassNames, hideLabel?: boolean, labelText?: string }) =>
    <span {...cls('loading-container', ...props.className ?? [])}>
        <div {...cls('loading-main-icon', 'loading-animated')} />
        {props.hideLabel ? null : <span className="loading-added-label">{props.labelText ?? 'loading...'}</span>}
    </span>;
