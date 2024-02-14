import _ from "lodash";
import { SBCMRealization, Storyline } from "./Storyline";

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
    _.range(0, a).forEach(i => { m[a]![i] += m[b]![i]!; });
    _.range(a + 1, b).forEach(i => { if (m[i]![a]) { m[i]![a] += m[b]![i]!; } });
    _.range(b + 1, n).forEach(i => {
        if (m[i]![a]) {
            m[i]![a] += m[i]![b]!;
            m[i]![b] = Infinity;
        }
    });
    m[b] = [];
}

const maxCutGreedyEC = (m: number[][], n: number): [number, number[], number[]] => {
    const l = _.range(0, n).map(i => [i]);
    for (let i of _.range(0, n - 2)) {
        const [_1, a, b] = lightestEdge(m); // a < b!
        contract(m, n, a, b);
        l[a] = [...l[a]!, ...l[b]!];
        l[b] = [];
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
    return rem;
}

const mkCrossingMatrix = (story: Storyline) => {
    const n = story.authorIds.length;
    const att: boolean[][] = new Array(n).fill([]);
    story.meetings.forEach((m, i) => m.forEach(j => att[i]![j] = true));
    const m: number[][] = new Array(n).fill([]);
    for (let i of _.range(0, n)) {
        for (let j of _.range(0, i)) {
            m[i]![j] = countCrossings(att[i]!, att[j]!, n);
        }
    }
    return m;
}
// const m = mkCrossingMatrix(story);
// const [_0, top, bottom] = maxCutGreedyEC(m, story.authorIds.length);

const splitStory = (story: Storyline, top: number[], bottom: number[]): [Storyline, Storyline] => {
    _.pull(top, 0); _.pull(bottom, 0);
    const topStory: Storyline = {
        authorIds: top.map(i => story.authorIds[i]!),
        meetings: story.meetings.map(m => _.without(m, ...bottom)),
    };
    const bottomStory: Storyline = {
        authorIds: bottom.map(i => story.authorIds[i]!),
        meetings: story.meetings.map(m => _.without(m, ...top)),
    };
    return [topStory, bottomStory];
}

const mergeRealizations = (top: SBCMRealization, bottom: SBCMRealization): SBCMRealization => {
    const flippedTop = flipRealization(top);
    return {
        initialPermutation: [...flippedTop.initialPermutation, ...bottom.initialPermutation.slice(1)],
        blockCrossings: _.zip(flippedTop.blockCrossings, bottom.blockCrossings)
            .map(([top, bot]) => _.concat(top!, bot!))
    };
}

const flipRealization = (real: SBCMRealization): SBCMRealization => {
    const n = real.initialPermutation.length;
    return {
        initialPermutation: real.initialPermutation.toReversed(),
        blockCrossings: real.blockCrossings.map(bcs => bcs.map(([a, b, c]) => [n - c - 1, n - b - 2, n - a - 1])),
    };
}
