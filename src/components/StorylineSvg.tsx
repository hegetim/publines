import React from "react"
import { DrawingConfig, MeetingStyle, bcWidth, defaultConfig, drawSLine, drawSections, mkBcMetrics, mkSections } from "./StorylineUtils"
import { Storyline, SBCMRealization } from "../model/Storyline";
import { matchString } from "../model/Util";

export const StorylineSvg = (props: Props) => {
    const sections = mkSections(props.story, props.realization)!;
    const { paths, meetings, width, height } = drawSections(props.config, sections, props.realization.initialPermutation);
    const pathCommons = { fill: "none", strokeWidth: 1.5 };
    const meeetingCommons = mkMeetingStyle(props.config.meetingStyle);
    return <svg className="story-main-svg" viewBox={`-10 -10 ${width + 20} ${height + 20}`}>
        <g>
            {...paths.map((cmds, i) => <path key={i} {...pathCommons} stroke={selectColor(i)} d={cmds} />)}
        </g>
        <g>
            {...meetings.map((cmds, i) => <path key={i} {...meeetingCommons} d={cmds} />)}
        </g>
    </svg>
}

const mkMeetingStyle = (style: MeetingStyle) => matchString(style, {
    'Bar': () => ({ stroke: "none", fill: "black" }),
    'Metro': () => ({ stroke: "black", fill: "white", strokeWidth: 1 }),
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

interface Props {
    config: DrawingConfig,
    story: Storyline,
    realization: SBCMRealization,
}
