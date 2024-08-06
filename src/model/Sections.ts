/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash";
import { Realization, Storyline, applyBc, supportsMeeting } from "./Storyline";
import { Publication } from "./Metadata";

export type Section = MeetingSect | BlockCrossingSect | EmptySect

export interface MeetingSect {
    kind: 'meeting',
    ordinal: number,
    xTickLabel: string | undefined,
    fromIncl: number,
    toIncl: number,
}

export interface BlockCrossingSect {
    kind: 'block-crossing'
    bc: readonly [number, number, number],
    perm: number[],
}

export interface EmptySect {
    kind: 'empty'
}

export const mkSections = (story: Storyline, realization: Realization, publ: Publication[]) => {
    let perm = realization.initialPermutation;
    // console.log({ init: realization.initialPermutation, story })
    const result: Section[] = []; // mutable :(
    _.zip(story.meetings, realization.blockCrossings).forEach(([meeting, blockCrossings], ordinal) => {
        if (!meeting) {
            console.warn('excess block crossings');
            return;
        } else if (!blockCrossings) {
            console.warn(`undefined sequence of block crossings before meeting ${meeting} treated as empty`);
        } else {
            blockCrossings.forEach(bc => {
                result.push({ kind: 'block-crossing', bc, perm: perm.slice(bc[0], bc[2] + 1) });
                perm = applyBc(perm, ...bc);
            });
        }
        const supported = supportsMeeting(perm, meeting);
        if (!supported) { throw new Error(`meeting ${meeting} (#${ordinal + 1}) is unsupported by <${perm}>`); }
        const meta = publ[ordinal]!;
        result.push({ kind: 'meeting', ordinal, xTickLabel: meta.year.toString(), ...supported });
    });
    return result;
}
