/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash";
import { Storyline, Realization, BlockCrossings, supportsMeeting, applyBc } from "./Storyline";
import { windows2 } from "./Util";

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

export const oneSidedScm = (story: Storyline): Realization => {
    const initialPermutation = _.range(0, story.authorIds.length).sort(compareAttendance(story));
    // console.log({ initialPermutation });
    let perm = [...initialPermutation];
    const blockCrossings: BlockCrossings[] = [[]]; // first meeting is always supported
    for (const [m1, m2] of windows2(story.meetings)) {
        // console.log({ m1, m2, supported: supportsMeeting(perm, m2) });
        const newCrossings: BlockCrossings = [];
        if (supportsMeeting(perm, m2)) {
            blockCrossings.push(newCrossings);
            continue;
        }
        const s1 = _.intersection(m1, m2);
        const s2 = _.difference(m1, m2);
        const s3 = _.difference(m2, m1);
        const s4 = _.difference(_.range(0, story.authorIds.length), _.union(m1, m2));
        const iPerm = inverted(perm);
        for (const c of _.sortBy(s1, i => iPerm[i]!)) {
            let i = iPerm[c]!;
            while (i > 0 && s2.includes(perm[i - 1]!)) {
                cross(perm, iPerm, i - 1);
                newCrossings.push([i - 1, i - 1, i]);
                // console.log(`crossing ${i - 1} and ${i}`);
                i -= 1;
            }
        }
        for (const c of _.sortBy(s3, i => iPerm[i]!)) {
            let i = iPerm[c]!;
            while (i > 0 && s4.includes(perm[i - 1]!)) {
                cross(perm, iPerm, i - 1);
                newCrossings.push([i - 1, i - 1, i]);
                // console.log(`crossing ${i - 1} and ${i}`);
                i -= 1;
            }
        }
        if (s2.length > 0 && s3.length > 0) {
            const finalBc: [number, number, number] = [s1.length, m1.length - 1, m2.length + s2.length - 1];
            newCrossings.push(finalBc);
            perm = applyBc(perm, ...finalBc);
            // console.log(`block crossing ${finalBc}`);
        }
        blockCrossings.push(newCrossings);
    }
    return { initialPermutation, blockCrossings };
}
