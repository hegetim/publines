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
    published: string,
    year: number,
    url: URL,
    informal: boolean,
}

export const excludeInformalOpts = ['none', 'all', 'repeated'] as const;
export type ExcludeInformal = TupleToUnion<typeof excludeInformalOpts>;

export const filterInformal = (publ: Publication[], conf: ExcludeInformal) => matchString(conf, {
    'none': () => publ,
    'all': () => publ.filter(p => !p.informal),
    'repeated': () => {
        const formalTitles = new Set(publ.filter(p => !p.informal).map(p => p.title));
        return publ.filter(p => !p.informal || !formalTitles.has(p.title));
    }
});

