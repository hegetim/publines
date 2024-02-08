import React from "react"
import { Author, Publication } from "../model/Metadata"
import { mkStoryline } from "../model/Storyline"
import { oneSidedScm } from "../model/OneSided"
import { StorylineSvg } from "./StorylineSvg"
import { DrawingConfig } from "./StorylineUtils"

export const StorylineComponent = (props: {
    drawingConfig: DrawingConfig
    publications: Publication[],
    protagonist: Author,
}) => {
    const story = mkStoryline(props.publications);
    const realization = oneSidedScm(story); // todo make configurable
    return <StorylineSvg config={props.drawingConfig} realization={realization} story={story} />
}
