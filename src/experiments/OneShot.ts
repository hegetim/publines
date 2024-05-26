import { medianScmWithBundling, oneSidedWithBundling, twoSidedWithBundling } from "./Algorithms";
import { publications, setupStorylines } from "./Datasets";

export const run = async () => {
    const dataset = await publications();
    const ps = dataset.find(([id, _0]) => id === '06/6306')!;
    const s = setupStorylines(...ps)[0]![0]!;
    console.debug(JSON.stringify({ meetings: s.meetings }))
    console.debug(`size of story: ${s.authorIds.length}`);
    medianScmWithBundling.run(s);
    console.log("success (actually not)")
}

run();
