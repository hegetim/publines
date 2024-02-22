import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import _ from "lodash";
import { DrawingConfig, DrawingResult, ProtoLabel, bbox2viewBox } from "../model/StorylineDrawings"
import { matchByKind, matchString } from "../model/Util";
import { selectColor } from "./StorylineComponent";

export const StorylineSvg = forwardRef<SelfRef, Props>((props: Props, selfRef) => {
    const pathCommons = { fill: "none", strokeWidth: props.config.authorLineStrokeWidth };
    const bbox = props.drawn.bbox;

    const pathRefs = useRef<(SVGPathElement | null)[]>([]);
    useEffect(() => {
        pathRefs.current = pathRefs.current.slice(0, props.drawn.paths.length);
    }, [props.drawn.paths]);

    useImperativeHandle(selfRef, () => ({
        getPathPos: (i: number, relPos: number) => {
            const path = pathRefs.current[i];
            return path?.getPointAtLength(relPos * path?.getTotalLength());
        }
    }), [pathRefs]);

    return <svg className="story-main-svg" {...bbox2viewBox(bbox)}>
        <g>
            {..._.zip(props.drawn.paths, props.authorNames).map(([cmds, name], i) =>
                <path key={i} ref={el => pathRefs.current[i] = el} {...pathCommons} stroke={selectColor(i)} d={cmds}>
                    <title>{name}</title>
                </path>)}
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

export interface SelfRef {
    getPathPos: (i: number, relPos: number) => DOMPoint | undefined,
}

interface Props {
    config: DrawingConfig,
    drawn: DrawingResult,
    meetingMeta: { title: string, informal: boolean }[],
    authorNames: string[],
}
