/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash";
import { mkAttendance } from "./BiSbcm";
import { BlockCrossings, Realization, Storyline } from "./Storyline";
import { shuffle } from "./Util";
import { splitmix32 } from "./Prng";

const PRNG_SEED = 0x42c0ffee;

export const medianScm = (story: Storyline): Realization => {
    const randomPermutation = _.range(0, story.authorIds.length);
    shuffle(randomPermutation, splitmix32(PRNG_SEED));
    const [_0, initialPermutation] = realize(randomPermutation, story.meetings.toReversed());
    const [blockCrossings, _1] = realize(initialPermutation, story.meetings);
    return { initialPermutation, blockCrossings };
}

const realize = (start: number[], meetings: number[][]) => {
    const att = mkAttendance(start.length, meetings);
    const perm = [...start];
    const bcs: BlockCrossings[] = [];

    meetings.forEach((m, i) => {
        const attends = (c: number) => att.has(c, i);
        bcs.push(realizeMeeting(perm, m, attends));
    });

    return [bcs, perm] as const;
}

const realizeMeeting = (perm: number[], meeting: number[], attends: (c: number) => boolean) => {
    const med = findMedian(perm, meeting.length, attends);
    const res: BlockCrossings = [];
    let i = med - 2;
    while (i >= 0) {
        if (attends(perm[i]!) && !attends(perm[i + 1]!)) {
            res.push([i, i, i + 1]);
            cross(perm, i);
            i = i + 1;
        } else { i = i - 1; }
    }
    i = med + 1;
    while (i < perm.length - 1) {
        if (attends(perm[i + 1]!) && !attends(perm[i]!)) {
            res.push([i, i, i + 1]);
            cross(perm, i);
            i = i - 1;
        } else { i = i + 1; }
    }
    return res;
}

const findMedian = (perm: number[], meetingSize: number, attends: (c: number) => boolean) => {
    const median = Math.ceil(meetingSize / 2);
    let [res, count] = [0, 0]
    for (const c of perm) {
        if (attends(c)) {
            count += 1;
            if (count == median) { return res; }
        }
        res += 1;
    }
    throw new Error('unreachable!');
}

const cross = (perm: number[], crossAt: number) => {
    const atX = perm[crossAt]!;
    perm[crossAt] = perm[crossAt + 1]!;
    perm[crossAt + 1] = atX;
}
