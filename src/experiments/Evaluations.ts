/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash";
import { bundleNumber } from "../model/CrossingComplex";
import { Realization, Storyline, calcMetrics, Metrics as BaseMetrics } from "../model/Storyline";
import { matchString } from "../model/Util";

export type Metrics = BaseMetrics & { bundleNumber: number };

export const evaluateOne = (story: Storyline, real: Realization): Metrics => {
    const metrics = calcMetrics(real);
    const bNumber = bundleNumber(story, real);
    return { ...metrics, bundleNumber: bNumber };
}

const best = (ms: Metrics[], d: keyof Metrics) => matchString(d, {
    crossings: () => Math.min(...ms.map(m => m[d])),
    blockCrossings: () => Math.min(...ms.map(m => m[d])),
    passages: () => Math.min(...ms.map(m => m[d])),
    bundleNumber: () => Math.min(...ms.map(m => m[d])),
});

type MetaMetrics = { [key in keyof Metrics]: number[] };

export const metaMetrics = (all: Metrics[]) => {
    const some = all[0]!;
    const result: { [key in keyof Metrics]?: (0 | 1)[] } = {};
    for (const k of Object.keys(some)) {
        const key = k as keyof Metrics;
        const opt = best(all, key);
        result[key] = all.map(m => m[key] === opt ? 1 : 0)
    }
    return result as MetaMetrics;
}

export const evaluateStory = (story: Storyline, reals: Realization[]) => {
    const metrics = reals.map(real => evaluateOne(story, real));
    const meta = metaMetrics(metrics);
    return [metrics, meta] as const;
}

const combineMetrics = (ms: Metrics[]) => {
    const some = ms[0]!;
    const avgMetrics: { [key in keyof Metrics]?: number } = {};
    for (const k of Object.keys(some)) {
        const key = k as keyof Metrics;
        avgMetrics[key] = _.sum(ms.map(m => m[key])) / ms.length;
    }
    return avgMetrics as Metrics;
}

const combineMetaMetrics = (mms: MetaMetrics[], n: number) => {
    const some = mms[0]!;
    const accMetaMetrics: { [key in keyof Metrics]?: number }[] = Array.from({ length: n }, () => ({}));
    for (const k of Object.keys(some)) {
        const key = k as keyof Metrics;
        _.range(0, n).map(i => accMetaMetrics[i]![key] = _.sum(mms.map(m => m[key][i])) / mms.length);
    }
    return accMetaMetrics as Metrics[];
}

export const accumulate = (all: (readonly [Metrics[], MetaMetrics])[], n: number) => {
    const [ms, mms] = [all.map(m => m[0]), all.map(m => m[1])];
    const avgMetrics = _.unzip(ms).map(m => combineMetrics(m));
    const betaMetrics = combineMetaMetrics(mms, n);
    return [avgMetrics, betaMetrics] as const;
}

export const evaluateAll = (all: (readonly [Storyline, Realization[]])[], n: number) =>
    accumulate(all.map(args => evaluateStory(...args)), n)
