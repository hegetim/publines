import { performance, PerformanceObserver } from "node:perf_hooks";
import { publications, setupStoryline } from "./Datasets";
import { Storyline } from "../model/Storyline";
import { contenders } from "./Algorithms";

const observer = new PerformanceObserver(entries => entries.getEntries().forEach(e =>
    console.log(`${e.name};${e.duration}`)
));

// prevent dead code elimination
const sink = <T>(t: T) => { if (Math.random() > Infinity) { console.log(t); } }

const repititions = 100;

const setup = async (k: number) => {
    performance.mark('setup-start');
    const dataset = await publications();
    const stories = dataset.map(([pid, publications]) => setupStoryline(publications, pid, k - 1));
    performance.mark('setup-end');
    performance.measure('setup;', 'setup-start', 'setup-end');
    return stories;
}

const warmup = (stories: Storyline[]) => {
    performance.mark('warmup-start');
    stories.forEach(story => contenders.forEach(algo => {
        const real = algo.run(story);
        sink(real);
    }));
    performance.mark('warmup-end');
    performance.measure('warmup;', 'warmup-start', 'warmup-end');
}

const benchmark = (stories: Storyline[]) => {
    stories.forEach(story => contenders.forEach(algo => {
        const tag = `${story.authorIds[0]};${algo.description}`;
        performance.mark(`${tag}-start`);
        for (let i = 0; i < repititions; i++) { sink(algo.run(story)); }
        performance.mark(`${tag}-end`);
        performance.measure(tag, `${tag}-start`, `${tag}-end`);
    }));
}

const run = async (k: number) => {
    observer.observe({ entryTypes: ['measure', 'node'] });
    const input = await setup(k);
    warmup(input);
    benchmark(input);
}

run(21);
