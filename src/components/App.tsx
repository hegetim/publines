import React from 'react';
import './App.css';
import * as Dblp from '../model/Dblp';
import { AuthorName } from './Settings';
import { StorylineSvg } from './Storyline';
import { as } from '../model/util';
import { SBCMRealization, Storyline } from '../model/Sbcm';
import { defaultConfig } from './StorylineUtils';

const App = () => {
  const fetchAuthors = (s: string) => Dblp.findAuthor(s)
    .then(res => res === 'not_ok' || res === 'error' ? 'error' : Dblp.mkSuggestions(res));

  const testStory = as<Storyline>({ authorIds: [], meetings: [[1, 2, 3, 4, 5], [0, 2, 3, 4, 5], [0, 2, 3, 5], [2, 5], [4, 1, 5]] });
  const testReal = as<SBCMRealization>({ initialPermutation: [0, 1, 2, 3, 4, 5], blockCrossings: [[0, 0, 1], [1, 3, 4], [3, 3, 4], [0, 1, 4]] });
  const config = defaultConfig(15);

  return (
    <div className="App">
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
      <AuthorName setAuthor={x => { console.log(x) }} fetchAuthors={fetchAuthors} />
      <StorylineSvg config={config} realization={testReal} story={testStory} />
    </div>
  );
}

export default App;
