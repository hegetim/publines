import _ from "lodash";
import { SbcmRealization, Storyline, mkPwCrossings, supportsMeeting } from "./Storyline";
import { windows2 } from "./Util";

interface GridNode<T extends GridNode<T>> {
    top: T | undefined,
    right: T | undefined,
    bottom: T | undefined,
    left: T | undefined,
}

interface Cell extends GridNode<Cell> {
    lineIdx: number,
    trCorner: Corner,  // this corner is unique for every cell; bl would also work
    meetings: number[],
}

type Corner = GridNode<Corner> & {
    kind: 'incomplete'          // not yet determined
    | 'internal'                // internal corner (4 adjacent faces w/o conflicting meetings)
    | 'point-hole'              // point hole (4 adjacent faces w/ conflicting meetings)
    | 'none-boundary'           // convex boundary (90° or 180° corner, 1 or 2 adjacent faces)
    | 'any-boundary'            // concave boundary (>180°, 3 adjacent faces)
    | 'tl-boundary'             // concave boundary (>270°, 5 adjacent faces, top-left orientation)
    | 'br-boundary',            // concave boundary (>270°, 5 adjacent faces, bottom-right orientation)
};

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
                const [left, bottom] = [buffer[x], buffer[x + 1]];
                const trCorner: Corner = { ...empty(), kind: 'incomplete' };

                const cell: Cell = { ...empty(), left, bottom, trCorner, lineIdx: x, meetings: [] };
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
    const corners: Corner[] = [];

    cells.forEach(cell => {
        /* CASES 4 tr:
         *  + has top.right => edge to top.tr
         *  + _otherwise_: has right?.top?.left => edge to right.top.left.tr
         *  + has right.top => edge to right.tr
         *  + _otherwise_: has top?.right?.bottom => edge to top.right.bottom.tr
         *  + has top + right:
         *      > top.right == right.top != nil => if no two meetings then internal else point hole
         *      > top.right == right.top == nil => type 'any' boundary
         *      > top.right != right.top == nil => type 'tl' boundary?
         *      > right.top != top.right == nil => type 'br' boundary?
         *      > check never nil != top.right != right.top != nil!
         *  + has only top:
         *      > has top.right => type 'any' boundary
         *  + has only right:
         *      > has right.top => type 'any' boundary
         *  + all other cases:
         *      > type 'none' boundary
         * 
         * CASES 4 tl (left == nil AND top?.left?.bottom == nil):
         *  - has top => edge to tr
         *  - has top.left:
         *      > edge to top.left.tr
         *      > type 'any' boundary
         *  - _otherwise_: type 'none' boundary
         * 
         * CASES 4 br (bottom == nil AND right?.bottom == nil):
         *  - has right:
         *      > edge to tr
         *      > type 'none' boundary
         * 
         * CASES 4 bl (never)
         */

        // top edge
        if (cell.top?.right) {
            /*DEBUG*/if (cell.trCorner.top || cell.top.trCorner.bottom) { console.warn('overwrite warning!'); }
            cell.trCorner.top = cell.top.trCorner;
            cell.top.trCorner.bottom = cell.trCorner;
        } else if (cell.right?.top?.left) {
            /*DEBUG*/if (cell.trCorner.top || cell.right.top.left.trCorner.bottom) { console.warn('overwrite warning!'); }
            cell.trCorner.top = cell.right.top.left.trCorner;
            cell.right.top.left.trCorner.bottom = cell.trCorner;
        }

        // right edge
        if (cell.right?.top) {
            /*DEBUG*/if (cell.trCorner.right || cell.right.trCorner.left) { console.warn('overwrite warning!'); }
            cell.trCorner.right = cell.right.trCorner;
            cell.right.trCorner.left = cell.trCorner;
        } else if (cell.top?.right?.bottom) {
            /*DEBUG*/if (cell.trCorner.right || cell.top.right.bottom.trCorner.left) { console.warn('overwrite warning!'); }
            cell.trCorner.right = cell.top.right.bottom.trCorner;
            cell.top.right.bottom.trCorner.left = cell.trCorner;
        }

        // kind
        if (cell.top && cell.right) {
            if (cell.top.right && cell.right.top) {
                if (cell.top.right !== cell.right.top) { throw new Error('degenerate face'); }
                if (hasNoDuplicates([...cell.meetings, ...cell.top.right.meetings])) {
                    cell.trCorner.kind = 'internal';
                } else {
                    cell.trCorner.kind = 'point-hole';
                }
            } else if (cell.top.right) {
                cell.trCorner.kind = 'tl-boundary';

            } else if (cell.right.top) {
                cell.trCorner.kind = 'br-boundary';
            } else {
                cell.trCorner.kind = 'any-boundary';
            }
        } else if (cell.top?.right || cell.right?.top) {
            cell.trCorner.kind = 'any-boundary';
        } else {
            cell.trCorner.kind = 'none-boundary';
        }
    });

    return corners;
};

const hasNoDuplicates = (xs: number[]) => {
    xs.sort((a, b) => a - b); // sort ascending
    for (let [a, b] of windows2(xs)) {
        if (a === b) { return false; }
    }
    return true;
};
