/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash";
import { BlockCrossings, Realization, Storyline } from "./Storyline";
import { oneSidedScm } from "./OneSided";

const lightestEdge = (m: number[][]): [number, number, number] => {
    let [min, minCol, minRow] = [Infinity, -1, -1];
    m.forEach((row, i) => {
        row.forEach((edge, j) => {
            if (min > edge) { min = edge; minRow = i; minCol = j; }
        });
    });
    return [min, minCol, minRow];
}

const contract = (m: number[][], n: number, a: number, b: number) => {
    _.range(0, a).forEach(i => m[a]![i] += m[b]![i]!);
    _.range(a + 1, b).forEach(i => { if (m[i]![a]) { m[i]![a] += m[b]![i]!; } });
    _.range(b + 1, n).forEach(i => {
        if (m[i]![a] !== undefined) {
            m[i]![a] += m[i]![b]!;
            m[i]![b] = Infinity;
        }
    });
    m[b] = [];
}

const maxCutGreedyEC = (m: number[][], n: number): [number, number[], number[]] => {
    // console.log(m.map(r => r.join(",")).join('\n'));
    const l = _.range(0, n).map(i => [i]);
    for (let _0 of _.range(0, n - 2)) {
        const [_1, a, b] = lightestEdge(m); // a < b!
        contract(m, n, a, b);
        l[a] = [...l[a]!, ...l[b]!];
        l[b] = [];
        // console.log(`contracted ${b} into ${a} size ${n}`);
        // console.log(m.map(r => r.join(",")).join('\n'));
    }
    const [w, a, b] = lightestEdge(m);
    return [w, l[a]!, l[b]!];
}

const countCrossings = (a: boolean[], b: boolean[], n: number) => {
    let res = 0;
    let rem: 0 | 1 | 2 = 0; // 0 = 'nothing', 1 = 'a but not b', 2 = 'b but not a'
    _.range(0, n).forEach(i => {
        if (a[i] && !b[i]) {
            if (rem === 2) {
                res += 1;
                rem = 0;
            } else {
                rem = 1;
            }
        } else if (!a[i] && b[i]) {
            if (rem === 1) {
                res += 1;
                rem = 0;
            } else {
                rem = 2;
            }
        }
    })
    return res;
}

const mkCrossingMatrix = (story: Storyline) => {
    const n = story.authorIds.length;
    const att: boolean[][] = Array.from({ length: n }, _ => []);
    story.meetings.forEach((m, i) => m.forEach(j => att[j]![i] = true));
    // console.log(att.map(r => r.join(",")).join('\n'));
    const m: number[][] = Array.from({ length: n }, _ => []);
    for (let i of _.range(0, n)) {
        for (let j of _.range(0, i)) {
            m[i]![j] = countCrossings(att[i]!, att[j]!, story.meetings.length);
        }
    }
    // console.log({ note: 'the crossing matrix', story, n, m, att })
    return m.map(row => [...row]);
}

const splitStory = (story: Storyline, top: number[], bottom: number[]): [Storyline, number, Storyline, number] => {
    _.pull(top, 0); _.pull(bottom, 0);
    const topStory: Storyline = { ...story, meetings: story.meetings.map(m => _.without(m, ...bottom)) };
    const bottomStory: Storyline = { ...story, meetings: story.meetings.map(m => _.without(m, ...top)) };
    return [topStory, top.length + 1, bottomStory, bottom.length + 1];
}

const mergeRealizations = (top: Realization, bottom: Realization): Realization => {
    const flippedTop = flipRealization(top);
    const topSize = top.initialPermutation.length;
    // console.log({ note: 'merging sbcm realizations', flippedTop, bottom })
    return {
        initialPermutation: [...flippedTop.initialPermutation, 0, ...bottom.initialPermutation],
        blockCrossings: _.zip(flippedTop.blockCrossings, bottom.blockCrossings)
            .map(([top, bot]) => _.concat(top!, moveBlockCrossings(bot!, topSize))),
    };
}

const flipRealization = (real: Realization): Realization => {
    const n = real.initialPermutation.length;
    return {
        initialPermutation: real.initialPermutation.toReversed(),
        blockCrossings: real.blockCrossings.map(bcs => bcs.map(([a, b, c]) => [n - c, n - b - 1, n - a])),
    };
}

const moveBlockCrossings = (bcs: BlockCrossings, by: number): BlockCrossings =>
    bcs.map(([a, b, c]) => [a + by, b + by, c + by]);

export const twoSidedScm = (story: Storyline): Realization => {
    if (story.meetings.length < 2) { return oneSidedScm(story); } // trivial cases
    const [_0, topSet, bottomSet] = maxCutGreedyEC(mkCrossingMatrix(story), story.authorIds.length)
    // console.log({ note: 'the greedy cut', topSet, bottomSet })
    const [topStory, topSize, bottomStory, bottomSize] = splitStory(story, topSet, bottomSet);
    const [topReal, bottomReal] = [oneSidedScm(topStory), oneSidedScm(bottomStory)];
    _.pullAll(topReal.initialPermutation, [0, ...bottomSet]);
    _.pullAll(bottomReal.initialPermutation, [0, ...topSet]);
    return mergeRealizations(topReal, bottomReal);
}
