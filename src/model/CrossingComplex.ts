import _ from "lodash";
import { Realization, Storyline, mkPwCrossings, supportsMeeting } from "./Storyline";
import { assertExhaustive, matchString, windows2 } from "./Util";

interface GridNode<T extends GridNode<T>> {
    id: number,
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
    cellId: number,
};

interface Chord {
    orientation: 'vertical' | 'horizontal',
    start: Corner,
    end: Corner,
}

const empty = <T extends GridNode<T>>(id: number): GridNode<T> =>
    ({ id, top: undefined, right: undefined, bottom: undefined, left: undefined });

const applyX = (perm: number[], x: number) => {
    const tmp = perm[x]!;
    perm[x] = perm[x + 1]!;
    perm[x + 1] = tmp;
};

const mkCells = (story: Storyline, realization: Realization) => {
    const k = realization.initialPermutation.length;
    const cellBuf: (Cell | undefined)[] = Array.from({ length: k }, () => undefined);
    const meetingBuf: number[][] = Array.from({ length: k }, () => []);
    let perm = realization.initialPermutation;

    const cells: Cell[] = [];

    _.zip(mkPwCrossings(realization), story.meetings).forEach(([xs, meeting], i) => {
        if (xs) {
            xs.forEach(x => {
                const left = cellBuf[x] && (cellBuf[x]!.lineIdx === (x - 1)) ? cellBuf[x] : undefined;
                const bottom = cellBuf[x + 1] && (cellBuf[x + 1]!.lineIdx === (x + 1)) ? cellBuf[x + 1] : undefined;

                const trCorner: Corner = { ...empty(cells.length), kind: 'incomplete', cellId: cells.length };
                const cell: Cell = { ...empty(cells.length), left, bottom, trCorner, lineIdx: x, meetings: [] };
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
    const corners: Corner[] = cells.map(c => c.trCorner);

    cells.forEach(cell => {
        // ==== top-right corner ====

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

        // ==== top-left corner ====
        if (cell.top && !cell.left && !cell.top.left?.bottom) {
            const kind = cell.top.left ? 'any-boundary' : 'none-boundary';
            const tl: Corner = { ...empty(corners.length), kind, cellId: cell.id };
            corners.push(tl);
            tl.right = cell.trCorner;
            cell.trCorner.left = tl;
            if (cell.top.left) {
                tl.top = cell.top.left.trCorner;
                cell.top.left.trCorner.bottom = tl;
            }
        }

        // ==== bottom-right corner ====
        if (cell.right && !cell.bottom && !cell.right.bottom) {
            const br: Corner = { ...empty(corners.length), kind: 'none-boundary', cellId: cell.id };
            corners.push(br);
            br.top = cell.trCorner;
            cell.trCorner.bottom = br;
        }
    });

    /*DEBUG*/if (!hasNoDuplicates(corners.map(c => c.id))) { console.error("duplicate corner id") }
    return corners;
};

const hasNoDuplicates = (xs: number[]) => {
    xs.sort((a, b) => a - b); // sort ascending
    for (let [a, b] of windows2(xs)) {
        if (a === b) { return false; }
    }
    return true;
};

const mkEffectiveChords = (corners: Corner[]) => {
    const hChords = corners.flatMap(c => mkEffectiveChord(c, 'horizontal'));
    const vChords = corners.flatMap(c => mkEffectiveChord(c, 'vertical'));

    // todo:
    // conflict graph
    // MIS
    // cuts
    // (rects)
}

const isConvex = (corner: Corner) => {
    if (corner.kind === 'incomplete') { throw new Error(`incomplete corner ${corner} in effective chord`) }
    return corner.kind === 'internal' || corner.kind === 'none-boundary';
}

const chordEnd = (corner: Corner, orientation: 'horizontal' | 'vertical'): Corner => {
    const next = matchString(orientation, { 'horizontal': () => corner.right, 'vertical': () => corner.top });
    if (next) {
        if (isConvex(next)) {
            return chordEnd(next, orientation);
        } else {
            return next
        }
    }
    return corner;
}

const mkEffectiveChord = (start: Corner, orientation: 'horizontal' | 'vertical'): [] | [Chord] => {
    if (isConvex(start)) {
        return [];
    } else {
        let end = chordEnd(start, orientation);
        if (start.id === end.id) {
            return [];
        } else {
            return [{ orientation, start, end }];
        }
    }
}

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
