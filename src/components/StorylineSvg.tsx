import React, { useEffect } from "react"
import _ from "lodash";
import { DrawingConfig, DrawingResult, ProtoLabel, bbox2viewBox } from "./StorylineDrawings"
import { matchByKind, matchString } from "../model/Util";
import { selectColor } from "./StorylineComponent";

export const StorylineSvg = (props: {
    config: DrawingConfig,
    drawn: DrawingResult,
    meetingMeta: { title: string, informal: boolean }[],
    authorNames: string[],
}) => {
    const bbox = props.drawn.bbox;

    useEffect(() => {
        const rootStyle = document.documentElement.style;
        rootStyle.setProperty('--author-line-stroke-width', props.config.authorLineStrokeWidth.toString());
        rootStyle.setProperty('--selected-line-stroke-width', (1.5 * props.config.authorLineStrokeWidth).toString());
    }, [props.config.authorLineStrokeWidth]);

    return <svg className="story-main-svg" {...bbox2viewBox(bbox)}>
        <g className="author-lines-group">
            {..._.zip(props.drawn.paths, props.authorNames).map(([cmds, name], i) =>
                <path key={i} {...authorCommons} {...mkAuthorStyle(i)} d={cmds}><title>{name}</title></path>)}
        </g>
        <g>
            {..._.zip(props.drawn.meetings, props.meetingMeta).map(([cmds, meta], i) =>
                <path key={i} {...mkMeetingStyle(props.config, meta!.informal)} d={cmds}>
                    <title>{meta!.title}</title>
                </path>)}
        </g>
        <g>
            {...props.drawn.labels.map(l => <text {...mkLabelStyle(l)} x={l.x} y={l.y}>{l.text}</text>)}
        </g>
    </svg>
}

const authorCommons = { fill: "none" };

const mkAuthorStyle = (i: number) => ({
    stroke: selectColor(i),
    strokeDasharray: i === 0 ? "6 3" : "none",
});

const mkMeetingStyle = (config: DrawingConfig, informal: boolean): React.SVGProps<SVGPathElement> =>
    matchByKind(config.meetingStyle, {
        'bar': bar => ({ stroke: (informal ? "#808080" : "black"), strokeWidth: config.lineDist * bar.relWidth }),
        'metro': () => ({ stroke: "black", fill: (informal ? "#cccccc" : "white"), strokeWidth: 1 }),
    });

const labelCommons = { textAnchor: 'middle' };

const mkLabelStyle = (label: ProtoLabel<'enum' | 'tick'>) => matchString(label.kind, {
    'enum': () => ({ ...labelCommons, fill: "#808080" }),
    'tick': () => ({ ...labelCommons }),
});
