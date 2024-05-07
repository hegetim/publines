import React, { useState } from "react";
import "./Metrics.css";
import { cls } from "../model/Util";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { Realization, Storyline, calcMetrics } from "../model/Storyline";
import { bundleNumber } from "../model/CrossingComplex";

export const MetricsComponent = (props: { real: Realization, story: Storyline }) => {
    const [isCollapsed, setCollapsed] = useState(true);
    const metrics = calcMetrics(props.real);
    const bNumber = bundleNumber(props.story, props.real);

    return <div className="metrics-outer-container">
        <div {...cls('metrics-header-container', 'click-me')} onClick={() => setCollapsed(s => !s)}>
            <FontAwesomeIcon className="metrics-collapse-icon" fixedWidth icon={isCollapsed ? faChevronRight : faChevronDown} />
            <span className="metrics-outer-header">Metrics</span>
        </div>
        <div {...cls('metrics-inner-container', { 'metrics-collapsed': isCollapsed })}>
            <div className="metrics-metric-label">crossings:</div>
            <div className="metrics-metric-value">{metrics.crossings.toString()}</div>
            <div className="metrics-metric-label">block crossings:</div>
            <div className="metrics-metric-value">{metrics.blockCrossings.toString()}</div>
            <div className="metrics-metric-label">passages:</div>
            <div className="metrics-metric-value">{metrics.passages.toString()}</div>
            <div className="metrics-metric-label">bundle number:</div>
            <div className="metrics-metric-value">{bNumber.toString()}</div>
        </div>
    </div>;
}
