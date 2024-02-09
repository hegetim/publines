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
    let [i, j] = [0, 0];
    const result: Section[] = []; // mutable :(
    while (true) {
        const meeting = story.meetings[i];
        if (meeting === undefined) {
            // console.log({ result });
            return result;
        } else {
            const supported = supportsMeeting(perm, meeting)
            if (supported !== false) {
                result.push({ kind: 'meeting', ordinal: i, xTickLabel: labels[i], ...supported });
                i += 1;
            } else {
                const nextBc = realization.blockCrossings[j];
                if (nextBc === undefined) {
                    console.error(`no block crossing left but meeting ${meeting} is unsupported`);
                    return undefined;
                } else {
                    result.push({ kind: 'block-crossing', bc: nextBc, perm: perm.slice(nextBc[0], nextBc[2] + 1) });
                    j += 1;
                    perm = applyBc(perm, ...nextBc);
                }
            }
        }
    }
}
