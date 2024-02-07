import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Author } from "../model/Metadata";
import _ from "lodash";

type FetchedAuthors = [string, Author][] | 'error'

export const MainAuthor = (props: {
    author: Author | undefined,
    setAuthor: (author: Author) => void,
    fetchAuthors: (searchString: string) => Promise<FetchedAuthors>
}) => {
    const [isEditing, setEditing] = useState(props.author === undefined);
    const [searchString, setSearchString] = useState("");
    const [resultsList, setResultsList] = useState<FetchedAuthors>([]);

    const debouncedFetch = useCallback(
        _.debounce((s: string) => props.fetchAuthors(s).then(setResultsList), 250),
        [props.fetchAuthors, setResultsList]
    );

    useEffect(() => {
        if (searchString !== '') { debouncedFetch(searchString); }
    }, [debouncedFetch, searchString]);

    const renderMain = () => {
        if (!isEditing && props.author) {
            return <React.Fragment>
                <span className="main-author-label">{props.author.name}</span>
                <div className="author-edit-btn" onClick={() => setEditing(true)}>edit</div>
            </React.Fragment>;
        } else {
            return <React.Fragment>
                <input className="author-name-input" type="search" value={searchString}
                    onChange={e => setSearchString(e.target.value)} />
                <div className="author-results-container">
                    {renderResults(resultsList, s => { setEditing(false); props.setAuthor(s); })}
                </div>
            </React.Fragment>;
        }
    }

    return <div className="author-name-container">
        <span className="author-name-label">Main author:</span>
        {renderMain()}
    </div>;
}

const renderResults = (resultsList: FetchedAuthors, setAuthor: (author: Author) => void) => {
    if (resultsList === 'error') {
        return <span className="author-results-error">could not search for authors</span>;
    } else {
        return resultsList.map(([hint, author]) =>
            <div className="author-result-item" key={author.id}
                onClick={() => setAuthor(author)} title={hint}>{hint}</div>
        );
    }
}
