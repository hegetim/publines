import { expand } from "./Util";

export interface DisjointSets {
    get: (k: number) => number | undefined,
    mkSet: (k: number) => void,
    union: (a: number, b: number) => number,
    sameSet: (a: number, b: number) => boolean,
    contains: (k: number) => boolean,
}

interface Entry {
    pointer: number,
    rank: number,
}

const nil = (): Entry => ({ pointer: -1, rank: -1 });

export const DisjointSets = (): DisjointSets => {
    const entries: Entry[] = [];

    const findSet = (i: number): number => {
        const e = entries[i]!;
        if (e.pointer !== i) {
            e.pointer = findSet(e.pointer);
        }
        return e.pointer;
    }

    const contains = (k: number): boolean => k >= 0 && k < entries.length && findSet(k) !== -1;

    const sameSet = (a: number, b: number) => contains(a) && contains(b) && (findSet(a) === findSet(b));

    const get = (k: number) => contains(k) ? findSet(k) : undefined;

    const mkSet = (k: number) => {
        if (entries.length <= k) { expand(entries, k, nil); }
        const entry = entries[k]!;
        entry.pointer = k;
        entry.rank = 0;
    }

    const link = (a: number, b: number) => {
        if (a === b) { return a; }
        else {
            const [aa, bb] = [entries[a]!, entries[b]!];
            if (aa.rank > bb.rank) {
                bb.pointer = a;
                return a;
            } else {
                aa.pointer = b;
                return b;
            }
        }
    }

    const union = (a: number, b: number) => link(findSet(a), findSet(b));

    return { get, mkSet, union, sameSet, contains };
}
