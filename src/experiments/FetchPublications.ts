import { loadPublications, parsePublications } from "../model/Dblp"
import { Publication } from "../model/Metadata";

export const fetchPublications = async (authorIds: string[]) => {
    const res: (readonly [string, Publication[]])[] = [];
    for (const a of authorIds) {
        const result = await loadPublications(a);
        if (result === 'error' || result === 'not_ok') { console.log(`${result}: could not load publications for ${a}`); }
        else {
            const parsed = parsePublications(result.raw);
            if (parsed === 'error') { console.log(`could not parse publications for ${a}:\n${result.raw}`); }
            else { res.push([a, parsed] as const); }
        }
    }
    return res;
}
