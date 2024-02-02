import _ from "lodash";
import { Author, Publication } from "./Metadata";
import { windows2 } from "./util";

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

const compareAttendance = (story: Storyline) => (a: number, b: number) => {
    for (const m of story.meetings) {
        const [hasA, hasB] = [m.includes(a), m.includes(b)];
        if (hasA && !hasB) {
            return -1;
        } else if (hasB && !hasA) {
            return 1;
        }
    }
    return Number(story.authorIds[a]! < story.authorIds[b]!);
}

const inverted = (xs: number[]) => {
    let res = new Array<number>(xs.length);
    xs.forEach((x, i) => res[x] = i);
    return res;
}

const cross = (perm: number[], iPerm: number[], crossAt: number) => {
    const atX = perm[crossAt]!;
    const afterX = perm[crossAt + 1]!;
    perm[crossAt] = afterX;
    perm[crossAt + 1] = atX;
    iPerm[atX] += 1;
    iPerm[afterX] -= 1;
}

export const oneSidedScm = (story: Storyline): SBCMRealization => {
    const initialPermutation = _.range(0, story.authorIds.length).sort(compareAttendance(story));
    // console.log({ initialPermutation });
    let perm = [...initialPermutation];
    const blockCrossings: BlockCrossings = [];
    for (const [m1, m2] of windows2(story.meetings)) {
        // console.log({ m1, m2, supported: supportsMeeting(perm, m2) });
        if (supportsMeeting(perm, m2)) { continue; }
        const s1 = _.intersection(m1, m2);
        const s2 = _.difference(m1, m2);
        const s3 = _.difference(m2, m1);
        const s4 = _.difference(_.range(0, story.authorIds.length), _.union(m1, m2));
        const iPerm = inverted(perm);
        for (const c of _.sortBy(s1, [i => iPerm[i]!])) {
            let i = iPerm[c]!;
            while (i > 0 && s2.includes(perm[i - 1]!)) {
                cross(perm, iPerm, i - 1);
                blockCrossings.push([i - 1, i - 1, i]);
                // console.log(`crossing ${i - 1} and ${i}`);
                i -= 1;
            }
        }
        for (const c of _.sortBy(s3, [i => iPerm[i]!])) {
            let i = iPerm[c]!;
            while (i > 0 && s4.includes(perm[i - 1]!)) {
                cross(perm, iPerm, i - 1);
                blockCrossings.push([i - 1, i - 1, i]);
                // console.log(`crossing ${i - 1} and ${i}`);
                i -= 1;
            }
        }
        if (s2.length > 0 && s3.length > 0) {
            const finalBc: [number, number, number] = [s1.length, m1.length - 1, m2.length + s2.length - 1];
            blockCrossings.push(finalBc);
            perm = applyBc(perm, ...finalBc);
            // console.log(`block crossing ${finalBc}`);
        }
    }
    return { initialPermutation, blockCrossings };
}
