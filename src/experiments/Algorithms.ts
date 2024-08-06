/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { biSbcm } from "../model/BiSbcm";
import { mkBundles } from "../model/CrossingComplex";
import { biSbcmOld, greedySbcm } from "../model/GreedySbcm";
import { medianScm } from "../model/MedianScm";
import { oneSidedScm } from "../model/OneSided";
import { Realization, Storyline } from "../model/Storyline";
import { twoSidedScm } from "../model/TwoSided";

export interface Contender {
    readonly run: (s: Storyline) => Realization,
    description: string,
}

const withBundling = (c: Contender): Contender => ({
    run: (s: Storyline) => mkBundles(s, c.run(s))[0],
    description: `${c.description}+bundling`,
});

export const oneSidedWithBundling = withBundling({ run: (s: Storyline) => oneSidedScm(s), description: "osScm" });
export const twoSidedWithBundling = withBundling({ run: (s: Storyline) => twoSidedScm(s), description: "tsScm" });
export const oldGreedySbcm: Contender =
    { run: (s: Storyline) => greedySbcm(s, Math.max(6, s.authorIds.length / 2)), description: "oldGreedySbcm" };
export const oldGreedySbcmWithBundling = withBundling(oldGreedySbcm);
export const bidirectionalSbcm: Contender = { run: (s: Storyline) => biSbcm(s), description: "bidiSbcm" };
export const bidirectionalSbcmWithBundling = withBundling(bidirectionalSbcm);
export const bidirectionalOldGreedySbcm: Contender =
    { run: (s: Storyline) => biSbcmOld(s), description: "bidiOldGreedySbcm" }
export const bidiOldGreedySbcmWithBundling = withBundling(bidirectionalOldGreedySbcm);
export const medianScmWithBundling = withBundling({ run: (s: Storyline) => medianScm(s), description: "medianScm" });

export const contenders: Contender[] = [
    oneSidedWithBundling,
    twoSidedWithBundling,
    medianScmWithBundling,
    // oldGreedySbcm,
    // oldGreedySbcmWithBundling,
    // bidirectionalOldGreedySbcm,
    // bidiOldGreedySbcmWithBundling,
    bidirectionalSbcm,
    // bidirectionalSbcmWithBundling,
]
