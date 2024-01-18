import { Author, Publication } from "./Metadata";
import { as } from "./util";

interface DblpAuthorSearch {
    result: {
        status: { text: string },
        hits: { hit: DblpAuthorSearchHit[] }
    }
}

interface DblpAuthorSearchHit {
    info: {
        author: string,
        url: string,
        notes?: { note: { text: string } },
    }
}

export const findAuthor = async (name: string) => {
    const query = name.replaceAll(/\s+/g, '+').replaceAll('&', '');
    const target = new URL(`https://dblp.org/search/author/api?q=${query}&format=json&h=1000`);
    try {
        const response = await fetch(target);
        if (!response.ok) {
            console.warn(response);
            return 'not_ok';
        }
        return await response.json() as DblpAuthorSearch;
    } catch (err) {
        console.warn(err);
        return 'error';
    }
};

export const mkSuggestions = (search: DblpAuthorSearch): [string, Author][] => search.result.hits.hit.map(hit => {
    const hint = `${hit.info.author}${hit.info.notes ? ` (${hit.info.notes.note.text})` : ""}`;
    const id = (hit.info.url.match(/\w+\/[A-Za-z0-9_-]+$/) ?? [])[0];
    if (!id) {
        console.warn(`could not extract id from ${hit.info.url}`);
    }
    const author = as<Author>({ name: hit.info.author, id: id ?? "" });
    return [hint, author];
});

export const loadPublications = async (id: string) => {
    const target = new URL(`https://dblp.org/pid/${id}.xml`);
    try {
        const response = await fetch(target);
        if (!response.ok) {
            console.warn(response);
            return 'not_ok';
        }
        const xml = await response.text();
        return { raw: xml };
    } catch (err) {
        console.warn(err);
        return 'error';
    }
};

export const parsePublications = (raw: string) => {
    const doc = new DOMParser().parseFromString(raw, 'application/xml');
    const maybeError = doc.querySelector('parsererror');
    if (maybeError) {
        console.warn(maybeError.textContent);
        return 'error';
    }
    const rs = doc.querySelectorAll("r");
    let res: Publication[] = [];
    for (const node of rs) {
        const entry = node.firstChild!;
        const tpe = entry.nodeName.toLowerCase();
        if (tpe === "article" || tpe === "inproceedings" || tpe === "incollection" || tpe === "book" || tpe === "phdthesis") {
            const informal = !!node.querySelector('*[publtype*="informal"]');
            const url = new URL(`https://dblp.org/${node.querySelector('* url')?.textContent}`);
            const year = Number.parseInt(node.querySelector('* year')?.textContent ?? "-1");
            // todo parse bibliographic information like pages, journal, volume, booktitle, ...
            const title = node.querySelector('* title')?.textContent ?? "untitled";
            let authors: Author[] = [];
            for (const elem of node.querySelectorAll('* author')) {
                const pid = elem.getAttribute('pid');
                if (pid !== null) {
                    authors.push({ id: pid, name: elem.textContent ?? "" });
                }
            }
            res.push({ title, authors, year, url, informal, published: tpe });
        } // ignore publications of types "proceedings", "masterthesis", "www"
    }
    return res;
};

/*
Publication records are inspired by the BibTeX syntax and are given by one of the following elements:
    article – An article from a journal or magazine.
    inproceedings – A paper in a conference or workshop proceedings.
    proceedings – The proceedings volume of a conference or workshop.
    book – An authored monograph or an edited collection of articles.
    incollection – A part or chapter in a monograph.
    phdthesis – A PhD thesis.
    mastersthesis – A Master's thesis. There are only very few Master's theses in dblp.
    www – A web page. There are only very few web pages in dblp. See also the notes on person records.
*/