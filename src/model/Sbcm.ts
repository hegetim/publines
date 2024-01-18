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
