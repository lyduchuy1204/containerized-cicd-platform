import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import './index.css';

const ROOT_ELEMENT_ID = 'root';

const container = document.getElementById(ROOT_ELEMENT_ID);
if (container === null) {
  throw new Error(`Missing mount element with id ${ROOT_ELEMENT_ID}`);
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
