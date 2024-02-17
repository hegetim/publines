import React, { useCallback, useState } from 'react';
import './App.css';
import _ from 'lodash';
import * as Dblp from '../model/Dblp';
import { Author, Publication } from '../model/Metadata';
import { MainAuthor } from './MainAuthor';
import { StorylineComponent } from './StorylineComponent';
import { configDefaults } from '../model/UserConfig';
import { Settings } from './Settings';

const App = () => {
    const [config, setConfig] = useState(configDefaults);
    const [mainAuthor, setMainAuthor] = useState<Author | undefined>();
    const [publications, setPublications] = useState<Publication[] | 'error' | undefined>();

    const handleAuthorChanged = useCallback(async (author: Author) => {
        const fetched = await Dblp.loadPublications(author.id);
        if (fetched === 'error' || fetched === 'not_ok') {
            setPublications('error');
        } else {
            let parsed: Publication[] | 'error' = Dblp.parsePublications(fetched.raw);
            if (parsed !== 'error') { parsed = _.sortBy(parsed, p => p.year); }
            setPublications(parsed);
        }
        setMainAuthor(author);
    }, [setPublications, setMainAuthor]);

    const renderPublications = () => {
        if (!publications || !mainAuthor) {
            return [];
        } else if (publications === 'error') {
            return <span className='story-main-error'>Could not load publications</span>;
        } else if (publications.length === 0) {
            return <span className='story-main-empty'>{`${mainAuthor} has no publications`}</span>;
        } else {
            return <StorylineComponent config={config} protagonist={mainAuthor} publications={publications} />
        }
    }

    return (
        <div className="App" >
            <h1>Publines</h1>
            <p className='intro-par'>Visualize joint publications with your coauthors over time.</p>
            <MainAuthor author={mainAuthor} setAuthor={handleAuthorChanged} fetchAuthors={fetchAuthors} />
            <Settings config={config} updateConfig={setConfig} />
            {renderPublications()}
        </div >
    );
}

const fetchAuthors = (s: string) => Dblp.findAuthor(s)
    .then(res => res === 'not_ok' || res === 'error' ? 'error' : Dblp.mkSuggestions(res));

export default App;
