import React from "react"
import { DrawingConfig, MeetingStyle, ProtoLabel, bcWidth, defaultConfig, drawSLine, drawSections, mkBcMetrics, mkSections } from "./StorylineUtils"
import { Storyline, SBCMRealization } from "../model/Storyline";
import { matchByKind, matchString } from "../model/Util";
import _ from "lodash";

export const StorylineSvg = (props: {
    config: DrawingConfig,
    story: Storyline,
    realization: SBCMRealization,
    meetingTickLabels: string[],
    meetingTitles: string[],
    authorNames: string[],
}) => {
    const sections = mkSections(props.story, props.realization, props.meetingTickLabels)!;
    const { paths, meetings, labels, bbox } = drawSections(props.config, sections, props.realization.initialPermutation);
    const pathCommons = { fill: "none", strokeWidth: 3 };
    const meetingCommons = mkMeetingStyle(props.config.meetingStyle);
    return <svg className="story-main-svg" viewBox={`${bbox.left - 10} ${bbox.top - 10} ${bbox.width + 20} ${bbox.height + 20}`}>
        <g>
            {..._.zip(paths, props.authorNames).map(([cmds, name], i) =>
                <path key={i} {...pathCommons} stroke={selectColor(i)} d={cmds}><title>{name}</title></path>)}
        </g>
        <g>
            {..._.zip(meetings, props.meetingTitles).map(([cmds, title], i) =>
                <path key={i} {...meetingCommons} d={cmds}><title>{title}</title></path>)}
        </g>
        <g>
            {...labels.map(l => <text {...mkLabelStyle(l)} x={l.x} y={l.y}>{l.text}</text>)}
        </g>
    </svg>
}

const mkMeetingStyle = (style: MeetingStyle) => matchString(style.kind, {
    'Bar': () => ({ stroke: "none", fill: "black" }),
    'Metro': () => ({ stroke: "black", fill: "white", strokeWidth: 1 }),
});

const labelCommons = { textAnchor: 'middle' };

const mkLabelStyle = (label: ProtoLabel<'enum' | 'tick'>) => matchString(label.kind, {
    'enum': () => ({ ...labelCommons, fill: "#808080" }),
    'tick': () => ({ ...labelCommons }),
});

const selectColor = (i: number) => pkColors[i === 0 ? 0 : (i - 1) % (pkColors.length - 1) + 1]; // assumes ego has idx 0

const pkColors = [
    '#808080', // PK dark gray
    '#e31a1c', // PK dark red
    '#1f78b4', // PK dark blue
    '#33a02c', // PK dark green
    '#ff7f00', // PK dark orange
    '#6a3d9a', // PK dark purple
    '#ffff33', // PK dark yellow
    '#a65628', // PK dark brown
    '#f781bf', // PK dark pink
    '#1b9e77', // PK dark cyan
]
