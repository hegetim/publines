import React, { useCallback, useRef, useState } from "react"
import _ from "lodash"
import { Author, Publication, filterInformal } from "../model/Metadata"
import { DrawingConfig, DrawingResult, drawSections } from "../model/StorylineDrawings"
import { mkSections } from "../model/Sections"
import { SBCMRealization, mkStoryline } from "../model/Storyline"
import { oneSidedScm } from "../model/OneSided"
import { StorylineSvg, SelfRef as MainSVGRef } from "./StorylineSvg"
import { StorylineYTickLabels } from "./StorylineYTickLabels"
import "./Storyline.css"

export const StorylineComponent = (props: {
    drawingConfig: DrawingConfig
    publications: Publication[],
    protagonist: Author,
}) => {
    const filtered = filterInformal(props.publications, 'repeated');
    const [story, authors] = mkStoryline(filtered, props.protagonist, 10);
    const realization = oneSidedScm(story); // todo make configurable
    const meetingTickLabels = filtered.map(p => p.year.toString());
    const authorNames = story.authorIds.map(id => authors.get(id)!.name);

    const sections = mkSections(story, realization, meetingTickLabels)!;
    const drawn = drawSections(props.drawingConfig, sections, realization.initialPermutation);

    return <div className="story-main-container">
        <InnerComponent authorNames={authorNames} drawingConfig={props.drawingConfig} drawn={drawn}
            meetingTitles={filtered.map(p => p.title)} realization={realization} />
    </div>
}

/// separate so that we do not recalculate the whole storyline on each scroll...
const InnerComponent = (props: {
    realization: SBCMRealization,
    drawingConfig: DrawingConfig,
    authorNames: string[],
    drawn: DrawingResult,
    meetingTitles: string[],
}) => {
    const mainRef = useRef<MainSVGRef | null>(null);
    const [scrollPos, setScrollPos] = useState(0);

    const pathYPos = useCallback((i: number, rsp: number) =>
        mainRef.current?.getPathPos(i, rsp)?.y ??
        (props.realization.initialPermutation.indexOf(i) * props.drawingConfig.lineDist),
        [mainRef, props.drawingConfig],
    );
    const debouncedScroll = useCallback(_.debounce(setScrollPos, 250), [setScrollPos]);
    const handleScroll = useCallback((ev: React.UIEvent<HTMLDivElement>) =>
        debouncedScroll(ev.currentTarget.scrollLeft / ev.currentTarget.scrollWidth), [debouncedScroll]);

    return <React.Fragment>
        <StorylineYTickLabels labels={props.authorNames} mainBBox={props.drawn.bbox} colors={selectColor}
            relativeScrollPos={scrollPos} pathYPos={pathYPos} />
        <div className="story-svg-container" onScroll={handleScroll}>
            <StorylineSvg ref={el => mainRef.current = el} config={props.drawingConfig} drawn={props.drawn}
                authorNames={props.authorNames} meetingTitles={props.meetingTitles} />
        </div>
    </React.Fragment>
}

export const selectColor = (i: number) => pkColors[i === 0 ? 0 : (i - 1) % (pkColors.length - 1) + 1]!; // assumes ego has idx 0

const pkColors = [
    '#808080', // PK dark gray
    '#e31a1c', // PK dark red
    '#1f78b4', // PK dark blue
    '#33a02c', // PK dark green
    '#ff7f00', // PK dark orange
    '#6a3d9a', // PK dark purple
    // '#ffff33', // PK dark yellow
    '#b2df8a', // PK light green
    '#a65628', // PK dark brown
    '#f781bf', // PK dark pink
    '#1b9e77', // PK dark cyan
    '#a6cee3', // PK light blue
]

/*  light colors:
PK light red    #fb9a99
PK light blue   #a6cee3
PK light green  #b2df8a
PK light orange #fdbf6f
PK light purple #cab2d6
PK light yellow #ffffcc
PK light brown  #e5d8bd
PK light pink   #fddaec
PK light cyan   #8dd3c7
PK light gray   #cccccc
*/
