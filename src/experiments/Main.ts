/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash";
import { kBatches, publications, setupStoryline, setupStorylines } from "./Datasets"
import { Contender, bidirectionalSbcm, bidirectionalSbcmWithBundling, contenders, medianScmWithBundling, oneSidedWithBundling, twoSidedWithBundling } from "./Algorithms";
import { evaluateAll, evaluateOne, Metrics as EvaluationMetrics } from "./Evaluations";

export const runAggregate = async () => {
    const dataset = await publications();
    const stories = _.unzip(dataset.flatMap(arg => setupStorylines(...arg))); // by coauthor number
    const reals = stories.map(ss => ss.map(s => contenders.map(c => {
        console.debug(`[${s.authorIds.length - 1}] p=${s.authorIds[0]} ${c.description}`)
        return c.run(s);
    }))); // by coauthor number x protagonist
    const n = contenders.length;

    stories.forEach((stories, i) => {  // i: #coauthors idx
        console.log(`===> number of coauthors: ${kBatches[i]}`);
        const [avg, beta] = evaluateAll(stories.map((story, k) => [story, reals[i]![k]!] as const), n);
        contenders.forEach((contender, j) => {  // j: contender idx
            console.log(`--> ${contender.description}`);
            const m = avg[j]!;
            for (const k of Object.keys(m)) {
                const key = k as keyof EvaluationMetrics;
                console.log(`${key},${m[key].toFixed(2)},${(beta[j]![key] * 100).toFixed(2)}%`);
            }
        });
    });
}

export const runCompare = async (k: number, cs: readonly Contender[], metric: keyof EvaluationMetrics) => {
    const dataset = await publications();
    const stories = dataset.map(([pid, publications]) => setupStoryline(publications, pid, k - 1));
    console.log(`==== ${metric}, k=${k} ====`);
    console.log(`protagonist,${cs.map(c => c.description)}`);
    stories.forEach(story => {
        const reals = cs.map(c => c.run(story));
        const metrics = reals.map(real => evaluateOne(story, real)[metric]);
        console.log(`${story.authorIds[0]},${metrics.map(m => m.toFixed(0))}`);
    })
}

export const runDatasetSpec = async () => {
    const dataset = await publications();
    console.log(`==== Size of the Storyline ====`);
    console.log(`protagonist,#publications`);
    dataset.forEach(([pid, publications]) =>
        console.log(`${pid},${setupStoryline(publications, pid, 20).meetings.length}`)
    );
}

const allMetrics: (keyof EvaluationMetrics)[] = ['crossings', 'blockCrossings', 'passages', 'bundleNumber'];

export const runOneAlgo = async (k: number, algo: Contender) => {
    const dataset = await publications();
    const stories = dataset.map(([pid, publications]) => setupStoryline(publications, pid, k - 1));
    console.log(`==== ${algo.description}, k=${k} ====`);
    console.log(`protagonist,${allMetrics}`);
    stories.forEach(story => {
        const metrics = evaluateOne(story, algo.run(story));
        console.log(`${story.authorIds[0]},${allMetrics.map(key => metrics[key])}`);
    })

}

// runDatasetSpec();

// runCompare(21, [oneSidedWithBundling, twoSidedWithBundling, bidirectionalSbcm, medianScmWithBundling], 'crossings');
// runCompare(21, [oneSidedWithBundling, twoSidedWithBundling, bidirectionalSbcm, medianScmWithBundling], 'blockCrossings');
// runCompare(21, [oneSidedWithBundling, twoSidedWithBundling, bidirectionalSbcm, medianScmWithBundling], 'passages');

runAggregate();

// runOneAlgo(6, twoSidedWithBundling);
// runOneAlgo(11, twoSidedWithBundling);
// runOneAlgo(16, twoSidedWithBundling);
// runOneAlgo(6, oneSidedWithBundling);
// runOneAlgo(11, oneSidedWithBundling);
// runOneAlgo(16, oneSidedWithBundling);
// runOneAlgo(6, medianScmWithBundling);
// runOneAlgo(11, medianScmWithBundling);
// runOneAlgo(16, medianScmWithBundling);

// runCompare(6, [bidirectionalSbcm, bidirectionalSbcmWithBundling], "blockCrossings");
// runCompare(11, [bidirectionalSbcm, bidirectionalSbcmWithBundling], "blockCrossings");
// runCompare(16, [bidirectionalSbcm, bidirectionalSbcmWithBundling], "blockCrossings");
// runCompare(21, [bidirectionalSbcm, bidirectionalSbcmWithBundling], "blockCrossings");
