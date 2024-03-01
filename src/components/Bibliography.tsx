import React, { useState } from "react";
import './Bibliography.css';
import { assertExhaustive, cls, hash, intersperse, matchString } from "../model/Util";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { Author, BibMeta, Publication } from "../model/Metadata";
import { StyleConfig } from "../model/UserConfig";

export const Bibliography = (props: {
    enumStyle: StyleConfig['enumerationStyle'],
    publications: Publication[],
    setMainAuthor: (author: Author) => void,
}) => {
    const [isCollapsed, setCollapsed] = useState(true);

    const renderPublication = (p: Publication, i: number) => {
        const authorNames = p.authors.map(a =>
            <span key={hash(a)} {...cls("bib-author-name", "click-me")} onClick={() => props.setMainAuthor(a)}>{a.name}</span>
        );
        const authors = intersperse(authorNames, (_, i) =>
            <span key={`sep${i}`} className="bib-author-sep">{i === authorNames.length - 2 ? " and " : ", "}</span>
        );
        const titleClass = p.metadata.kind === 'phdthesis' || p.metadata.kind === 'masterthesis' || p.metadata.kind === 'incomplete'
            ? "bib-entry-booktitle" : "bib-entry-title";
        const title = [
            <span key="pre-title" className="bib-entry-sep">. </span>,
            <a key="title" className={titleClass} href={mkHref(p)}>{p.title}</a>,
        ];
        const ref = p.metadata.kind === 'article' ? [
            <span key="journal" className="bib-entry-booktitle">{` ${p.metadata.journal}, `}</span>,
            <span key="volume" className="bib-entry-coords">{renderJournalCoords(p.metadata)}</span>,
        ] : p.metadata.kind === 'incollection' || p.metadata.kind === 'inproceedings' ? [
            <span key="prefix" className="bib-entry-sep"> In </span>,
            <span key="book" className="bib-entry-booktitle">{p.metadata.booktitle}</span>,
            <span key="pages" className="bib-entry-coords">{renderProceedingPages(p.metadata)}</span>,
        ] : p.metadata.kind === 'phdthesis' || p.metadata.kind === 'masterthesis' ? [
            <span key="school" className="bib-entry-coords"> {p.metadata.school}</span>,
            <span key="period" className="bib-entry-sep">. </span>,
        ] : p.metadata.kind === 'incomplete' ? [
            <span key="ellipsis" className="bib-entry-missing"> ???</span>,
            <span key="pages" className="bib-entry-coords">{renderProceedingPages(p.metadata)}</span>,
        ] : assertExhaustive(p.metadata.kind);
        const year = <span key="year" className="bib-entry-year">{p.year}.</span>
        return <React.Fragment key={hash(p)}>
            <div className="bib-entry-number">{mkEnumeratedLabel(props.enumStyle, i + 1)}</div>
            <div className="bib-entry-par">{[...authors, ...title, ...ref, year]}</div>
        </React.Fragment>;
    };

    return <div className="bib-outer-container">
        <div {...cls('bib-header-container', 'click-me')} onClick={() => setCollapsed(s => !s)}>
            <FontAwesomeIcon className="bib-collapse-icon" fixedWidth icon={isCollapsed ? faChevronRight : faChevronDown} />
            <span className="bib-main-header">Publications</span>
        </div>
        <div {...cls('bib-inner-container', { 'bib-collapsed': isCollapsed })}>
            {props.publications.flatMap(renderPublication)}
        </div>
    </div>
}

const renderJournalCoords = (m: BibMeta & { kind: 'article' }) => {
    const maybeNumber = m.number ? `(${m.number})` : '';
    const maybePages = m.pages ? typeof m.pages === 'string' ? `:${m.pages}` : `:${m.pages.from}–${m.pages.to}` : '';
    return `${m.volume}${maybeNumber}${maybePages}, `;
}

const renderProceedingPages = (m: BibMeta) =>
    m.pages ? typeof m.pages === 'string' ? `, ${m.pages}. ` : `, pages ${m.pages.from}–${m.pages.to}. ` : '. ';

const mkHref = (p: Publication) => p.metadata.link ? p.metadata.link.toString() : p.url.toString();

const mkEnumeratedLabel = (style: StyleConfig['enumerationStyle'], i: number) => matchString(style ?? 'x.', {
    'x': () => i.toString(),
    'x.': () => `${i}.`,
    '[x]': () => `[${i}]`,
});
