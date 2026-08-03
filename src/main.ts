import './styles.css';
import { ProjectNoclipGame } from './app/ProjectNoclipGame.js';

const game = new ProjectNoclipGame();
void game.initialize().then(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('autostart')) (document.querySelector('[data-action="new"]') as HTMLButtonElement | null)?.click();
}).catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="fatal"><h1>LEVEL 0 FAILED TO RESOLVE</h1><p>${String(error instanceof Error ? error.message : error)}</p></main>`;
});
