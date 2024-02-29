import React, { useState } from "react";
import "./Playground.css";
import { Author, Publication } from "../model/Metadata";
import { Storyline } from "../model/Storyline";
import { cls, expectIntOrFail, toCharBase } from "../model/Util";

export const Playground = (props: {
    data: PlaygroundData
    setData: (data: PlaygroundData) => void,
    rebuildData: () => PlaygroundData,
}) => {
    const [text, setText] = useState(renderData(props.data));
    const [state, setState] = useState<ComponentState>('dirty');

    const handleTextChange = (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(ev.target.value);
        setState('dirty');
    }

    const handleSubmit = () => {
        const parsed = parseData(text);
        if (parsed.kind === 'data') {
            props.setData(parsed.data);
            setState('submitted');
        } else {
            setState({ errorMsg: parsed.msg });
        }
    }

    const handleRevert = () => {
        const data = props.rebuildData();
        props.setData(data);
        setText(renderData(data));
        setState('submitted');
    }

    return <div className="playground-main-container">
        <div className="playground-main-header">Playground</div>
        <textarea className="playground-main-area" rows={5} value={text} onChange={handleTextChange} />
        <button className="playground-revert-btn" disabled={state === 'submitted'} onClick={handleRevert}>revert</button>
        <button className="playground-submit-btn" disabled={state === 'submitted'} onClick={handleSubmit}>submit</button>
        <span {...cls('playground-error-span', { 'playground-error-present': isError(state) })}>{getErrorMsg(state)}</span>
    </div>;
}

type ComponentState = { errorMsg: string } | 'dirty' | 'submitted';

const isError = (state: ComponentState) => state !== 'dirty' && state !== 'submitted';

const getErrorMsg = (state: ComponentState, orElse: string = '') =>
    state === 'dirty' || state === 'submitted' ? orElse : state.errorMsg;

export interface PlaygroundData {
    meetings: number[][],
}

export const fromStoryline = (s: Storyline): PlaygroundData => ({ meetings: s.meetings });

export const fakePublications = (data: PlaygroundData) => {
    const max = Math.max(0, ...data.meetings.flat());
    const authors = Array.from({ length: max + 1 }, (_, i): Author => ({ id: `fake${i}`, name: toCharBase(i) }));
    return data.meetings.map((indices, j): Publication => ({
        title: `fake publication ${j}`,
        authors: indices.map(i => authors[i]!),
        informal: false,
        metadata: { kind: 'incomplete', desc: "fake", link: undefined, pages: undefined },
        url: new URL('http://example.org'),
        year: 1984,
    }));
}

export const fakeMainAuthor: Author = { id: 'fake0', name: 'A' };

const renderData = (data: PlaygroundData) => JSON.stringify(data, undefined, 2)
    .replaceAll(/\[\n((\s+\d+,?\n)+)\s+\]/g, match => match.replaceAll(/[\s\n]+/g, " "));

const parseData = (raw: string): { kind: 'err', msg: string } | { kind: 'data', data: PlaygroundData } => {
    try {
        const json = JSON.parse(raw);
        const meetings: number[][] = [];

        json['meetings'].forEach((maybeArray: any) => {
            const meeting: number[] = [];
            maybeArray.forEach((maybeNumber: any) => {
                const i = expectIntOrFail(maybeNumber);
                if (i < 0) { throw new Error(`meeting ids must not be negative`); }
                meeting.push(i);
            });
            meetings.push(meeting);
        })

        return { kind: 'data', data: { meetings } };
    } catch (e) {
        return { kind: 'err', msg: e instanceof Error ? `${e.name}: ${e.message}` : `${e}` };
    }
}
