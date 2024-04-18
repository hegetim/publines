import _ from "lodash";
import { BlockCrossings, Realization, Storyline, applyBc, mkPwCrossings, supportsMeeting } from "./Storyline";
import { assertExhaustive, matchString, unfold, windows2 } from "./Util";
import { bipartiteMis } from "./BiMis";
import { splitmix32 } from "./Prng";
import { DisjointSets } from "./DisjointSets";
import { topologicalSortWithDfs } from "./TopologicalSorting";

const PRNG_SEED = 0x42c0ffee;

interface GridNode<T extends GridNode<T>> {
    id: number,
    tr: T | undefined,
    br: T | undefined,
    bl: T | undefined,
    tl: T | undefined,
}

interface Cell extends GridNode<Cell> {
    readonly lineIdx: number,
    readonly rCorner: Corner,  // this corner is unique for every cell; l would also work
    readonly meetings: number[],
}

type Corner = GridNode<Corner> & {
    kind: 'incomplete'          // not yet determined
    | 'internal'                // internal corner (4 adjacent faces w/o conflicting meetings)
    | 'point-hole'              // point hole (4 adjacent faces w/ conflicting meetings)
    | 'none-boundary'           // convex boundary (90° or 180° corner, 1 or 2 adjacent faces)
    | 'any-boundary'            // concave boundary (>180°, 3 adjacent faces)
    | 'b-boundary'              // concave boundary (>270°, 5 adjacent faces, split bottom face)
    | 't-boundary'              // concave boundary (>270°, 5 adjacent faces, split top face)
    | 'cut',                    // former internal corner that has been cut
    cell: Cell,
};

interface SimpleChord {
    start: Corner,
    dir: Direction,
}

type EffectiveChord = SimpleChord & { end: Corner };

type Direction = 'tr' | 'br' | 'bl' | 'tl';

interface Bundle {
    id: number,
    bc: [number, number, number],
    placeBefore: number[],
}

let random = splitmix32(PRNG_SEED);

const empty = <T extends GridNode<T>>(id: number): GridNode<T> =>
    ({ id, tr: undefined, br: undefined, bl: undefined, tl: undefined });

const applyX = (perm: number[], x: number) => {
    const tmp = perm[x]!;
    perm[x] = perm[x + 1]!;
    perm[x + 1] = tmp;
};

const unsafeCellDummyForSwap = { ...empty(-1), lineIdx: -1, meetings: [], trCorner: null } as unknown as Cell;

const mkCells = (story: Storyline, realization: Realization) => {
    const k = realization.initialPermutation.length;
    const cellBuf: (Cell | undefined)[] = Array.from({ length: k }, () => undefined);
    const meetingStarts: number[][] = Array.from({ length: k }, () => []);
    const meetingEnds: number[][] = Array.from({ length: k }, () => []);

    let perm = [...realization.initialPermutation];

    const cells: Cell[] = [];

    _.zip(mkPwCrossings(realization), story.meetings).forEach(([xs, meeting], i) => {
        if (xs) {
            xs.forEach(x => {
                const left = cellBuf[x] && (cellBuf[x]!.lineIdx === (x - 1)) ? cellBuf[x] : undefined;
                const bottom = cellBuf[x + 1] && (cellBuf[x + 1]!.lineIdx === (x + 1)) ? cellBuf[x + 1] : undefined;

                const trCorner: Corner = { ...empty(cells.length), kind: 'incomplete', cell: unsafeCellDummyForSwap };
                const cell: Cell = { ...empty(cells.length), tl: left, bl: bottom, rCorner: trCorner, lineIdx: x, meetings: [] };
                trCorner.cell = cell;
                cells.push(cell);

                if (left) { left.br = cell; }
                if (bottom) { bottom.tr = cell; }

                cellBuf[x] = cell;
                cellBuf[x + 1] = cell;

                cell.meetings.push(...meetingEnds[x]!);
                meetingEnds[x] = [];
                cell.meetings.push(...meetingStarts[x + 1]!);
                meetingStarts[x + 1] = [];

                applyX(perm, x);
            });
        } else { console.warn(`falsy seq of block crossings before meeting ${meeting} treated as empty`); }
        if (meeting) {
            const supported = supportsMeeting(perm, meeting);
            if (!supported) { throw new Error(`meeting ${meeting} is unsupported by ${perm}`); }
            const [atFrom, atTo] = [cellBuf[supported.from], cellBuf[supported.to]];
            if (atFrom && atFrom.lineIdx === supported.from - 1) { atFrom.meetings.push(i); }
            if (atTo && atTo.lineIdx === supported.to) { atTo.meetings.push(i); }
            meetingStarts[supported.from]!.push(i);
            meetingEnds[supported.to]!.push(i);
        }
    });

    return cells;
};

