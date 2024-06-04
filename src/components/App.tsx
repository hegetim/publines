import React, { useCallback, useEffect, useState } from 'react';
import './App.css';
import _ from 'lodash';
import * as Dblp from '../model/Dblp';
import { Author, Publication, YearFilter, mkFilter } from '../model/Metadata';
import { MainAuthor } from './MainAuthor';
import { StorylineComponent } from './StorylineComponent';
import * as Conf from '../model/UserConfig';
import { Settings } from './Settings';
import { mkStoryline } from '../model/Storyline';
import { Playground, PlaygroundData, fakeMainAuthor, fakePublications, fromStoryline } from './Playground';
import { Bibliography } from './Bibliography';
import { Loading } from './Loading';

const App = () => {
    const [config, setConfig] = useState(Conf.configDefaults);
    const [mainAuthor, setMainAuthor] = useState<Author | undefined>();
    const [publications, setPublications] = useState<FetchedPublications>();
    const [playgroundData, setPlaygroundData] = useState<PlaygroundData>({ meetings: [] });

    const handleAuthorChanged = useCallback((author: Author) => {
        setPublications('loading');
        setMainAuthor(author);
        Dblp.loadPublications(author.id).then(fetched => {
            if (fetched === 'error' || fetched === 'not_ok') {
                setPublications('error');
            } else {
                let parsed: Publication[] | 'error' = Dblp.parsePublications(fetched.raw);
                if (parsed !== 'error') { parsed = _.sortBy(parsed, p => p.year); }
                setPublications(parsed);
            }
        });
        saveToUrl(author, undefined);
    }, [setPublications, setMainAuthor]);

    const handlePlaygroundRevert = useCallback(() => {
        if (publications && mainAuthor && publications !== 'error' && publications !== 'loading') {
            const { story } = handlePublications(publications, mainAuthor, config);
            return fromStoryline(story);
        } else {
            return { meetings: [] };
        }
    }, [publications, mainAuthor, config]);

    const updateConfig = useCallback((f: (c: Conf.UserConfig) => Conf.UserConfig) => {
        setConfig((c: Conf.UserConfig) => {
            const newConfig = f(c);
            saveToUrl(undefined, newConfig);
            return newConfig;
        });
    }, [setConfig]);

    useEffect(() => {
        restoreFromUrl().then(res => {
            console.log(res);
            if (res.mainAuthor) { handleAuthorChanged(res.mainAuthor); }
            if (res.settings) { setConfig(res.settings); }
        })
    }, []);

    return <div className="App">
        <h1>Publines</h1>
        <p className='intro-par'>Visualize joint publications with your coauthors over time.</p>
        {config.data.source === 'dblp'
            ? <MainAuthor author={mainAuthor} setAuthor={handleAuthorChanged} fetchAuthors={fetchAuthors} />
            : <Playground data={playgroundData} setData={setPlaygroundData} rebuildData={handlePlaygroundRevert} />}
        <Settings config={config} updateConfig={updateConfig} />
        {config.data.source === 'dblp'
            ? <PublicationsComponent publications={publications} mainAuthor={mainAuthor} config={config}
                setMainAuthor={handleAuthorChanged} />
            : <PublicationsComponent publications={fakePublications(playgroundData)} mainAuthor={fakeMainAuthor}
                config={config} setMainAuthor={handleAuthorChanged} />}
        <span className='main-page-imprint'>
            <a href='https://graphdrawing.github.io/gd2024'>Anonymized for</a>
            <span>•</span>
            <a href='https://graphdrawing.github.io/gd2024'>blind review</a>
        </span>
    </div>;
}

type FetchedPublications = Publication[] | 'error' | 'loading' | undefined;

const PublicationsComponent = (props: {
    publications: FetchedPublications,
    mainAuthor: Author | undefined,
    setMainAuthor: (a: Author) => void,
    config: Conf.UserConfig,
}) => {
    if (!props.publications || !props.mainAuthor) {
        return [];
    } else if (props.publications === 'error') {
        return <span className='story-main-error'>Could not load publications</span>;
    } else if (props.publications === 'loading') {
        return <Loading className={['story-main-loading']} />;
    } else if (props.publications.length === 0) {
        return <span className='story-main-empty'>{`${props.mainAuthor.name} has no publications`}</span>;
    } else {
        const res = handlePublications(props.publications, props.mainAuthor, props.config);
        console.log('rendered publication component (this builds a storyline)')
        return <React.Fragment>
            <StorylineComponent config={props.config} protagonist={props.mainAuthor} publications={res.filtered}
                story={res.story} authors={res.authors} />
            <Bibliography enumStyle={props.config.style.enumerationStyle} publications={res.filtered}
                setMainAuthor={props.setMainAuthor} />
        </React.Fragment>
    }
}

const handlePublications = (publications: Publication[], mainAuthor: Author, config: Conf.UserConfig) => {
    const filtered = mkFilter(config.data.excludeInformal, mkYearFilter(config.data.excludeOld))(publications);
    const [story, authors] = mkStoryline(filtered, mainAuthor, config.data.coauthorCap);
    return { filtered, story, authors };
}

const mkYearFilter = (excludeOld: Conf.DataConfig['excludeOld']): YearFilter => {
    if (excludeOld === false) { return false; }
    const currentYear = new Date().getFullYear();
    return { fromIncl: currentYear - excludeOld, toIncl: currentYear };
}

const fetchAuthors = (s: string) => Dblp.findAuthor(s)
    .then(res => res === 'not_ok' || res === 'error' ? 'error' : Dblp.mkSuggestions(res));

const saveToUrl = async (mainAuthor: Author | undefined, settings: Conf.UserConfig | undefined) => {
    if (!mainAuthor && !settings) { return; }
    const url = new URL(window.location.href);
    if (mainAuthor) { url.searchParams.set('p', JSON.stringify(mainAuthor)); }
    if (settings) { url.searchParams.set('s', await Conf.store(settings)); }
    window.history.pushState({}, "", url);
}

const restoreFromUrl = async () => {
    const params = new URLSearchParams(window.location.search);
    const res: { mainAuthor?: Author | undefined, settings?: Conf.UserConfig | undefined } = {};
    if (params.has('p')) { res.mainAuthor = JSON.parse(params.get('p') ?? 'undefined') }
    if (params.has('s')) { res.settings = await Conf.loadWithDefaults(params.get('s') ?? undefined) }
    return res;
}

interface QueryData {
    p: Author | undefined,
    s: string,
}

export default App;
