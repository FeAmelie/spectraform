import { render } from 'preact';

import { App } from './app/App';
import './styles/app.css';

const root = document.querySelector<HTMLElement>('#app');

if (!root) {
  throw new Error('Spectraform application root is missing.');
}

render(<App />, root);
