import _ from "lodash";
import { matchString } from "./Util";

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

export type FilterInformal = 'none' | 'all' | 'repeated';

export const filterInformal = (publ: Publication[], conf: FilterInformal) => matchString(conf, {
    'none': () => publ,
    'all': () => publ.filter(p => !p.informal),
    'repeated': () => {
        const formalTitles = new Set(publ.filter(p => !p.informal).map(p => p.title));
        return publ.filter(p => !p.informal || !formalTitles.has(p.title));
    }
});

