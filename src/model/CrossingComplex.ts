import _ from "lodash";
import { Realization, Storyline, mkPwCrossings, supportsMeeting } from "./Storyline";
import { windows2 } from "./Util";
import { fakePublications } from "../components/Playground";
import { oneSidedScm } from "./OneSided";

interface GridNode<T extends GridNode<T>> {
    top: T | undefined,
    right: T | undefined,
    bottom: T | undefined,
    left: T | undefined,
}

interface Cell extends GridNode<Cell> {
    readonly lineIdx: number,
    readonly trCorner: Corner,  // this corner is unique for every cell; bl would also work
    readonly meetings: number[],
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

const mkCells = (story: Storyline, realization: Realization) => {
    const k = realization.initialPermutation.length;
    const cells: Cell[] = [];
    const cellBuf: (Cell | undefined)[] = Array.from({ length: k }, () => undefined);
    const meetingBuf: number[][] = Array.from({ length: k }, () => []);
    let perm = realization.initialPermutation;

    const pwCrossings = mkPwCrossings(realization);
    console.log(pwCrossings)

    _.zip(pwCrossings, story.meetings).forEach(([xs, meeting], i) => {
        if (xs) {
            xs.forEach(x => {
                const trCorner: Corner = { ...empty(), kind: 'incomplete' };

                const left = cellBuf[x] && (cellBuf[x]!.lineIdx === (x - 1)) ? cellBuf[x] : undefined;
                const bottom = cellBuf[x + 1] && (cellBuf[x + 1]!.lineIdx === (x + 1)) ? cellBuf[x + 1] : undefined;

                const cell: Cell = { ...empty(), left, bottom, trCorner, lineIdx: x, meetings: [] };
                cells.push(cell);

                if (left) { left.right = cell; }
                if (bottom) { bottom.top = cell; }

                cellBuf[x] = cell;
                cellBuf[x + 1] = cell;

                cell.meetings.push(...meetingBuf[x]!);
                meetingBuf[x] = [];

                applyX(perm, x);
            });
        } else { console.warn(`falsy seq of block crossings before meeting ${meeting} treated as empty`); }
        if (meeting) {
            const supported = supportsMeeting(perm, meeting);
            if (!supported) { throw new Error(`meeting ${meeting} is unsupported by ${perm}`); }
            if (cellBuf[supported.to] && cellBuf[supported.to]!.lineIdx === supported.to) {
                cellBuf[supported.to]!.meetings.push(i);
            }
            meetingBuf[supported.to]!.push(i);
        }
    });

    return cells;
};

const mkCorners = (cells: Cell[]) => {
    const corners: Corner[] = [];

    cells.forEach(cell => {
        // top-right corner:
        corners.push(cell.trCorner);

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

        // top-left corner
        if (cell.top && !cell.left && !cell.top.left?.bottom) {
            const tl: Corner = { ...empty(), kind: cell.top.left ? 'any-boundary' : 'none-boundary' };
            corners.push(tl);
            tl.right = cell.trCorner;
            cell.trCorner.left = tl;
            if (cell.top.left) {
                tl.top = cell.top.left.trCorner;
                cell.top.left.trCorner.bottom = tl;
            }
        }

        // bottom-right corner
        if (cell.right && !cell.bottom && !cell.right.bottom) {
            const br: Corner = { ...empty(), kind: 'none-boundary' };
            corners.push(br);
            br.top = cell.trCorner;
            cell.trCorner.bottom = br;
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

export const ccTest = (story: Storyline, realized: Realization) => {
    // const publs = fakePublications({
    //     "meetings": [
    //         [0, 1, 2, 3, 4, 5],
    //         [0, 1],
    //         [0, 1, 2, 6],
    //         [0, 1, 2, 6, 3, 4, 7, 8],
    //         [0, 1, 6],
    //         [0, 6, 3],
    //         [0, 6, 3, 2, 7],
    //         [0, 6, 3, 2, 7, 1, 9]
    //     ]
    // });
    // const [story, _0] = mkStoryline(publs, publs[0]?.authors[0]!, false);
    // const realized = oneSidedScm(story);

    const cells = mkCells(story, realized);

    mkCorners(cells);

    console.log(cells[0]);
}
