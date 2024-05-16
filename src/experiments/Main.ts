import _ from "lodash";
import { kBatches, publications, setupStorylines } from "./Datasets"
import { contenders } from "./Algorithms";
import { evaluateAll } from "./Evaluations";
import { Metrics } from "../model/Storyline";

export const run = async () => {
    const dataset = await publications();
    const stories = _.unzip(dataset.flatMap(arg => setupStorylines(...arg))); // by coauthor number
    const reals = stories.map(ss => ss.map(s => contenders.map(c => c.run(s)))) // by coauthor number x protagonist
    const n = contenders.length;

    stories.forEach((stories, i) => {  // i: #coauthors idx
        console.log(`===> number of coauthors: ${kBatches[i]}`);
        const [avg, beta] = evaluateAll(stories.map((story, k) => [story, reals[i]![k]!] as const), n);
        contenders.forEach((contender, j) => {  // j: contender idx
            console.log(`--> ${contender.desciption}`);
            for (const k in Object.keys(avg[j]!)) {
                const key = k as keyof Metrics;
                console.log(`${key}:\t${avg[j]![key]}\t(${beta[j]![key] * 100}%)`);
            }
        });
    });
}
