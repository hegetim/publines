import React from "react"
import { Author, Publication, filterInformal } from "../model/Metadata"
import { mkStoryline } from "../model/Storyline"
import { oneSidedScm } from "../model/OneSided"
import { StorylineSvg } from "./StorylineSvg"
import { DrawingConfig } from "./StorylineUtils"

export const StorylineComponent = (props: {
    drawingConfig: DrawingConfig
    publications: Publication[],
    protagonist: Author,
}) => {
    const filtered = filterInformal(props.publications, 'repeated');
    const [story, authors] = mkStoryline(filtered, props.protagonist, 10);
    const realization = oneSidedScm(story); // todo make configurable

    // (document.querySelector('#content') as HTMLDivElement).style.background = "red"; // works with csp...

    return <StorylineSvg config={props.drawingConfig} realization={realization} story={story}
        authorNames={story.authorIds.map(id => authors.get(id)!.name)}
        meetingTitles={filtered.map(p => p.title)}
        meetingTickLabels={filtered.map(p => p.year.toString())} />
}
