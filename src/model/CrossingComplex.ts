import _ from "lodash";
import { Realization, Storyline, mkPwCrossings, supportsMeeting } from "./Storyline";
import { assertExhaustive, matchString, unfold, windows2 } from "./Util";
import { bipartiteMis } from "./BiMis";
import { splitmix32 } from "./Prng";

const PRNG_SEED = 0x42c0ffee;

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
    | 'br-boundary'             // concave boundary (>270°, 5 adjacent faces, bottom-right orientation)
    | 'cut',                    // former internal corner that has been cut
    cell: Cell,
};

interface SimpleChord {
    start: Corner,
    dir: Direction,
}

type EffectiveChord = SimpleChord & { end: Corner };

type Direction = 'top' | 'right' | 'bottom' | 'left';

const rndm = splitmix32(PRNG_SEED);

const empty = <T extends GridNode<T>>(id: number): GridNode<T> =>
    ({ id, top: undefined, right: undefined, bottom: undefined, left: undefined });

const applyX = (perm: number[], x: number) => {
    const tmp = perm[x]!;
    perm[x] = perm[x + 1]!;
    perm[x + 1] = tmp;
};

const unsafeCellDummyForSwap = { ...empty(-1), lineIdx: -1, meetings: [], trCorner: null } as unknown as Cell;

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

                const trCorner: Corner = { ...empty(cells.length), kind: 'incomplete', cell: unsafeCellDummyForSwap };
                const cell: Cell = { ...empty(cells.length), left, bottom, trCorner, lineIdx: x, meetings: [] };
                trCorner.cell = cell;
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
            const tl: Corner = { ...empty(corners.length), kind, cell };
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
            const br: Corner = { ...empty(corners.length), kind: 'none-boundary', cell };
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
    const hChords = corners.flatMap(c => mkEffectiveChord(c, 'right'));
    const vChords = corners.flatMap(c => mkEffectiveChord(c, 'top'));

    const conflicts = hChords.map(h => vChords.flatMap((v, i) => hasConflict(h, v) ? [i] : []));
    const [hMask, vMask] = bipartiteMis(v => conflicts[v]!, hChords.length, vChords.length);

    return [...hChords.filter((_, i) => hMask.get(i) === 1), ...vChords.filter((_, i) => vMask.get(i) === 1)];
}

const mkEffectiveChord = (start: Corner, dir: Direction): [] | [EffectiveChord] => {
    if (isConvex(start)) {
        return [];
    } else {
        let end = chordEnd(start, dir);
        if (start.id === end.id || isConvex(end)) {
            return [];
        } else {
            return [{ dir, start, end }];
        }
    }
}

const isConvex = (corner: Corner) => {
    if (corner.kind === 'incomplete') { throw new Error(`${corner.kind} corner »${corner}« in chord`); }
    return corner.kind === 'internal' || corner.kind === 'none-boundary';
}

const chordEnd = (corner: Corner, dir: Direction): Corner => {
    const next = corner[dir];
    if (next) {
        if (isConvex(next)) {
            return chordEnd(next, dir);
        } else {
            return next;
        }
    }
    return corner;
}

const hasConflict = (h: EffectiveChord, v: EffectiveChord) => {
    const atEnds = (h.start.id === v.start.id && hasConflictingEnds(h.start, 'tr'))
        || (h.start.id === v.end.id && hasConflictingEnds(h.start, 'br'))
        || (h.end.id === v.start.id && hasConflictingEnds(h.end, 'tl'))
        || (h.end.id === v.end.id && hasConflictingEnds(h.end, 'bl'))
    const inBetween = !hasNoDuplicates([...innerNodes(h), ...innerNodes(v)].map(c => c.id));
    return atEnds || inBetween;
}

const hasConflictingEnds = (c: Corner, pattern: 'tl' | 'tr' | 'bl' | 'br') => matchString(c.kind, {
    incomplete: () => { throw new Error(`incomplete corner ${c} in effective chord`) },
    internal: () => { throw new Error(`internal corner ${c} cannot have conflicting chords`) },
    cut: () => { throw new Error(`cut corner ${c} cannot have conflicting chords`) },
    "none-boundary": () => { throw new Error(`convex corner ${c} cannot have conflicting chords`) },
    "any-boundary": () => true,
    "point-hole": () => true,
    "br-boundary": () => pattern !== 'br',
    "tl-boundary": () => pattern !== 'tl',
});

