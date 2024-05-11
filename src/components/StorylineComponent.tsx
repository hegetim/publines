import React, { useCallback, useState } from "react"
import _ from "lodash"
import "./Storyline.css"
import { Author, Publication } from "../model/Metadata"
import { DrawingConfig, DrawingResult, drawSections } from "../model/StorylineDrawings"
import { mkSections } from "../model/Sections"
import { Realization, Storyline } from "../model/Storyline"
import { oneSidedScm } from "../model/OneSided"
import { twoSidedScm } from "../model/TwoSided"
import { StorylineSvg } from "./StorylineSvg"
import { StorylineYTickLabels } from "./StorylineYTickLabels"
import { MetricsComponent } from "./MetricsComponent"
import { AlgoConfig, UserConfig, mkDrawingConfig } from "../model/UserConfig"
import { chain, matchString } from "../model/Util"
import { greedySbcm } from "../model/GreedySbcm"
import { mkBundles, unbundle } from "../model/CrossingComplex"
import { biSbcm } from "../model/BiSbcm"

export const StorylineComponent = (props: {
    config: UserConfig,
    publications: Publication[],
    protagonist: Author,
    story: Storyline,
    authors: Map<string, Author>,
}) => {
    try {
        const realization = mkPipeline(props.config.algo, props.story).run(props.story);
        const authorNames = props.story.authorIds.map(id => props.authors.get(id)!.name);
        const drawingConfig = mkDrawingConfig(props.config.style)

        const sections = mkSections(props.story, realization, props.publications)!;
        const drawn = drawSections(drawingConfig, sections, realization.initialPermutation);

        console.log('rendered storyline component (this draws a storyline)')

        return <React.Fragment>
            <div className="story-main-container">
                <InnerComponent authorNames={authorNames} drawingConfig={drawingConfig} drawn={drawn}
                    meetingMeta={props.publications.map(p => ({ title: p.title, informal: p.informal }))}
                    realization={realization} />
            </div>
            <MetricsComponent story={props.story} real={realization} />
        </React.Fragment>
    } catch (err) {
        console.error(err);
        return <span className='story-main-error'>Could not draw storyline</span>;
    }
}

/// separate so that we do not recalculate the whole storyline on each scroll...
const InnerComponent = (props: {
    realization: Realization,
    drawingConfig: DrawingConfig,
    authorNames: string[],
    drawn: DrawingResult,
    meetingMeta: { title: string, informal: boolean }[],
}) => {
    const [scrollPos, setScrollPos] = useState(0);

    const pathYPos = useCallback((i: number, rsp: number) => {
        const x = rsp * props.drawn.bbox.width;
        return props.drawn.yLabelPositions[i]!.findLast(pos => pos.fromX <= x)!.y;
    }, [props.drawn]);

    const debouncedScroll = useCallback(_.debounce(setScrollPos, 250), [setScrollPos]);
    const handleScroll = useCallback((ev: React.UIEvent<HTMLDivElement>) =>
        debouncedScroll(ev.currentTarget.scrollLeft / ev.currentTarget.scrollWidth), [debouncedScroll]);

    return <React.Fragment>
        <div className="story-labels-container">
            <StorylineYTickLabels labels={props.authorNames} mainBBox={props.drawn.bbox} colors={selectColor}
                relativeScrollPos={scrollPos} pathYPos={pathYPos} />
        </div>
        <div className="story-svg-container" onScroll={handleScroll}>
            <StorylineSvg config={props.drawingConfig} drawn={props.drawn} authorNames={props.authorNames}
                meetingMeta={props.meetingMeta} />
        </div>
    </React.Fragment>
}

const mkPipeline = (config: AlgoConfig, story: Storyline) =>
    chain(mkRealization(config)).then(mkBundling(config, story));

const mkRealization = (config: AlgoConfig) => (story: Storyline) => matchString(config.realization, {
    '1scm': () => oneSidedScm(story),
    '2scm': () => twoSidedScm(story),
    'sbcm': () => greedySbcm(story, Math.max(6, story.authorIds.length / 2)),
    'bi-sbcm': () => biSbcm(story),
});

const mkBundling = (config: AlgoConfig, story: Storyline) => (real: Realization) => matchString(config.bundling, {
    ignore: () => real,
    bundle: () => mkBundles(story, real),
    unbundle: () => unbundle(real),
});

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
