import _ from "lodash";
import { Author, Publication } from "./Metadata";

export interface Storyline {
    authorIds: string[],
    meetings: number[][],
}

export const mkStoryline = (
    publications: Publication[],
    protagonist: Author,
    limit: number | false,
): [Storyline, Map<string, Author>] => {
    let authors: Map<string, [Author, number]> = new Map();
    publications.flatMap(p => p.authors).forEach(contributor => {
        const tmp = authors.get(contributor.id);
        if (tmp) { authors.set(contributor.id, [tmp[0], tmp[1] + 1]); }
        else { authors.set(contributor.id, [contributor, 1]); }
    });
    authors.delete(protagonist.id);
    const orderedAuthors = [protagonist.id, ...(mostFrequentKeys(authors, limit || -1))];
    let meetings: number[][] = [];
    for (const publ of publications) {
        const meeting = publ.authors
            .map(contributor => orderedAuthors.indexOf(contributor.id))
            .filter(idx => idx >= 0);
        if (meeting.length > 0) { meetings.push(_.sortBy(meeting)); }
    }
    const allAuthors = new Map([...authors].map(([id, [author, _1]]) => [id, author]));
    allAuthors.set(protagonist.id, protagonist);
    return [{ authorIds: orderedAuthors, meetings }, allAuthors];
}

const mostFrequentKeys = <K, T>(map: Map<K, [T, number]>, limit: number) => {
    if (limit < 0) { return [...map.keys()]; }
    else { return _.sortBy([...map], ([_0, [_1, n]]) => -n).slice(0, limit).map(t => t[0]); }
}

export type BlockCrossings = [number, number, number][];

export interface SBCMRealization {
    initialPermutation: number[],
    blockCrossings: BlockCrossings[],
}

export const applyBc = (perm: number[], a: number, b: number, c: number) =>
    [...(a > 0 ? perm.slice(0, a) : []), ...perm.slice(b + 1, c + 1), ...perm.slice(a, b + 1), ...perm.slice(c + 1)];

export const supportsMeeting = (perm: number[], meeting: number[]) => {
    const i = perm.findIndex(j => meeting.includes(j));
    const j = meeting.length;
    if (i >= 0 && i + j <= perm.length && perm.slice(i, i + j).every(k => meeting.includes(k))) {
        return { from: i, to: i + j - 1 };
    } else {
        return false;
    }
}
