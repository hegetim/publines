/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

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

export const bipartiteMis = (g: (v: number) => number[], a: number, b: number) => {
    const m = maxMatching(g, a, b);
    const res = mkMis(g, m, a);
    /* DEBUG */ assertIndependent(g, a, ...res);
    return res;
}
