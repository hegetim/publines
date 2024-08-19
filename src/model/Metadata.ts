/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash";
import { chain, matchString, TupleToUnion } from "./Util";
import { Codec, productCodec, stringCodec } from "./StringCoded";

export interface Author {
    name: string,
    id: string,
}

export interface AuthorSearchHit {
    author: Author,
    description: string,
}

export interface Publication {
    title: string,
    authors: Author[],
    metadata: BibMeta,
    year: number,
    url: URL,
    informal: boolean,
}

type MayHasPages = { pages: { from: string, to: string } | string | undefined };
type MayHasLink = { link: URL | undefined };

export type BibMeta = ({
    kind: 'article',
    journal: string,
    volume: string,
    number: number | undefined,
} | {
    kind: 'inproceedings' | 'incollection',
    booktitle: string,
} | {
    kind: 'phdthesis' | 'masterthesis',
    school: string,
} | {
    kind: 'incomplete',
    desc: string,
}) & MayHasLink & MayHasPages;

export const excludeInformalOpts = ['none', 'all', 'repeated'] as const;
export type ExcludeInformal = TupleToUnion<typeof excludeInformalOpts>;

export const filterInformal = (publ: Publication[], conf: ExcludeInformal): Publication[] => matchString(conf, {
    'none': () => publ,
    'all': () => publ.filter(p => !p.informal),
    'repeated': () => {
        const formalTitles = new Set(publ.filter(p => !p.informal).map(p => p.title.toLowerCase()));
        return publ.filter(p => !p.informal || !formalTitles.has(p.title.toLowerCase()));
    }
});

export type YearFilter = false | { fromIncl: number, toIncl: number };

export const filterByYear = (publ: Publication[], filter: YearFilter): Publication[] => {
    if (filter === false) { return publ; }
    else { return publ.filter(p => p.year >= filter.fromIncl && p.year <= filter.toIncl); }
}

export const mkFilter = (informal: ExcludeInformal, year: YearFilter): (ps: Publication[]) => Publication[] =>
    chain((ps: Publication[]) => filterInformal(ps, informal)).then(ps => filterByYear(ps, year)).run;

const authorCodec: Codec<Author> = productCodec({ id: stringCodec(), name: stringCodec() });

export const saveAuthor = (author: Author) => authorCodec.enc(author)
export const loadAuthor = (s: string) => authorCodec.dec(s)[0]
