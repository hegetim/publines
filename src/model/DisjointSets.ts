import { expand } from "./Util";

export interface DisjointSets<T> {
    readonly get: (key: number) => T | undefined,
    readonly mkSet: (key: number, value: T) => void,
    readonly union: (a: number, b: number) => T,
    readonly sameSet: (a: number, b: number) => boolean,
    readonly contains: (key: number) => boolean,
    readonly values: () => T[],
}

interface Entry<T> {
    pointer: number,
    rank: number,
    data: T,
}


export const DisjointSets = <T>(merger: (t1: T, t2: T) => T, zero: () => T): DisjointSets<T> => {
    const entries: Entry<T>[] = [];
    const nil = (): Entry<T> => ({ pointer: -1, rank: -1, data: zero() });

    const findSet = (i: number): number => {
        const e = entries[i]!;
        if (e.pointer >= 0 && e.pointer !== i) {
            e.pointer = findSet(e.pointer);
        }
        return e.pointer;
    }

    const contains = (k: number): boolean => k >= 0 && k < entries.length && findSet(k) !== -1;

    const sameSet = (a: number, b: number) => contains(a) && contains(b) && (findSet(a) === findSet(b));

    const get = (k: number) => entries[findSet(k)]?.data ?? undefined;

    const mkSet = (k: number, t: T) => {
        if (entries.length <= k) { expand(entries, k + 1, nil); }
        const entry = entries[k]!;
        entry.pointer = k;
        entry.rank = 0;
        entry.data = t;
    }

    const link = (a: number, b: number) => {
        if (a === b) { return a; }
        else {
            const [aa, bb] = [entries[a]!, entries[b]!];
            if (aa.rank > bb.rank) {
                bb.pointer = a;
                aa.data = merger(aa.data, bb.data);
                bb.data = zero();
                return a;
            } else {
                aa.pointer = b;
                bb.data = merger(bb.data, aa.data);
                aa.data = zero();
                if (aa.rank === bb.rank) { bb.rank += 1; }
                return b;
            }
        }
    }

    const union = (a: number, b: number) => entries[link(findSet(a), findSet(b))]?.data!;

    const values = () => entries.filter((e, i) => e.pointer === i).map(e => e.data)

    return { get, mkSet, union, sameSet, contains, values };
}
