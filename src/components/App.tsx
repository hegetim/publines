import React, { useState } from 'react';
import './App.css';
import * as Dblp from '../model/Dblp';
import { MainAuthor } from './MainAuthor';
import { StorylineSvg } from './Storyline';
import { as } from '../model/util';
import { SBCMRealization, Storyline, oneSidedScm } from '../model/Sbcm';
import { Author } from '../model/Metadata';
import { defaultConfig } from './StorylineUtils';

const App = () => {
  const fetchAuthors = (s: string) => Dblp.findAuthor(s)
    .then(res => res === 'not_ok' || res === 'error' ? 'error' : Dblp.mkSuggestions(res));

  const testStory = as<Storyline>({
    authorIds: ['0', '1', '2', '3', '4', '5'], meetings: [[1, 2, 3, 4, 5], [0, 2, 3, 4, 5], [0, 2, 3, 5], [2, 5], [4, 1, 5]]
  });
  const testReal = as<SBCMRealization>({ initialPermutation: [0, 1, 2, 3, 4, 5], blockCrossings: [[0, 0, 1], [1, 3, 4], [3, 3, 4], [0, 1, 4]] });
  const config = defaultConfig(12);

  const [mainAuthor, setMainAuthor] = useState<Author | undefined>();

  return (
    <div className="App" >
      <h1>Publines</h1>
      <p className='intro-par'>Visualize joint publications with your coauthors over time.</p>
      <button onClick={() => Dblp.findAuthor("alexander wolff").then(res => {
        if (res === 'error' || res === 'not_ok') {
          console.log('something went wrong');
        } else {
          console.log(Dblp.mkSuggestions(res));
        }
      })}>test</button>
      <button onClick={() => Dblp.loadPublications("15/4314").then(res => {
        if (res === 'error' || res === 'not_ok') {
          console.log('something went wrong');
        } else {
          console.log(Dblp.parsePublications(res.raw));
        }
      })}>test2</button>
      <MainAuthor author={mainAuthor} setAuthor={x => { setMainAuthor(x); console.log(x) }} fetchAuthors={fetchAuthors} />
      <StorylineSvg config={config} realization={testReal} story={testStory} />
      <StorylineSvg config={config} story={testStory} realization={oneSidedScm(testStory)} />
    </div >
  );
}

export default App;
