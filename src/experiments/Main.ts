import _ from "lodash";
import { kBatches, publications, setupStorylines } from "./Datasets"
import { contenders } from "./Algorithms";
import { evaluateAll } from "./Evaluations";
import { Metrics } from "../model/Storyline";

export const run = async () => {
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
                const key = k as keyof Metrics;
                console.log(`${key}:\t${m[key].toFixed(2)}\t(${(beta[j]![key] * 100).toFixed(2)}%)`);
            }
        });
    });
}

run();
