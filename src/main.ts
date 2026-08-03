import { ProjectNoclipGame } from './app/ProjectNoclipGame.js';

const game = new ProjectNoclipGame();
void game.initialize().catch((error: unknown) => {
  console.error(error);
  const root = document.querySelector<HTMLElement>('#ui-root');
  if (root) root.innerHTML = `<div class="title-screen"><div class="title-card ui-panel"><p class="eyebrow">Project Noclip failed safely</p><h1>LOAD ERROR</h1><p class="subtitle">${error instanceof Error ? error.message : 'Unknown initialization error'}</p></div></div>`;
});
