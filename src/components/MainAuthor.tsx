import React, { useCallback, useState } from "react";
import { Author } from "../model/Metadata";
import "./MainAuthor.css"
import _ from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil } from "@fortawesome/free-solid-svg-icons";
import { assertExhaustive, cls } from "../model/Util";

type FetchedAuthors = [string, Author][] | 'error' | 'init';

export const MainAuthor = (props: {
    author: Author | undefined,
    setAuthor: (author: Author) => Promise<void> | void,
    fetchAuthors: (searchString: string) => Promise<FetchedAuthors>
}) => {
    const [isEditing, setEditing] = useState(props.author === undefined);
    const [searchString, setSearchString] = useState("");
    const [resultsList, setResultsList] = useState<FetchedAuthors>('init');

    const debouncedFetch = useCallback(
        _.debounce((s: string) => props.fetchAuthors(s).then(setResultsList), 250),
        [props.fetchAuthors, setResultsList]
    );

    const handleTyping = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const str = e.target.value;
        if (str !== '') { debouncedFetch(str); }
        setSearchString(str);
    }, [debouncedFetch, setSearchString]);

    const mkResultsList = () => {
        if (resultsList === 'error') {
            return <span className="author-results-error">could not search for authors</span>;
        } else if (resultsList === 'init') { return ""; }
        else if (resultsList.length === 0) {
            return <span className="author-results-empty">no results found</span>;
        } else if (resultsList) {
            return resultsList.map(([hint, author]) =>
                <div className="author-result-item" key={author.id} title={hint}
                    onClick={() => { setEditing(false); props.setAuthor(author); }}>{hint}</div>
            );
        } else { return assertExhaustive(resultsList); }
    };

    const renderMain = () => {
        if (!isEditing && props.author) {
            return <div className="author-name-ready">
                <span className="main-author-label">{props.author.name}</span>
                <div className="author-edit-btn" onClick={() => setEditing(true)}>
                    <FontAwesomeIcon icon={faPencil} />
                </div>
            </div>;
        } else {
            return <React.Fragment>
                <input className="author-name-input" type="search" value={searchString}
                    onChange={handleTyping} />
                <div {...cls("author-results-container", {
                    'author-results-empty': !(_.isArray(resultsList) && resultsList.length > 0)
                })}> {mkResultsList()} </div>
            </React.Fragment>;
        }
    }

    return <div className="author-name-container">
        <span className="author-name-label">Main author:</span>
        {renderMain()}
    </div>;
}
