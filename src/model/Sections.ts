import _ from "lodash";
import { SBCMRealization, Storyline, applyBc, supportsMeeting } from "./Storyline";

export type Section = MeetingSect | BlockCrossingSect | EmptySect

export interface MeetingSect {
    kind: 'meeting',
    ordinal: number,
    xTickLabel: string | undefined,
    from: number,
    to: number,
}

export interface BlockCrossingSect {
    kind: 'block-crossing'
    bc: [number, number, number],
    perm: number[],
}

export interface EmptySect {
    kind: 'empty'
}

export const mkSections = (story: Storyline, realization: SBCMRealization, labels: string[]) => {
    let perm = realization.initialPermutation;
    console.log({ init: realization.initialPermutation, story })
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
        const supported = supportsMeeting(perm, meeting)
        if (!supported) { throw new Error(`meeting ${meeting} is unsupported by <${perm}>`); }
        result.push({ kind: 'meeting', ordinal, xTickLabel: labels[ordinal], ...supported });
    });
    return result;
}
