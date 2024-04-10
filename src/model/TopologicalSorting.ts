import BitSet from "bitset";

export class CycleDetected extends Error {
    constructor(msg?: string) {
        super(msg);
        this.name = (this as Object).constructor.name;
    }
}

export const topoSortDfs = (ids: number[], neighbors: (v: number) => number[]) => {
    const [visited, finished] = [new BitSet(), new BitSet()];
    const result: number[] = [];

    const visit = (v: number) => {
        if (finished.get(v) !== 1) {
            if (visited.get(v) === 1) { throw new CycleDetected(`cycle contains node ${v}`); }
            visited.set(v, 1);
            neighbors(v).forEach(u => visit(u));
            finished.set(v, 1);
            result.push(v)
            console.log(`visited ${v}`)
        }
    }

    ids.forEach(v => visit(v));
    return result.reverse();
}
