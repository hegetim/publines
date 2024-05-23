import { bidirectionalSbcmWithBundling, oneSidedWithBundling, twoSidedWithBundling } from "./Algorithms";
import { publications, setupStorylines } from "./Datasets";

export const run = async () => {
    const dataset = await publications();
    const ps = dataset.find(([id, _0]) => id === '09/2980')!;
    const s = setupStorylines(...ps)[0]![1]!;
    console.debug(JSON.stringify({ meetings: s.meetings }))
    console.debug(`size of story: ${s.authorIds.length}`);
    bidirectionalSbcmWithBundling.run(s);
    console.log("success (actually not)")
}

run();
