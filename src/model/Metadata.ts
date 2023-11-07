export interface Author {
    name: string,
    id: string,
}

export interface AuthorSearchHit {
    author: Author,
    description: string,
}

export interface Publication {
    title: string,
    authors: Author[],
    published: string,
    year: number,
    url: URL,
    informal: boolean,
}


