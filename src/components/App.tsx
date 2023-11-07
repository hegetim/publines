import React from 'react';
import './App.css';
import * as Dblp from '../model/Dblp';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
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
      </header>
    </div>
  );
}

export default App;
