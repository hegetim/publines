import { biSbcm } from "../model/BiSbcm";
import { mkBundles } from "../model/CrossingComplex";
import { greedySbcm } from "../model/GreedySbcm";
import { oneSidedScm } from "../model/OneSided";
import { Realization, Storyline } from "../model/Storyline";
import { twoSidedScm } from "../model/TwoSided";

export interface Contender {
    readonly run: (s: Storyline) => Realization,
    description: string,
}

const withBundling = (c: Contender): Contender => ({
    run: (s: Storyline) => mkBundles(s, c.run(s)),
    description: `${c.description}+bundling`,
});

export const oneSidedWithBundling: Contender =
    withBundling({ run: (s: Storyline) => oneSidedScm(s), description: "osScm" });
export const twoSidedWithBundling: Contender =
    withBundling({ run: (s: Storyline) => twoSidedScm(s), description: "tsScm" });
export const oldGreedySbcm: Contender =
    { run: (s: Storyline) => greedySbcm(s, Math.max(6, s.authorIds.length / 2)), description: "oldGreedySbcm" };
export const oldGreedySbcmWithBundling = withBundling(oldGreedySbcm);
export const bidirectionalSbcm: Contender =
    { run: (s: Storyline) => biSbcm(s), description: "bidiSbcm" };
export const bidirectionalSbcmWithBundling = withBundling(bidirectionalSbcm);
// todo barycenterScmWithBundling

export const contenders: Contender[] = [
    oneSidedWithBundling,
    twoSidedWithBundling,
    oldGreedySbcm,
    oldGreedySbcmWithBundling,
    bidirectionalSbcm,
    bidirectionalSbcmWithBundling,
]
