import React from "react";
import { calcTextSize } from "./DomUtils";
import { BBox, bbox2viewBox } from "./StorylineDrawings";

export const StorylineYTickLabels = (props: {
    labels: string[],
    relativeScrollPos: number,
    mainBBox: BBox,
    colors?: (i: number) => string,
    pathYPos: (i: number, rsp: number) => number,
}) => {
    const width = Math.max(...props.labels.map(s => calcTextSize(s).width));
    const commons = { textAnchor: 'end' }

    return <svg className="story-y-labels" {...bbox2viewBox({ ...props.mainBBox, width, left: 0 })}>
        {props.labels.map((s, i) => <text key={s + i} {...commons} fill={props.colors ? props.colors(i) : 'black'}
            x={width} y={props.pathYPos(i, props.relativeScrollPos)}>{s}</text>)}
    </svg>
}
