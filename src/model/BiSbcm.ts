import BitSet from 'bitset';
import _ from 'lodash';
import { windows2, shuffle } from './Util';
import { BlockCrossings, Realization, Storyline, applyBc } from './Storyline';
import { splitmix32 } from './Prng';

/*    =|
 *    =| not part of m (possbly empty)
 *  a  |
 *     | part of m (never empty)
 *  b =|
 *    =| not part of m (*)
 *  c  |
 *  d  | part of m (*)
 *    =|
 *     ⸽ ... more parts (possibly empty)
 * 
 * (*) empty iff perm[a:b] == m
 */
type Block = { a: number, b: number, c: number, d: number };

const PRNG_SEED = 0x42c0ffee;

export interface Attendance {
    readonly has: (author: number, meeting: number) => boolean,
    readonly score: (a: number, b: number, startAt: number) => number,
}

export const mkAttendance = (k: number, ms: number[][]): Attendance => {
    const n = ms.length;
    const buf = Array.from({ length: k }, () => new BitSet());
    ms.forEach((meeting, i) => meeting.forEach(a => buf[a]!.set(i, 1)));
    const has = (author: number, meeting: number) => buf[author]!.get(meeting) === 1;
    const score = (a: number, b: number, startAt: number) => {
        let i = startAt;
        while (i < n && buf[a]!.get(i) === buf[b]!.get(i)) { i += 1; }
        return i - startAt;
    }
    return { has, score };
}

export const biSbcm = (story: Storyline): Realization => {
    const randomPermutation = _.range(0, story.authorIds.length);
    shuffle(randomPermutation, splitmix32(PRNG_SEED));
    const [_0, initialPermutation] = realize(randomPermutation, story.meetings.toReversed());
    const [blockCrossings, _1] = realize(initialPermutation, story.meetings);
    return { initialPermutation, blockCrossings };
}

const nextBlock = (perm: number[], m: number, att: Attendance): Block => {
    const a = _.findIndex(perm, i => att.has(i, m));
    const b = _.findIndex(perm, i => !att.has(i, m), a + 1);
    if (b < 0) { return { a, b: perm.length, c: perm.length, d: perm.length }; }
    const c = _.findIndex(perm, i => att.has(i, m), b + 1);
    if (c < 0) { return { a, b, c: b, d: b }; }
    const d = _.findIndex(perm, i => !att.has(i, m), c + 1) - 1;
    if (d < 0) { return { a, b, c, d: perm.length - 1 }; }
    else return { a, b, c, d };
}

const fitsMeeting = (block: Block) => block.b === block.c;

const scorePerm = (perm: number[], start: number, end: number, m: number, att: Attendance): number => {
    let res = 0;
    for (const [a, b] of windows2(perm.slice(start, end + 1))) {
        res += att.score(a, b, m);
    }
    return res;
}

const bestBc = (perm: number[], block: Block, att: Attendance, m: number) => {
    const { a, b, c, d } = block;
    const [start, end] = [Math.max(a - 1, 0), Math.min(d + 1, perm.length - 1)];

    let bestScore = -Infinity;
    let bestBc: readonly [number, number, number] = [-1, -1, -1];
    let bestSize = Infinity;

    _.concat(
        _.range(c - 1, d + 1).map(x => [a, b - 1, x] as const),
        _.range(b, a - 1, -1).map(x => [x, c - 1, d] as const),
    ).forEach(bc => {
        const score = scorePerm(applyBc(perm, ...bc), start, end, m, att);
        const size = bc[2] - bc[0];
        if (score > bestScore || (score === bestScore && size < bestSize)) {
            bestScore = score; bestBc = bc; bestSize = size;
        }
    });

    return bestBc;
}

const realize = (start: number[], meetings: number[][]): [BlockCrossings[], number[]] => {
    const real: BlockCrossings[] = [];
    const att = mkAttendance(start.length, meetings);
    let perm = start;

    meetings.forEach((_0, i) => {
        const bcs: BlockCrossings = [];
        let block = nextBlock(perm, i, att);
        while (!fitsMeeting(block)) {
            const bc = bestBc(perm, block, att, i);
            perm = applyBc(perm, ...bc);
            bcs.push(bc);
            block = nextBlock(perm, i, att);
        }
        real.push(bcs);
    });

    return [real, perm];
}
