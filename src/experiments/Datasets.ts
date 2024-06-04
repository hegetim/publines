import { loadPublications, parsePublications } from "../model/Dblp"
import { Publication, mkFilter } from "../model/Metadata";
import { Storyline, mkStoryline } from "../model/Storyline";
import { authorIds } from "./AuthorIds";
import { useCache } from "./IO";

type PubData = (readonly [string, Publication[]])[]

const fetchPublications = async (authorIds: string[]) => {
    const res: PubData = [];
    for (const a of authorIds) {
        const result = await loadPublications(a);
        if (result === 'error' || result === 'not_ok') { console.log(`${result}: could not load publications for ${a}`); }
        else {
            const parsed = parsePublications(result.raw);
            if (parsed === 'error') { console.log(`could not parse publications for ${a}:\n${result.raw}`); }
            else { res.push([a, parsed] as const); }
        }
        console.log(`successfully fetched ${a}`)
    }
    return res;
}

export const publications = async () => useCache<PubData>('publications.json', () => fetchPublications(authorIds));

const filterPast10Years = (ps: Publication[]) => mkFilter("none", { fromIncl: 2014, toIncl: 2024 })(ps);

export const setupStoryline = (ps: Publication[], p: string, limit: number) =>
    mkStoryline(filterPast10Years(ps), { id: p, name: `Fake Author ${p}` }, limit)[0];

const checkLimit = (story: Storyline, limit: number) => story.authorIds.length === limit + 1;

export const kBatches = [5, 10, 15, 20];

export const setupStorylines = (p: string, ps: Publication[]) => {
    const result: Storyline[] = [];
    for (const limit of kBatches) {
        const story = setupStoryline(ps, p, limit);
        if (checkLimit(story, limit)) { result.push(story); }
        else {
            console.log(`discarded ${p} because they had fewer than ${limit} coauthors`);
            return [];
        }
    }
    return [result];
}