const innerNodes = (c: EffectiveChord) => [...unfold(c.start, cur => {
    const next = cur[c.dir];
    return next && next.id === c.end.id ? undefined : next;
})].slice(1);

const cut = (from: Corner, dir: Direction) => {
    const to = from[dir];
    if (!to) { throw new Error(`impossible cut: »${from}« -> ${dir}`); }
    cutGrid(from, to, dir);

    if (from.cell.trCorner.id === from.id) {
        matchString(dir, {
            top: () => {
                if (from.cell.top?.right) { cutGrid(from.cell.top, from.cell.top.right, 'right'); }
                else { cutGrid(from.cell.right?.top!, from.cell.right?.top?.left!, 'left'); }
            },
            right: () => {
                if (from.cell.right?.top) { cutGrid(from.cell.right, from.cell.right.top, 'top'); }
                else { cutGrid(from.cell.top?.right!, from.cell.top?.right?.bottom!, 'bottom'); }
            },
            bottom: () => cutGrid(from.cell, from.cell.right!, 'right'),
            left: () => cutGrid(from.cell, from.cell.top!, 'top'),
        });
    } else { // from is a tl corner && from.cell.left is undefined
        if (dir === 'left' || dir === 'bottom') { throw new Error(`cut along boundary »${from}« -> ${dir}`); }
        else if (dir === 'right') { cutGrid(from.cell, from.cell.top!, 'top'); }
        else if (dir === 'top') { cutGrid(from.cell.top!, from.cell.top?.left!, 'left'); }
        else { assertExhaustive(dir); }
    }

    if (to.kind === 'internal') {
        to.kind = 'cut';
        cut(to, dir);
    }
}

const cutGrid = <T extends GridNode<T>>(from: T, to: T, dir: Direction) => matchString(dir, {
    top: () => { from.top = to.bottom = undefined; },
    right: () => { from.right = to.left = undefined; },
    bottom: () => { from.bottom = to.top = undefined; },
    left: () => { from.left = to.right = undefined; },
});

const mkSimpleChords = (corners: Corner[]) => corners.flatMap(c => {
    if (c.kind === 'incomplete') { throw new Error(`incomplete corner »${c}« when building simple chords`); }
    else if (c.kind === 'cut' || c.kind === 'internal' || c.kind === 'none-boundary') { return []; }
    else {
        const degree = dirs(c).length;
        if (degree === 1) { return []; }
        else if (degree === 2) { return c.kind === 'any-boundary' ? [select1(c)] : []; }
        else if (degree === 3) { return [select1(c)]; }
        else if (degree === 4) { return select2(c); }
        else { throw new Error(`cannot construct simple chords for corner »${c}«`); }
    }
});

const dirs = (v: GridNode<any>): Direction[] => {
    const res: Direction[] = [];
    if (v.top) { res.push('top'); }
    if (v.right) { res.push('right'); }
    if (v.bottom) { res.push('bottom'); }
    if (v.left) { res.push('left'); }
    return res;
}

const select1 = (c: Corner): SimpleChord => {
    const options: Direction[] = [];
    if (c.kind === 'any-boundary') { options.push(...dirs(c)); }
    else {
        if (!c.top) { options.push('bottom'); }
        else if (!c.right) { options.push('left'); }
        else if (!c.bottom) { options.push('top'); }
        else if (!c.left) { options.push('right'); }
        else { throw new Error(`'select1' on degree 4 corner »${c}«`) }

        if (c.kind === 'tl-boundary') {
            if (!c.top) { options.push('left'); }
            else if (!c.left) { options.push('top'); }
        } else if (c.kind === 'br-boundary') {
            if (!c.bottom) { options.push('right'); }
            else if (!c.right) { options.push('bottom'); }
        }
    }
    const dir = options[Math.floor(rndm() * options.length)]!;
    return { start: c, dir };
};

const select2 = (c: Corner): SimpleChord[] => {
    const options: [Direction, Direction][] = [['bottom', 'top'], ['left', 'right']];
    if (c.kind === 'tl-boundary') { options.push(['top', 'left']); }
    if (c.kind === 'br-boundary') { options.push(['bottom', 'right']); }
    const [dir1, dir2] = options[Math.floor(rndm() * options.length)]!;
    return [{ start: c, dir: dir1 }, { start: c, dir: dir2 }];
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
