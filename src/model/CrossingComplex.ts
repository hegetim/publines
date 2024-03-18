import _ from "lodash";
import { SbcmRealization, Storyline, mkPwCrossings, supportsMeeting } from "./Storyline";

interface GridNode<T extends GridNode<T>> {
    top: T | undefined,
    right: T | undefined,
    bottom: T | undefined,
    left: T | undefined,
}

interface Cell extends GridNode<Cell> {
    hLineId: number,
    vLineId: number,
    tlCorner: Corner,
    meetings: number[],
}

type Corner = GridNode<Corner> & (
    {
        kind: 'internal' | 'incomplete',
    } | {
        kind: 'boundary',
        cuts: 'none' | 'any' | 'straight' | 'tl' | 'br',
    }
);

const empty = <T extends GridNode<T>>(): GridNode<T> =>
    ({ top: undefined, right: undefined, bottom: undefined, left: undefined });

const applyX = (perm: number[], x: number) => {
    const tmp = perm[x]!;
    perm[x] = perm[x + 1]!;
    perm[x + 1] = tmp;
};

const mkCells = (story: Storyline, realization: SbcmRealization) => {
    const cells: Cell[] = [];
    const buffer: (Cell | undefined)[] = Array.from({ length: realization.initialPermutation.length }, () => undefined);
    let perm = realization.initialPermutation;

    _.zip(mkPwCrossings(realization), story.meetings).forEach(([xs, meeting], i) => {
        if (xs) {
            xs.forEach(x => {
                const [hLineId, vLineId] = [perm[x]!, perm[x + 1]!];
                const [left, bottom] = [buffer[x], buffer[x + 1]];
                const tlCorner: Corner = { ...empty(), kind: 'incomplete' };

                const cell: Cell = { ...empty(), left, bottom, hLineId, vLineId, tlCorner, meetings: [] };
                cells.push(cell);

                if (left) {
                    left.right = cell;
                    left.meetings.forEach(m => {
                        if (m < 0) {
                            cell.meetings.push(-m + 1);
                        }
                    });
                }
                if (bottom) { bottom.top = cell; }

                buffer[x] = cell;
                buffer[x + 1] = cell;

                applyX(perm, x);
            });
        } else { console.warn(`falsy seq of block crossings before meeting ${meeting} treated as empty`); }
        if (meeting) {
            const supported = supportsMeeting(perm, meeting);
            if (!supported) { throw new Error(`meeting ${meeting} is unsupported by ${perm}`); }
            buffer[supported.to]!.meetings.push(-i - 1); // ugly encoding for "crossing happens _before_ meeting"
        }
    });

    cells.forEach(c => c.meetings.forEach((m, i, ms) => { if (m < 0) { ms[i] = -m + 1; } }));

    return cells;
};

const mkCorners = (cells: Cell[]) => {

}
