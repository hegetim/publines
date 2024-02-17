import React, { useCallback, useEffect, useRef, useState } from "react"
import _ from "lodash"
import "./Storyline.css"
import { Author, Publication, filterInformal } from "../model/Metadata"
import { DrawingConfig, DrawingResult, drawSections } from "../model/StorylineDrawings"
import { mkSections } from "../model/Sections"
import { SBCMRealization, mkStoryline } from "../model/Storyline"
import { oneSidedScm } from "../model/OneSided"
import { twoSidedScm } from "../model/TwoSided"
import { StorylineSvg, SelfRef as MainSVGRef } from "./StorylineSvg"
import { StorylineYTickLabels } from "./StorylineYTickLabels"
import { UserConfig, mkDrawingConfig } from "../model/UserConfig"
import { matchByKind } from "../model/Util"

export const StorylineComponent = (props: {
    config: UserConfig,
    publications: Publication[],
    protagonist: Author,
}) => {
    const filtered = filterInformal(props.publications, props.config.data.filterInformal);
    const [story, authors] = mkStoryline(filtered, props.protagonist, props.config.data.coauthorCap);
    const realization: SBCMRealization = matchByKind(props.config.algo, {
        '1scm': () => oneSidedScm(story),
        '2scm': () => twoSidedScm(story),
    });
    const authorNames = story.authorIds.map(id => authors.get(id)!.name);
    const drawingConfig = mkDrawingConfig(props.config.style)

    const sections = mkSections(story, realization, filtered)!;
    const drawn = drawSections(drawingConfig, sections, realization.initialPermutation);

    return <div className="story-main-container">
        <InnerComponent authorNames={authorNames} drawingConfig={drawingConfig} drawn={drawn}
            meetingMeta={filtered.map(p => ({ title: p.title, informal: p.informal }))} realization={realization} />
    </div>
}

/// separate so that we do not recalculate the whole storyline on each scroll...
const InnerComponent = (props: {
    realization: SBCMRealization,
    drawingConfig: DrawingConfig,
    authorNames: string[],
    drawn: DrawingResult,
    meetingMeta: { title: string, informal: boolean }[],
}) => {
    const mainRef = useRef<MainSVGRef | null>(null);
    const [scrollPos, setScrollPos] = useState(0);

    const pathYPos = useCallback((i: number, rsp: number) => {
        return mainRef.current?.getPathPos(i, rsp)?.y ??
            (props.realization.initialPermutation.indexOf(i) * props.drawingConfig.lineDist);
        /// fixme:
        /// When the protagonist changes, the main svg is still there and propates the old author order.
        /// Instead, we should use the realization's initial author order
    }, [mainRef, props.drawingConfig.lineDist, props.realization.initialPermutation]);
    const debouncedScroll = useCallback(_.debounce(setScrollPos, 250), [setScrollPos]);
    const handleScroll = useCallback((ev: React.UIEvent<HTMLDivElement>) =>
        debouncedScroll(ev.currentTarget.scrollLeft / ev.currentTarget.scrollWidth), [debouncedScroll]);

    return <React.Fragment>
        <StorylineYTickLabels labels={props.authorNames} mainBBox={props.drawn.bbox} colors={selectColor}
            relativeScrollPos={scrollPos} pathYPos={pathYPos} />
        <div className="story-svg-container" onScroll={handleScroll}>
            <StorylineSvg ref={el => mainRef.current = el} config={props.drawingConfig} drawn={props.drawn}
                authorNames={props.authorNames} meetingMeta={props.meetingMeta} />
        </div>
    </React.Fragment>
}

/// assumes ego has idx 0
export const selectColor = (i: number) => pkColors[i === 0 ? 0 : (i - 1) % (pkColors.length - 1) + 1]!;

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
