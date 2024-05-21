import { oneSidedWithBundling, twoSidedWithBundling } from "./Algorithms";
import { publications, setupStorylines } from "./Datasets";

export const run = async () => {
    const dataset = await publications();
    const ps = dataset.find(([id, _0]) => id === '38/5614')!;
    const s = setupStorylines(...ps)[0]![3]!;
    console.debug(JSON.stringify({ meetings: s.meetings }))
    console.debug(`size of story: ${s.authorIds.length}`);
    oneSidedWithBundling.run(s);
    console.log("success (actually not)")
}
