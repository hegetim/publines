import React, { useCallback, useState } from 'react';
import './App.css';
import * as Dblp from '../model/Dblp';
import { Author, Publication } from '../model/Metadata';
import { defaultConfig } from './StorylineUtils';
import { MainAuthor } from './MainAuthor';
import { StorylineComponent } from './StorylineComponent';
import _ from 'lodash';

const App = () => {
    const [config, _setConfig] = useState(defaultConfig(24)); // for later use
    const [mainAuthor, setMainAuthor] = useState<Author | undefined>();
    const [publications, setPublications] = useState<Publication[] | 'error' | undefined>();

    const handleAuthorChanged = useCallback(async (author: Author) => {
        const fetched = await Dblp.loadPublications(author.id);
        if (fetched === 'error' || fetched === 'not_ok') {
            setPublications('error');
        } else {
            let parsed: Publication[] | 'error' = Dblp.parsePublications(fetched.raw);
            if (parsed !== 'error') { parsed = _.sortBy(parsed, p => p.year); }
            console.log(parsed);
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
            return <StorylineComponent drawingConfig={config} protagonist={mainAuthor} publications={publications} />
        }
    }

    return (
        <div className="App" >
            <h1>Publines</h1>
            <p className='intro-par'>Visualize joint publications with your coauthors over time.</p>
            <MainAuthor author={mainAuthor} setAuthor={handleAuthorChanged} fetchAuthors={fetchAuthors} />
            {renderPublications()}
        </div >
    );
}

const fetchAuthors = (s: string) => Dblp.findAuthor(s)
    .then(res => res === 'not_ok' || res === 'error' ? 'error' : Dblp.mkSuggestions(res));

export default App;

// <button onClick={() => Dblp.findAuthor("alexander wolff").then(res => {
//   if (res === 'error' || res === 'not_ok') {
//     console.log('something went wrong');
//   } else {
//     console.log(Dblp.mkSuggestions(res));
//   }
// })}>test</button>
// <button onClick={() => Dblp.loadPublications("15/4314").then(res => {
//   if (res === 'error' || res === 'not_ok') {
//     console.log('something went wrong');
//   } else {
//     console.log(Dblp.parsePublications(res.raw));
//   }
// })}>test2</button>

// const testStory = as<Storyline>({
//   authorIds: ['0', '1', '2', '3', '4', '5'], meetings: [[1, 2, 3, 4, 5], [0, 2, 3, 4, 5], [0, 2, 3, 5], [2, 5], [4, 1, 5]]
// });
// const testReal = as<SBCMRealization>({ initialPermutation: [0, 1, 2, 3, 4, 5], blockCrossings: [[0, 0, 1], [1, 3, 4], [3, 3, 4], [0, 1, 4]] });