const mkCorners = (cells: Cell[]) => {
    const corners: Corner[] = cells.map(c => c.rCorner);

    cells.forEach(cell => {
        // ==== top-right corner ====

        // top edge
        if (cell.tr?.br) {
            /*DEBUG*/if (cell.rCorner.tr || cell.tr.rCorner.bl) { console.warn('overwrite warning!'); }
            cell.rCorner.tr = cell.tr.rCorner;
            cell.tr.rCorner.bl = cell.rCorner;
        } else if (cell.br?.tr?.tl) {
            /*DEBUG*/if (cell.rCorner.tr || cell.br.tr.tl.rCorner.bl) { console.warn('overwrite warning!'); }
            cell.rCorner.tr = cell.br.tr.tl.rCorner;
            cell.br.tr.tl.rCorner.bl = cell.rCorner;
        }

        // right edge
        if (cell.br?.tr) {
            /*DEBUG*/if (cell.rCorner.br || cell.br.rCorner.tl) { console.warn('overwrite warning!'); }
            cell.rCorner.br = cell.br.rCorner;
            cell.br.rCorner.tl = cell.rCorner;
        } else if (cell.tr?.br?.bl) {
            /*DEBUG*/if (cell.rCorner.br || cell.tr.br.bl.rCorner.tl) { console.warn('overwrite warning!'); }
            cell.rCorner.br = cell.tr.br.bl.rCorner;
            cell.tr.br.bl.rCorner.tl = cell.rCorner;
        }

        // kind
        if (cell.tr && cell.br) {
            if (cell.tr.br && cell.br.tr) {
                if (cell.tr.br !== cell.br.tr) { throw new Error('degenerate face'); }
                if (hasNoDuplicates([...cell.meetings, ...cell.tr.br.meetings])) {
                    cell.rCorner.kind = 'internal';
                } else {
                    cell.rCorner.kind = 'point-hole';
                }
            } else if (cell.tr.br) {
                cell.rCorner.kind = 'b-boundary';
            } else if (cell.br.tr) {
                cell.rCorner.kind = 't-boundary';
            } else {
                cell.rCorner.kind = 'any-boundary';
            }
        } else if (cell.tr?.br || cell.br?.tr) {
            cell.rCorner.kind = 'any-boundary';
        } else {
            cell.rCorner.kind = 'none-boundary';
        }

        // ==== top-left corner ====
        if (cell.tr && !cell.tl && !cell.tr.tl?.bl) {
            const kind = cell.tr.tl ? 'any-boundary' : 'none-boundary';
            const tl: Corner = { ...empty(corners.length), kind, cell };
            corners.push(tl);
            tl.br = cell.rCorner;
            cell.rCorner.tl = tl;
            if (cell.tr.tl) {
                tl.tr = cell.tr.tl.rCorner;
                cell.tr.tl.rCorner.bl = tl;
            }
        }

        // ==== bottom-right corner ====
        if (cell.br && !cell.bl && !cell.br.bl) {
            const br: Corner = { ...empty(corners.length), kind: 'none-boundary', cell };
            corners.push(br);
            br.tr = cell.rCorner;
            cell.rCorner.bl = br;
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
    const brChords = corners.flatMap(c => mkEffectiveChord(c, 'br'));
    const trChords = corners.flatMap(c => mkEffectiveChord(c, 'tr'));

    const conflicts = brChords.map(h => trChords.flatMap((v, i) => hasConflict(h, v) ? [i] : []));
    const [hMask, vMask] = bipartiteMis(v => conflicts[v]!, brChords.length, trChords.length);

    return [...brChords.filter((_, i) => hMask.get(i) === 1), ...trChords.filter((_, i) => vMask.get(i) === 1)];
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

const hasConflict = (br: EffectiveChord, tr: EffectiveChord) => {
    const atEnds = (br.start.id === tr.start.id && hasConflictingEnds(br.start, 'tr-br'))
        || (br.start.id === tr.end.id && hasConflictingEnds(br.start, 'br-bl'))
        || (br.end.id === tr.start.id && hasConflictingEnds(br.end, 'tl-tr'))
        || (br.end.id === tr.end.id && hasConflictingEnds(br.end, 'bl-tl'))
    const inBetween = !hasNoDuplicates([...innerNodes(br), ...innerNodes(tr)].map(c => c.id));
    return atEnds || inBetween;
}

const hasConflictingEnds = (c: Corner, pattern: 'tl-tr' | 'tr-br' | 'br-bl' | 'bl-tl') => matchString(c.kind, {
    incomplete: () => { throw new Error(`incomplete corner ${c} in effective chord`) },
    internal: () => { throw new Error(`internal corner ${c} cannot have conflicting chords`) },
    cut: () => { throw new Error(`cut corner ${c} cannot have conflicting chords`) },
    "none-boundary": () => { throw new Error(`convex corner ${c} cannot have conflicting chords`) },
    "any-boundary": () => true,
    "point-hole": () => true,
    "t-boundary": () => pattern !== 'br-bl',
    "b-boundary": () => pattern !== 'tl-tr',
});

const innerNodes = (c: EffectiveChord) => [...unfold(c.start, cur => {
    const next = cur[c.dir];
    return next && next.id === c.end.id ? undefined : next;
})].slice(1);

const cut = (originals: Cell[], cells: Cell[], from: Corner, dir: Direction) => {
    const cutCell = (from: Cell, to: Cell, dir: Direction) =>
        cutGrid(cells[from.id]!, cells[to.id]!, dir);

    const to = from[dir];
    if (!to) { throw new Error(`impossible cut: »${from}« -> ${dir}`); }
    cutGrid(from, to, dir);

    const cell_ = originals[from.cell.id]!;

    if (cell_.rCorner.id === from.id) {
        matchString(dir, {
            tr: () => {
                if (cell_.tr?.br) { cutCell(cell_.tr, cell_.tr.br, 'br'); }
                else if (cell_.br?.tr?.tl) { cutCell(cell_.br.tr, cell_.br.tr.tl, 'tl'); }
                else { throw new Error(`missing cell connection ${from} -> ${dir}`); }
            },
            br: () => {
                if (cell_.br?.tr) { cutCell(cell_.br, cell_.br.tr, 'tr'); }
                else if (cell_.tr?.br?.bl) { cutCell(cell_.tr.br, cell_.tr.br.bl, 'bl'); }
                else { throw new Error(`missing cell connection ${from} -> ${dir}`); }
            },
            bl: () => cutGrid(from.cell, from.cell.br!, 'br'),
            tl: () => cutGrid(from.cell, from.cell.tr!, 'tr'),
        });
    } else { // from is a top (?) corner && from.cell.tl is undefined
        if (dir === 'tl' || dir === 'bl') { throw new Error(`cut along boundary »${from}« -> ${dir}`); }
        else if (dir === 'br') { cutGrid(from.cell, from.cell.tr!, 'tr'); }
        else if (dir === 'tr') { cutGrid(from.cell.tr!, from.cell.tr?.tl!, 'tl'); }
        else { assertExhaustive(dir); }
    }

    if (to.kind === 'internal') {
        to.kind = 'cut';
        cut(originals, cells, to, dir);
    }
}

const cutGrid = <T extends GridNode<T>>(from: T, to: T, dir: Direction) => matchString(dir, {
    tr: () => { from.tr = to.bl = undefined; },
    br: () => { from.br = to.tl = undefined; },
    bl: () => { from.bl = to.tr = undefined; },
    tl: () => { from.tl = to.br = undefined; },
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
    if (v.tr) { res.push('tr'); }
    if (v.br) { res.push('br'); }
    if (v.bl) { res.push('bl'); }
    if (v.tl) { res.push('tl'); }
    return res;
}

const select1 = (c: Corner): SimpleChord => {
    const options: Direction[] = [];
    if (c.kind === 'any-boundary') { options.push(...dirs(c)); }
    else {
        if (!c.tr) { options.push('bl'); }
        else if (!c.br) { options.push('tl'); }
        else if (!c.bl) { options.push('tr'); }
        else if (!c.tl) { options.push('br'); }
        else { throw new Error(`'select1' on degree 4 corner »${c}«`) }

        if (c.kind === 'b-boundary') {
            if (!c.tr) { options.push('tl'); }
            else if (!c.tl) { options.push('tr'); }
        } else if (c.kind === 't-boundary') {
            if (!c.bl) { options.push('br'); }
            else if (!c.br) { options.push('bl'); }
        }
    }
    const dir = options[Math.floor(random() * options.length)]!;
    return { start: c, dir };
};

const select2 = (c: Corner): SimpleChord[] => {
    const options: [Direction, Direction][] = [['bl', 'tr'], ['tl', 'br']];
    if (c.kind === 'b-boundary') { options.push(['tr', 'tl']); }
    if (c.kind === 't-boundary') { options.push(['bl', 'br']); }
    const [dir1, dir2] = options[Math.floor(random() * options.length)]!;
    return [{ start: c, dir: dir1 }, { start: c, dir: dir2 }];
};

const mkBlockCrossings = (originals: Cell[], cutIntoRects: Cell[]): BlockCrossings => {
    const bundles = DisjointSets(mergeBundles, () => nilBundle);

    const addToBundle = (bundleId: number, cell: Cell) => {
        if (!bundles.contains(cell.id)) { bundles.mkSet(cell.id, nilBundle); }
        bundles.union(bundleId, cell.id);
        return cell;
    }

    const place = (before: number, after: number) => {
        if (!bundles.sameSet(before, after)) {
            const bundle = bundles.get(before)!;
            bundle.placeBefore = _.union(bundle.placeBefore, [bundles.get(after)!.id]);
        }
    }

    cutIntoRects.filter(c => !c.tl && !c.bl).forEach(c => {
        const bundle: Bundle = { ...nilBundle, id: c.id };
        bundles.mkSet(c.id, bundle);
        let [i, j] = [c, c];
        while (i.tr) { i = addToBundle(bundle.id, i.tr); }
        while (j.br) { j = addToBundle(bundle.id, j.br); }
        bundles.get(c.id)!.bc = [i.lineIdx, c.lineIdx, j.lineIdx + 1];
        while (i.br) { i = addToBundle(bundle.id, i.br); }
        while (j.tr) { j = addToBundle(bundle.id, j.tr); }
    });

    cutIntoRects.forEach(c => {
        const orig = originals[c.id]!;
        if (!c.tl && orig.tl) { place(orig.tl.id, c.id); }
        if (!c.bl && orig.bl) { place(orig.bl.id, c.id); }
    });

    // This is a bit tricky:
    // We need "stable" topological sorting (i.e. connected components must remain in input order).
    const ids = bundles.values().map(b => b.id).sort((a, b) => b - a); // sort descending
    const ordered = topologicalSortWithDfs(ids, v => bundles.get(v)!.placeBefore);

    bundles.debug();

    return ordered.map(id => bundles.get(id)!.bc);
}

const nilBundle: Bundle = { id: -1, bc: [-1, -1, -1], placeBefore: [] };

const mergeBundles = (a: Bundle, b: Bundle): Bundle =>
    ({ ...(a.id === -1 ? b : a), placeBefore: _.union(a.placeBefore, b.placeBefore) });

const mkRealization = (story: Storyline, bcs: BlockCrossings, init: number[]): Realization => {
    console.log(`initial permutation is ${init}`)
    let perm = init;
    bcs.reverse();
    const sequences = story.meetings.map((meeting, i) => {
        const res: BlockCrossings = [];
        while (!supportsMeeting(perm, meeting)) {
            const bc = bcs.pop();
            console.log(`meeting ${meeting} (#${i}) does not fit ${perm} so we try bc ${bc}`)
            if (bc !== undefined) {
                perm = applyBc(perm, ...bc);
                res.push(bc);
            } else {
                throw new Error(`no more block crossings but meeting ${meeting} is unsupported by ${perm}`);
            }
        }
        return res;
    });
    return { initialPermutation: init, blockCrossings: sequences };
}

export const mkBundles = (story: Storyline, realized: Realization): Realization => {
    random = splitmix32(PRNG_SEED);
    const cells = mkCells(story, realized);
    const corners = mkCorners(cells);
    const snapshot = structuredClone(cells);
    mkEffectiveChords(corners).forEach(chord => cut(snapshot, cells, chord.start, chord.dir));
    mkSimpleChords(corners).forEach(chord => cut(snapshot, cells, chord.start, chord.dir));
    const bcs = mkBlockCrossings(snapshot, cells);
    console.log({ msg: "after bundling", bcs: structuredClone(bcs), story, cells })
    return mkRealization(story, structuredClone(bcs), realized.initialPermutation);
}
