import React, { useCallback, useState } from 'react';
import './App.css';
import _ from 'lodash';
import * as Dblp from '../model/Dblp';
import { Author, Publication, filterInformal } from '../model/Metadata';
import { MainAuthor } from './MainAuthor';
import { StorylineComponent } from './StorylineComponent';
import { UserConfig, configDefaults } from '../model/UserConfig';
import { Settings } from './Settings';
import { mkStoryline } from '../model/Storyline';
import { Playground, PlaygroundData, fakeMainAuthor, fakePublications, fromStoryline } from './Playground';
import { Bibliography } from './Bibliography';

const App = () => {
    const [config, setConfig] = useState(configDefaults);
    const [mainAuthor, setMainAuthor] = useState<Author | undefined>();
    const [publications, setPublications] = useState<Publication[] | 'error' | undefined>();
    const [playgroundData, setPlaygroundData] = useState<PlaygroundData>({ meetings: [] });

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

    const handlePlaygroundRevert = useCallback(() => {
        if (publications && mainAuthor && publications !== 'error') {
            const { story } = handlePublications(publications, mainAuthor, config);
            return fromStoryline(story);
        } else {
            return { meetings: [] };
        }
    }, [publications, mainAuthor, config]);

    return <div className="App">
        <h1>Publines</h1>
        <p className='intro-par'>Visualize joint publications with your coauthors over time.</p>
        {config.data.source === 'dblp'
            ? <MainAuthor author={mainAuthor} setAuthor={handleAuthorChanged} fetchAuthors={fetchAuthors} />
            : <Playground data={playgroundData} setData={setPlaygroundData} rebuildData={handlePlaygroundRevert} />}
        <Settings config={config} updateConfig={setConfig} />
        {config.data.source === 'dblp'
            ? <PublicationsComponent publications={publications} mainAuthor={mainAuthor} config={config}
                setMainAuthor={handleAuthorChanged} />
            : <PublicationsComponent publications={fakePublications(playgroundData)} mainAuthor={fakeMainAuthor}
                config={config} setMainAuthor={handleAuthorChanged} />}
    </div>;
}

const PublicationsComponent = (props: {
    publications: Publication[] | 'error' | undefined,
    mainAuthor: Author | undefined,
    setMainAuthor: (a: Author) => void,
    config: UserConfig,
}) => {
    if (!props.publications || !props.mainAuthor) {
        return [];
    } else if (props.publications === 'error') {
        return <span className='story-main-error'>Could not load publications</span>;
    } else if (props.publications.length === 0) {
        return <span className='story-main-empty'>{`${props.mainAuthor.name} has no publications`}</span>;
    } else {
        console.log({ note: 'at publications component', publications: props.publications, main: props.mainAuthor })
        const res = handlePublications(props.publications, props.mainAuthor, props.config);
        console.log('rendered publication component (this builds a storyline)')
        return <React.Fragment>
            <StorylineComponent config={props.config} protagonist={props.mainAuthor} publications={res.filtered}
                story={res.story} authors={res.authors} />
            <Bibliography config={props.config.style} publications={res.filtered} setMainAuthor={props.setMainAuthor} />
        </React.Fragment>
    }
}

const handlePublications = (publications: Publication[], mainAuthor: Author, config: UserConfig) => {
    const filtered = filterInformal(publications, config.data.excludeInformal);
    const [story, authors] = mkStoryline(filtered, mainAuthor, config.data.coauthorCap);
    return { filtered, story, authors };
}

const fetchAuthors = (s: string) => Dblp.findAuthor(s)
    .then(res => res === 'not_ok' || res === 'error' ? 'error' : Dblp.mkSuggestions(res));

export default App;
