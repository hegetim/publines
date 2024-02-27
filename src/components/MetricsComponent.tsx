import React, { useState } from "react";
import "./Metrics.css";
import { cls } from "../model/Util";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { SbcmRealization, calcMetrics } from "../model/Storyline";

export const MetricsComponent = (props: { data: SbcmRealization }) => {
    const [isCollapsed, setCollapsed] = useState(true);
    const metrics = calcMetrics(props.data);

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
        </div>
    </div>;
}
