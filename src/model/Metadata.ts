import _ from "lodash";
import { matchString, TupleToUnion } from "./Util";

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

