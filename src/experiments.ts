import _ from 'lodash';
import { fetchPublications } from './experiments/FetchPublications';
import { saveToFile } from './experiments/IO';

export const test = "test";

console.log("Hello, World");

console.log(`lodash snake case: ${_.snakeCase("LoDashSnakeCase")}`);

fetchPublications(['250/0548']).then(res => saveToFile('test_tim.json', res));
