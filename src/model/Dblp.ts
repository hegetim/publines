/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash";
import { Author, BibMeta, Publication } from "./Metadata";
import { as, matchString } from "./Util";
import { parseXml } from "./XmlUtils";

interface DblpAuthorSearch {
    result: {
        status: { text: string },
        hits: { hit?: DblpAuthorSearchHit[] }
    }
}

interface DblpAuthorSearchHit {
    info: {
        author: string,
        url: string,
        notes?: { note: any },
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

const parseNotes = (note: any) => {
    if (note) {
        if (_.isArray(note)) { return note[0].text as string | undefined; }
        else { return note.text as string | undefined; }
    }
    return undefined;
}

export const mkSuggestions = (search: DblpAuthorSearch): [string, Author][] => {
    if (search.result.hits.hit) {
        return search.result.hits.hit.map(hit => {
            const hint = `${hit.info.author}${hit.info.notes ? ` (${parseNotes(hit.info.notes.note)})` : ""}`;
            const id = (hit.info.url.match(/\w+\/[A-Za-z0-9_-]+$/) ?? [])[0];
            if (!id) {
                console.warn(`could not extract id from ${hit.info.url}`);
            }
            const author = as<Author>({ name: hit.info.author, id: id ?? "" });
            return [hint, author];
        });
    } else {
        console.log(search);
        return [];
    }
}

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
    const doc = parseXml(raw);
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
        if (tpe === "article" || tpe === "inproceedings" || tpe === "incollection" || tpe === "phdthesis") {
            const informal = !!node.querySelector('*[publtype*="informal"]');
            const url = new URL(`https://dblp.org/${node.querySelector('* url')?.textContent}`);
            const year = Number.parseInt(node.querySelector('* year')?.textContent ?? "NaN");
            // todo parse bibliographic information like pages, journal, volume, booktitle, ...
            const title = node.querySelector('* title')?.textContent ?? "untitled";
            let authors: Author[] = [];
            for (const elem of node.querySelectorAll('* author')) {
                const pid = elem.getAttribute('pid');
                if (pid !== null) {
                    authors.push({ id: pid, name: elem.textContent ?? "" });
                }
            }
            res.push({ title, authors, year, url, informal, metadata: parseBibMeta(node, tpe) });
        } // ignore publications of types "proceedings", "masterthesis", "www", "book"
    }
    return res;
};

const parseBibMeta = (r: Element, tpe: BibMeta['kind']): BibMeta => {
    const pages = parsePages(r.querySelector('* pages')?.textContent);
    const link = parseLink(r.querySelector('* ee')?.textContent);
    const journal = r.querySelector('* journal')?.textContent;
    const volume = r.querySelector('* volume')?.textContent;
    const number = Number.parseInt(r.querySelector('* number')?.textContent ?? "NaN");
    const booktitle = r.querySelector('* booktitle')?.textContent;
    const school = r.querySelector('* school')?.textContent;
    return matchString(tpe, {
        article: () => {
            if (journal && volume) {
                return { kind: 'article', journal, volume, number: number ? number : undefined, pages, link };
            } else { return parseBibMeta(r, 'incomplete'); }
        },
        incollection: () => {
            if (booktitle) { return { kind: 'incollection', booktitle, pages, link }; }
            else { return parseBibMeta(r, 'incomplete'); }
        },
        inproceedings: () => {
            if (booktitle) { return { kind: 'inproceedings', booktitle, pages, link }; }
            else { return parseBibMeta(r, 'incomplete'); }
        },
        masterthesis: () => {
            if (school) { return { kind: 'masterthesis', school, pages, link }; }
            else { return parseBibMeta(r, 'incomplete'); }
        },
        phdthesis: () => {
            if (school) { return { kind: 'masterthesis', school, pages, link }; }
            else { return parseBibMeta(r, 'incomplete'); }
        },
        incomplete: () => {
            return { kind: 'incomplete', desc: tpe, link, pages: undefined };
        },
    });
}

const parsePages = (raw: string | null | undefined): BibMeta['pages'] => {
    if (raw === null || raw === undefined) {
        return undefined;
    } else {
        const matches = raw.match(/^([\d:]+)-([\d:]+)$/);
        if (matches && matches.length === 3) {
            const from = matches[1]!;
            const to = matches[2]!;
            if (from !== to) {
                return { from, to };
            } else {
                return from;
            }
        }
        return raw;
    }
}

const parseLink = (raw: string | null | undefined): BibMeta['link'] => {
    if (!raw) { return undefined; }
    try {
        return new URL(raw);
    } catch (_ignored) {
        return undefined;
    }
}

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
