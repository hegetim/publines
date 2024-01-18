import React from "react";
import { useState } from "react";
import { Author } from "../model/Metadata";

export const Settings = (

) => { }

type FetchedAuthors = [string, Author][] | 'error'

export const AuthorName = (props: {
    setAuthor: (author: Author) => void,
    fetchAuthors: (searchString: string) => Promise<FetchedAuthors>
}) => {
    const [searchString, setSearchString] = useState("");
    const [resultsList, setResultsList] = useState<FetchedAuthors>([]);

    const renderResults = () => {
        if (resultsList === 'error') {
            return <span className="author-results-error">could not search for authors</span>;
        } else {
            return resultsList.map(([hint, author]) =>
                <div className="author-result-item" key={author.id}
                    onClick={() => props.setAuthor(author)}>{hint}</div>
            );
        }
    }

    return <div className="author-name-container">
        <span className="author-name-label">Author name</span>
        <input className="author-name-input" type="search" value={searchString}
            onChange={e => setSearchString(e.target.value)} />
        <button className="author-name-submit"
            onClick={() => props.fetchAuthors(searchString).then(setResultsList)} >search</button>
        <div className="author-results-container">
            {renderResults()}
        </div>
    </div>;
}