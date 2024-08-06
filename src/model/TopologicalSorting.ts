/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import BitSet from "bitset";

type CycleDetected = { kind: 'cycle', containsNode: number };
type OrderedResult = { kind: 'ordered', ordered: number[] };
export type DfsResult = CycleDetected | OrderedResult;

export const topologicalSortWithDfs = (ids: number[], neighbors: (v: number) => number[]): DfsResult => {
    const [visited, finished] = [new BitSet(), new BitSet()];
    const result: number[] = [];

    let cycleFlag: CycleDetected | undefined = undefined;

    const visit = (v: number) => {
        if (!cycleFlag && finished.get(v) !== 1) {
            if (visited.get(v) === 1) { cycleFlag = { kind: 'cycle', containsNode: v }; }
            visited.set(v, 1);
            neighbors(v).forEach(u => visit(u));
            finished.set(v, 1);
            result.push(v)
        }
    }

    for (const v of ids) {
        visit(v);
        if (cycleFlag) { return cycleFlag; }
    }
    return { kind: 'ordered', ordered: result.reverse() };
}
