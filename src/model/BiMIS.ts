import _ from "lodash";
import BitSet from "bitset";

/// based on https://cp-algorithms.com/graph/kuhn_maximum_bipartite_matching.html
const maxMatching = (g: (v: number) => number[], a: number, b: number) => {
    const matching = Array.from({ length: b }, () => -1);
    const used = new BitSet();

    const step = (v: number) => {
        if (used.get(v)) { return false; }
        used.set(v, 1);
        for (const to of g(v)) {
            if (matching[to] === -1 || step(matching[to]!)) {
                matching[to] = v;
                return true;
            }
        }
        return false;
    }

    _.range(0, a).forEach(v => {
        used.clear();
        step(v);
    })

    return matching;
}

const mkMis = (g: (v: number) => number[], matching: number[], a: number): [BitSet, BitSet] => {
    const isa = new BitSet();
    isa.flip();
    matching.forEach(v => {
        if (v > -1) {
            isa.set(v, 0)
        }
    });

    const isb = new BitSet();
    isb.flip();

    const check = (v: number) => {
        if (isa.get(v) === 1) {
            g(v).forEach(w => {
                if (isb.get(w) === 1) {
                    isb.set(w, 0);
                    if (matching[w] !== -1) {
                        isa.set(matching[w]!, 1);
                        check(matching[w]!);
                    }
                }
            });
        }
    }

    _.range(0, a).forEach(check);

    return [isa, isb];
}

const assertIndependent = (g: (v: number) => number[], a: number, isa: BitSet, isb: BitSet) => {
    _.range(0, a).forEach(v => {
        if (isa.get(v) === 1) {
            g(v).forEach(w => {
                if (isb.get(w) === 1) {
                    throw new Error(`${v} and ${w} are not independent`)
                }
            });
        }
    });
}

export const testMIS = () => {
    // const test = [[1, 2], [], [0, 3], [2], [2, 3], [4]];
    const test = [[0, 1, 3], [0, 1, 3, 4], [2], [2], [1, 2, 3, 4]];
    const g = (v: number) => test[v]!
    const [a, b] = [5, 5]
    const m = maxMatching(g, a, b);
    const [isa, isb] = mkMis(g, m, a);
    assertIndependent(g, a, isa, isb);

    const mis: number[] = [];
    _.range(0, a).forEach(i => { if (isa.get(i)) { mis.push(i + 1) } })
    _.range(0, b).forEach(i => { if (isb.get(i)) { mis.push(i + a + 1) } })
    console.log(mis);
}
