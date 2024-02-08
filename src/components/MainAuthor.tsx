import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Author } from "../model/Metadata";
import _ from "lodash";

type FetchedAuthors = [string, Author][] | 'error'

export const MainAuthor = (props: {
    author: Author | undefined,
    setAuthor: (author: Author) => Promise<void> | void,
    fetchAuthors: (searchString: string) => Promise<FetchedAuthors>
}) => {
    const [isEditing, setEditing] = useState(props.author === undefined);
    const [searchString, setSearchString] = useState("");
    const [resultsList, setResultsList] = useState<FetchedAuthors>([]);

    const debouncedFetch = useCallback(
        _.debounce((s: string) => props.fetchAuthors(s).then(setResultsList), 250),
        [props.fetchAuthors, setResultsList]
    );

    const handleTyping = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const str = e.target.value;
        if (str !== '') { debouncedFetch(str); }
        setSearchString(str);
    }, [debouncedFetch, setSearchString]);

    const renderMain = () => {
        if (!isEditing && props.author) {
            return <React.Fragment>
                <span className="main-author-label">{props.author.name}</span>
                <div className="author-edit-btn" onClick={() => setEditing(true)}>edit</div>
            </React.Fragment>;
        } else {
            return <React.Fragment>
                <input className="author-name-input" type="search" value={searchString}
                    onChange={handleTyping} />
                <div className="author-results-container">
                    {resultsList === 'error' ?
                        <span className="author-results-error">could not search for authors</span> :
                        resultsList.map(([hint, author]) =>
                            <div className="author-result-item" key={author.id} title={hint}
                                onClick={() => { setEditing(false); props.setAuthor(author); }}>{hint}</div>
                        )
                    }
                </div>
            </React.Fragment>;
        }
    }

    return <div className="author-name-container">
        <span className="author-name-label">Main author:</span>
        {renderMain()}
    </div>;
}
