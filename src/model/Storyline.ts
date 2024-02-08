import _ from "lodash";
import { Author, Publication } from "./Metadata";

export interface Storyline {
    authorIds: string[],
    meetings: number[][],
}

export const mkStoryline = (publications: Publication[]): Storyline => {
    let authors: Map<string, Author> = new Map();
    for (const publ of publications) {
        for (const contributor of publ.authors) {
            if (!authors.has(contributor.id)) {
                authors.set(contributor.id, contributor);
            }
        }
    }
    const orderedAuthors = [...authors.keys()];
    let meetings: number[][] = [];
    for (const publ of publications) {
        const meeting = publ.authors.map(contributor => orderedAuthors.indexOf(contributor.id));
        meetings.push(meeting.toSorted((a, b) => b - a));
    }
    return { authorIds: orderedAuthors, meetings };
}

export type BlockCrossings = [number, number, number][];

export interface SBCMRealization {
    initialPermutation: number[],
    blockCrossings: BlockCrossings,
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
