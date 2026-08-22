const state = {
  bootstrap: null,
  targetId: null,
  contextPacket: null,
  editorPatch: {},
  editorAssets: {},
  receipt: null,
  assetType: 'image',
  focusSlot: null
};
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value ?? {}, key);
const COLOR = /^#[0-9a-f]{6}$/i;
const GROUP_ORDER = ['Materials', 'Features', 'Carvers', 'Architecture', 'Conditions'];
const ADVANCED_KEYS = Object.freeze({
  'material.level-0-wallpaper': new Set(['uvOffsetU', 'uvOffsetV', 'rotationDegrees', 'flipU', 'flipV']),
  'material.arch-pale-wallpaper': new Set(['gloss']),
  'material.level-0-carpet': new Set(['brightness', 'contrast', 'saturation', 'archGloss']),
  'material.level-0-ceiling': new Set(['brightness', 'contrast', 'saturation']),
  'material.level-0-casing': new Set(['gloss']),
  'material.level-0-outlet': new Set(['gloss'])
});

async function api(path, init = {}) {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error ?? `${response.status} ${response.statusText}`);
  return value;
}
function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 3000); }
async function copy(value, label) { await navigator.clipboard.writeText(value); toast(`${label} copied`); }
function escape(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function target() { return state.bootstrap.targets.find((candidate) => candidate.semanticTargetId === state.targetId); }
function definition() { return state.bootstrap.registry.representations.find((candidate) => candidate.id === state.contextPacket?.context.representation.id); }
function targetLabel(targetId) { const item = state.bootstrap.targets.find((candidate) => candidate.semanticTargetId === targetId); return item ? (item.shortAddress ? `${item.shortAddress} — ${item.humanName}` : item.humanName) : targetId; }
function kv(entries) { return entries.map(([key,value]) => `<b>${escape(key)}</b><span>${escape(value ?? '—')}</span>`).join(''); }
function stack(values) { return values.length ? values.map((value) => `<code>${escape(value)}</code>`).join('') : '<span>none</span>'; }
function canonicalAsset(slot) { return slot?.assetId ?? ''; }
function activePreviewParameters() { return state.contextPacket?.context.representation.activePreviewOverrides ?? {}; }
function activePreviewAssets() { return state.contextPacket?.context.representation.activeAssetSlotOverrides ?? {}; }
function activeAsset(slot) { return hasOwn(activePreviewAssets(), slot.key) ? activePreviewAssets()[slot.key] : canonicalAsset(slot); }
function currentAsset(slot) { return hasOwn(state.editorAssets, slot.key) ? state.editorAssets[slot.key] : activeAsset(slot); }
function assetById(id) { return state.bootstrap.assets.find((asset) => asset.id === id); }
function friendlyAssetName(assetOrId) {
  const asset = typeof assetOrId === 'string' ? assetById(assetOrId) : assetOrId;
  const id = typeof assetOrId === 'string' ? assetOrId : assetOrId?.id;
  const explicit = asset?.humanName ?? asset?.label ?? asset?.name;
  if (explicit) return explicit;
  const tail = String(id ?? 'Unbound').split('.').at(-1).replace(/[-_]+/g, ' ');
  return tail.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function compatibleAssets(slot) {
  return state.bootstrap.assets
    .filter((asset) => asset.type === slot.assetType && asset.profile === slot.profile && slot.roles.includes(asset.role) && asset.runtimeStatus === 'ready')
    .sort((a, b) => friendlyAssetName(a).localeCompare(friendlyAssetName(b)) || a.id.localeCompare(b.id));
}
function compatibleBindings(asset) {
  const matches = [];
  for (const binding of state.bootstrap.registry.bindings) {
    const def = state.bootstrap.registry.representations.find((candidate) => candidate.id === binding.representationId);
    for (const slot of def?.assetSlots ?? []) {
      if (!slot.editable || asset.type !== slot.assetType || asset.profile !== slot.profile || !slot.roles.includes(asset.role)) continue;
      matches.push({ targetId: binding.semanticTargetId, slot });
    }
  }
  return matches;
}
function usedBindings(asset) {
  const matches = [];
  for (const binding of state.bootstrap.registry.bindings) {
    const def = state.bootstrap.registry.representations.find((candidate) => candidate.id === binding.representationId);
    for (const slot of def?.assetSlots ?? []) if (slot.assetId === asset.id) matches.push({ targetId: binding.semanticTargetId, slot });
  }
  return matches;
}
function currentParameter(meta) {
  const canonical = state.contextPacket.context.representation.canonicalValues[meta.key];
  const preview = activePreviewParameters();
  if (hasOwn(state.editorPatch, meta.key)) return state.editorPatch[meta.key];
  if (hasOwn(preview, meta.key)) return preview[meta.key];
  return canonical;
}
function formatValue(value) { return typeof value === 'number' ? String(Number(value.toFixed?.(4) ?? value)) : typeof value === 'boolean' ? (value ? 'On' : 'Off') : String(value ?? '—'); }
function currentPatch() {
  const canonical = state.contextPacket.context.representation.canonicalValues, result = {};
  for (const [key, value] of Object.entries(state.editorPatch)) if (canonical[key] !== value) result[key] = value;
  return result;
}
function currentAssetPatch() {
  const result = {};
  for (const slot of state.contextPacket.context.representation.assetSlots ?? []) if (hasOwn(state.editorAssets, slot.key) && state.editorAssets[slot.key] !== canonicalAsset(slot)) result[slot.key] = state.editorAssets[slot.key];
  return result;
}
function editorChangeCount() { return Object.keys(currentPatch()).length + Object.keys(currentAssetPatch()).length; }
function previewChangeCount() { return Object.keys(activePreviewParameters()).length + Object.keys(activePreviewAssets()).length; }
function isAdvanced(key) { return ADVANCED_KEYS[state.targetId]?.has(key) ?? false; }

async function loadBootstrap() {
  state.bootstrap = await api('/api/bootstrap');
  const params = new URLSearchParams(location.search);
  const requested = params.get('target') || state.bootstrap.focusTargetId;
  state.focusSlot = params.get('slot');
  state.targetId = state.bootstrap.targets.some((candidate) => candidate.semanticTargetId === requested) ? requested : state.bootstrap.targets[0]?.semanticTargetId;
  renderTargets(); renderRepo(); renderAssets(); renderHistory(); renderProfiles();
  if (state.targetId) await selectTarget(state.targetId, { preserveFocus: true });
}
function renderTargets() {
  const query = $('#target-search').value.trim().toLowerCase();
  const filtered = state.bootstrap.targets.filter((item) => !query || `${item.humanName} ${item.shortAddress ?? ''} ${item.semanticTargetId} ${item.group ?? ''} ${(item.whereUsed ?? []).join(' ')}`.toLowerCase().includes(query));
  $('#target-list').innerHTML = GROUP_ORDER.map((group) => {
    const items = filtered.filter((item) => (item.group ?? 'Materials') === group);
    if (!items.length) return '';
    return `<section class="target-group"><div class="target-group-title">${escape(group)}</div>${items.map((item) => `<button class="target-button ${item.semanticTargetId === state.targetId ? 'active' : ''}" data-target="${escape(item.semanticTargetId)}"><strong>${escape(item.shortAddress ? `${item.shortAddress} — ${item.humanName}` : item.humanName)}</strong><small>${item.structuredEditable ? 'Editable presentation' : 'Read only · world/code owned'}</small></button>`).join('')}</section>`;
  }).join('');
  $$('.target-button[data-target]').forEach((button) => button.addEventListener('click', () => selectTarget(button.dataset.target)));
}
function renderRepo() {
  const git = state.bootstrap.git;
  $('#branch').textContent = git.branch || 'detached HEAD';
  $('#dirty').textContent = git.clean ? 'clean worktree' : `${git.entries.length} worktree change(s)`;
  const received = state.bootstrap.runtime?.receivedAt ? new Date(state.bootstrap.runtime.receivedAt).getTime() : 0;
  const connected = received > 0 && Date.now() - received < 6000;
  $('#runtime-state').textContent = connected ? 'game runtime connected' : 'game runtime not connected';
  $('#git-state').innerHTML = kv([['branch', git.branch || 'detached'], ['clean', String(git.clean)], ['Studio changes', git.studioChanges.join(', ') || 'none'], ['pre-existing', git.preExistingChanges.join(', ') || 'none'], ['other dirty', git.otherChanges.join(', ') || 'none']]);
}
async function selectTarget(targetId, { preserveFocus = false } = {}) {
  if (state.targetId !== targetId && editorChangeCount() > 0) toast('Unsaved editor changes were discarded when you changed target.');
  state.targetId = targetId; state.editorPatch = {}; state.editorAssets = {}; state.receipt = null; $('#receipt-panel').hidden = true;
  if (!preserveFocus) state.focusSlot = null;
  await api('/api/command', { method:'POST', body: JSON.stringify({ type:'select-target', targetId }) }).catch(() => undefined);
  await refreshContext(); renderTargets();
}
async function refreshContext() {
  const params = new URLSearchParams({ target: state.targetId, mode:'CHANGE' });
  const observation = $('#observation').value.trim(), request = $('#request').value.trim();
  if (observation) params.set('observation', observation); if (request) params.set('request', request);
  state.contextPacket = await api(`/api/context?${params}`);
  renderInspector(); renderEditor();
}
function sourceSummary(ctx) {
  const slots = ctx.representation.assetSlots ?? [];
  if (!slots.length) return `<div><strong>Structured presentation values</strong><small>${escape(ctx.ownership.definitionModule)}</small></div>`;
  return slots.map((slot) => {
    const saved = canonicalAsset(slot), asset = assetById(saved);
    return `<div class="source-asset">${asset?.runtimePath ? `<img src="${escape(asset.runtimePath)}" alt="${escape(friendlyAssetName(asset))}"/>` : '<div class="asset-placeholder">No image</div>'}<div><strong>${escape(slot.label)} · ${escape(saved ? friendlyAssetName(asset ?? saved) : 'Procedural / unbound')}</strong><small>${escape(saved || 'No Asset ID')}</small></div></div>`;
  }).join('');
}
function renderInspector() {
  const ctx = state.contextPacket.context, selected = target();
  $('#target-category').textContent = selected?.group ?? ctx.designTarget.category;
  $('#target-name').textContent = ctx.designTarget.humanName;
  $('#target-id').textContent = ctx.designTarget.semanticTargetId;
  $('#editability').textContent = selected?.structuredEditable ? 'EDITABLE PRESENTATION' : 'READ ONLY';
  $('#where-used').innerHTML = (selected?.whereUsed?.length ? selected.whereUsed : ['Design target / diagnostics']).map((item) => `<span>${escape(item)}</span>`).join('');
  $('#scope-note').hidden = !selected?.scopeNote;
  $('#scope-note').textContent = selected?.scopeNote ?? '';
  $('#current-source').innerHTML = sourceSummary(ctx);

  const instance = ctx.runtimeInstance;
  $('#world-inspector').innerHTML = kv([
    ['Region', instance?.regionId ?? state.bootstrap.runtime?.regionId ?? 'design target'], ['Conditions', instance?.conditionIds?.join(', ') || state.bootstrap.runtime?.conditionIds?.join(', ') || 'none'], ['Generation', instance?.generationVersion ?? state.bootstrap.runtime?.generationVersion ?? 'n/a'], ['Runtime instance', instance?.stableRuntimeId ?? 'none selected'], ['Cell', instance ? `${instance.cell.id} (${instance.cell.x}, ${instance.cell.z})` : 'n/a'], ['Position', instance ? `${instance.worldPosition.x.toFixed?.(2) ?? instance.worldPosition.x}, ${instance.worldPosition.y.toFixed?.(2) ?? instance.worldPosition.y}, ${instance.worldPosition.z.toFixed?.(2) ?? instance.worldPosition.z}` : 'n/a']
  ]);
  const slots = ctx.representation.assetSlots ?? [], sourceMode = ctx.representation.canonicalValues?.sourceMode;
  const sourceType = slots.length ? (sourceMode === 'procedural' ? 'Procedural with optional NAL Asset' : 'NAL Asset') : 'Colour / material';
  $('#presentation-inspector').innerHTML = kv([
    ['Representation', ctx.representation.id], ['Semantic target', ctx.representation.binding.semanticTargetId], ['Geometry', ctx.representation.geometryId ?? 'presentation-owned'], ['Source', sourceType], ['Materials', ctx.representation.materialIds.join(', ') || 'none'], ['Saved Assets', slots.map((slot) => `${slot.label}: ${canonicalAsset(slot) || 'unbound'}`).join(' · ') || 'none'], ['LCG', ctx.representation.lcg ?? 'n/a'], ['Collision', ctx.representation.collisionMode], ['Fallback', ctx.representation.fallback ?? 'none']
  ]);
  $('#source-inspector').innerHTML = `<strong>${escape(ctx.ownership.definitionModule)}</strong>${stack(ctx.ownership.sourcePaths)}<small>Focused tests</small>${stack(ctx.ownership.relevantTests)}`;
  $('#diagnostics').innerHTML = stack([...ctx.diagnostics, ...ctx.validationWarnings]);
  renderAuthoringState();
}
function renderAuthoringState() {
  if (!state.contextPacket) return;
  const ctx = state.contextPacket.context, selected = target();
  const canonicalCount = Object.keys(ctx.representation.canonicalValues ?? {}).length;
  const savedAssets = (ctx.representation.assetSlots ?? []).filter((slot) => canonicalAsset(slot)).length;
  const previewCount = previewChangeCount(), dirtyCount = editorChangeCount();
  $('#saved-state').textContent = `${canonicalCount} value${canonicalCount === 1 ? '' : 's'}${ctx.representation.assetSlots?.length ? ` · ${savedAssets} Asset binding${savedAssets === 1 ? '' : 's'}` : ''}`;
  $('#preview-state').textContent = previewCount ? `Active · ${previewCount} override${previewCount === 1 ? '' : 's'}` : 'None · canonical runtime';
  $('#editor-state').textContent = dirtyCount ? `${dirtyCount} unsaved change${dirtyCount === 1 ? '' : 's'}` : 'None';
  $('#preview-active-banner').hidden = previewCount === 0;
  $('#editor-dirty-banner').hidden = dirtyCount === 0;
  $('#code-required').hidden = Boolean(selected?.structuredEditable);
  if (!selected?.structuredEditable) $('#authoring-status').textContent = 'This target is inspectable, but its owning world/game law is not writable from Studio.';
  else if (dirtyCount) $('#authoring-status').textContent = previewCount ? 'Editor changes are staged and a temporary runtime preview is active. Save is still explicit.' : 'Editor changes are local only. Apply Temporary Preview to test them, or Save to Project to persist them.';
  else if (previewCount) $('#authoring-status').textContent = 'A temporary runtime preview is active. Revert it to return to the saved project value.';
  else $('#authoring-status').textContent = 'Showing saved project values. Changing a control never saves automatically.';
}
function parameterField(meta) {
  const value = currentParameter(meta), canonical = state.contextPacket.context.representation.canonicalValues[meta.key], preview = activePreviewParameters();
  const description = [meta.description, meta.unit ? `Unit: ${meta.unit}` : ''].filter(Boolean).join(' · ');
  const stateLine = `Saved: ${formatValue(canonical)}${hasOwn(preview, meta.key) ? ` · Temporary preview: ${formatValue(preview[meta.key])}` : ''}`;
  if (meta.kind === 'boolean') return `<div class="field-card"><span class="field-label">${escape(meta.label)}</span><label><input data-param-boolean="${escape(meta.key)}" type="checkbox" ${value ? 'checked' : ''}/> Enabled</label>${description ? `<span class="field-help">${escape(description)}</span>` : ''}<span class="field-state">${escape(stateLine)}</span></div>`;
  if (meta.kind === 'enum') return `<div class="field-card"><label>${escape(meta.label)}<select data-param-enum="${escape(meta.key)}">${(meta.values ?? []).map((choice) => `<option value="${escape(choice)}" ${choice === value ? 'selected':''}>${escape(choice)}</option>`).join('')}</select></label>${description ? `<span class="field-help">${escape(description)}</span>` : ''}<span class="field-state">${escape(stateLine)}</span></div>`;
  if (meta.kind === 'color') return `<div class="field-card"><span class="field-label">${escape(meta.label)}</span><div class="color-control"><input data-param-color="${escape(meta.key)}" type="color" value="${escape(value)}"/><input data-param-color-text="${escape(meta.key)}" type="text" inputmode="text" value="${escape(value)}" aria-label="${escape(meta.label)} exact hex value"/></div>${description ? `<span class="field-help">${escape(description)}</span>` : ''}<span class="field-state">${escape(stateLine)}</span></div>`;
  if (meta.kind === 'number') {
    const bounded = meta.min !== undefined && meta.max !== undefined;
    const attrs = `${meta.min !== undefined ? `min="${meta.min}"`:''} ${meta.max !== undefined ? `max="${meta.max}"`:''} ${meta.step !== undefined ? `step="${meta.step}"`:''}`;
    return `<div class="field-card"><span class="field-label">${escape(meta.label)}</span><div class="numeric-control">${bounded ? `<input data-param-range="${escape(meta.key)}" type="range" value="${escape(value)}" ${attrs}/>` : '<span></span>'}<input data-param-number="${escape(meta.key)}" type="number" value="${escape(value)}" ${attrs}/></div>${description ? `<span class="field-help">${escape(description)}</span>` : ''}<span class="field-state">${escape(stateLine)}</span></div>`;
  }
  return `<div class="field-card"><label>${escape(meta.label)}<input data-param-text="${escape(meta.key)}" type="text" value="${escape(value)}"/></label>${description ? `<span class="field-help">${escape(description)}</span>` : ''}<span class="field-state">${escape(stateLine)}</span></div>`;
}
function assetSlotField(slot) {
  const selected = currentAsset(slot), asset = assetById(selected), choices = compatibleAssets(slot), saved = canonicalAsset(slot), preview = activePreviewAssets();
  const listId = `asset-options-${slot.key.replace(/[^a-z0-9_-]/gi,'-')}`;
  const options = choices.map((item) => `<option value="${escape(item.id)}">${escape(friendlyAssetName(item))} · ${escape(item.profile)}</option>`).join('');
  return `<article class="asset-slot" data-slot-card="${escape(slot.key)}"><div><strong>${escape(slot.label)}</strong><small>${escape(slot.description ?? `${slot.profile} Asset slot`)}</small></div>${asset?.runtimePath ? `<img src="${escape(asset.runtimePath)}" alt="${escape(friendlyAssetName(asset))} preview"/>` : '<div class="asset-placeholder">Procedural / no image bound</div>'}<label>Choose compatible Asset<input data-asset-slot="${escape(slot.key)}" list="${escape(listId)}" value="${escape(selected)}" placeholder="Search by name or Asset ID"/></label><datalist id="${escape(listId)}">${slot.optional ? '<option value="">Procedural / unbound</option>' : ''}${options}</datalist><div class="asset-current"><div><strong>Saved Project Asset</strong>${escape(saved ? friendlyAssetName(saved) : 'Procedural / unbound')}<br><small>${escape(saved || 'No Asset ID')}</small></div><div><strong>Temporary Preview</strong>${escape(hasOwn(preview, slot.key) ? (preview[slot.key] ? friendlyAssetName(preview[slot.key]) : 'Procedural / unbound') : 'None')}<br><small>${escape(hasOwn(preview, slot.key) ? (preview[slot.key] || 'Unbound') : 'Uses saved value')}</small></div></div><div class="kv compact">${kv([['Profile', slot.profile], ['compatible', `${choices.length} runtime-ready Asset${choices.length === 1 ? '' : 's'}`], ['runtime', asset?.runtimeStatus ?? (selected ? 'not built' : 'n/a')]])}</div></article>`;
}
function stageParameter(key, value) {
  state.editorPatch[key] = value;
  renderAuthoringState();
  updateButtons();
}
function bindFieldEvents(editable) {
  $$('[data-param-number]').forEach((input) => input.addEventListener('input', () => {
    const meta = editable.find((candidate) => candidate.key === input.dataset.paramNumber); if (!meta) return;
    const value = Number(input.value); if (!Number.isFinite(value)) return;
    const range = $(`[data-param-range="${CSS.escape(meta.key)}"]`); if (range) range.value = input.value;
    stageParameter(meta.key, value);
  }));
  $$('[data-param-range]').forEach((input) => input.addEventListener('input', () => {
    const meta = editable.find((candidate) => candidate.key === input.dataset.paramRange); if (!meta) return;
    const value = Number(input.value); const exact = $(`[data-param-number="${CSS.escape(meta.key)}"]`); if (exact) exact.value = input.value;
    stageParameter(meta.key, value);
  }));
  $$('[data-param-boolean]').forEach((input) => input.addEventListener('change', () => stageParameter(input.dataset.paramBoolean, input.checked)));
  $$('[data-param-enum]').forEach((input) => input.addEventListener('change', () => stageParameter(input.dataset.paramEnum, input.value)));
  $$('[data-param-text]').forEach((input) => input.addEventListener('input', () => stageParameter(input.dataset.paramText, input.value)));
  $$('[data-param-color]').forEach((input) => input.addEventListener('input', () => {
    const text = $(`[data-param-color-text="${CSS.escape(input.dataset.paramColor)}"]`); if (text) { text.value = input.value; text.classList.remove('invalid'); }
    stageParameter(input.dataset.paramColor, input.value.toLowerCase());
  }));
  $$('[data-param-color-text]').forEach((input) => input.addEventListener('input', () => {
    if (!COLOR.test(input.value)) { input.classList.add('invalid'); return; }
    input.classList.remove('invalid'); const value = input.value.toLowerCase(); const picker = $(`[data-param-color="${CSS.escape(input.dataset.paramColorText)}"]`); if (picker) picker.value = value;
    stageParameter(input.dataset.paramColorText, value);
  }));
  $$('[data-asset-slot]').forEach((input) => input.addEventListener('change', () => {
    const slot = (definition()?.assetSlots ?? []).find((candidate) => candidate.key === input.dataset.assetSlot); if (!slot) return;
    const allowed = new Set(compatibleAssets(slot).map((asset) => asset.id));
    if (input.value === '' && slot.optional) { input.classList.remove('invalid'); state.editorAssets[slot.key] = ''; }
    else if (!allowed.has(input.value)) { input.classList.add('invalid'); toast(`${slot.label} accepts only compatible, runtime-ready Assets.`); return; }
    else { input.classList.remove('invalid'); state.editorAssets[slot.key] = input.value; }
    renderEditor(); renderInspector();
  }));
}
function renderEditor() {
  const selected = target(), def = definition(), editable = def?.editableParameters ?? [], slots = def?.assetSlots ?? [];
  const readOnly = !selected?.structuredEditable;
  $('#read-only-explanation').hidden = !readOnly;
  $('#basic-section').hidden = readOnly;
  $('#advanced-section').hidden = readOnly;
  $('#asset-fields').hidden = readOnly;
  if (readOnly) {
    $('#read-only-explanation').innerHTML = `<strong>READ ONLY</strong><p>${escape(selected?.readOnlyReason ?? 'This property belongs to world/game law rather than safe presentation authoring.')}</p><div class="kv compact">${kv([['Owning module', selected?.readOnlyOwner ?? state.contextPacket.context.ownership.definitionModule], ['Semantic target', selected?.semanticTargetId ?? state.targetId]])}</div>`;
    $('#asset-fields').innerHTML = ''; $('#basic-fields').innerHTML = ''; $('#advanced-fields').innerHTML = '';
    updateButtons(); renderAuthoringState(); return;
  }
  $('#asset-fields').innerHTML = slots.length ? `<h3>Images / Assets</h3><div class="asset-slot-grid">${slots.map(assetSlotField).join('')}</div>` : '';
  const basic = editable.filter((meta) => !isAdvanced(meta.key)), advanced = editable.filter((meta) => isAdvanced(meta.key));
  $('#basic-section').hidden = basic.length === 0;
  $('#basic-fields').innerHTML = basic.map(parameterField).join('');
  $('#advanced-section').hidden = advanced.length === 0;
  $('#advanced-fields').innerHTML = advanced.map(parameterField).join('');
  bindFieldEvents(editable);
  updateButtons(); renderAuthoringState();
  if (state.focusSlot) {
    const card = document.querySelector(`[data-slot-card="${CSS.escape(state.focusSlot)}"]`);
    if (card) { card.scrollIntoView({ behavior:'smooth', block:'center' }); card.querySelector('[data-asset-slot]')?.focus(); }
    state.focusSlot = null;
  }
}
function updateButtons() {
  const editable = Boolean(target()?.structuredEditable), dirty = state.contextPacket ? editorChangeCount() > 0 : false, preview = state.contextPacket ? previewChangeCount() > 0 : false;
  $('#preview').disabled = !editable || !dirty;
  $('#save').disabled = !editable || !dirty;
  $('#revert-preview').disabled = !editable || (!preview && !dirty);
  $('#clear-previews').disabled = !editable && !preview;
}
function previewMatches(packet, expectedParameters, expectedAssets) {
  const ctx = packet.context, parameters = ctx.representation.activePreviewOverrides ?? {}, assets = ctx.representation.activeAssetSlotOverrides ?? {};
  const parameterKeys = Object.keys(expectedParameters), assetKeys = Object.keys(expectedAssets);
  if (Object.keys(parameters).length !== parameterKeys.length || Object.keys(assets).length !== assetKeys.length) return false;
  return parameterKeys.every((key) => parameters[key] === expectedParameters[key]) && assetKeys.every((key) => assets[key] === expectedAssets[key]);
}
async function waitForPreviewState(expectedParameters, expectedAssets) {
  let last;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    last = await api(`/api/context?${new URLSearchParams({ target: state.targetId, mode:'CHANGE' })}`);
    if (previewMatches(last, expectedParameters, expectedAssets)) {
      state.contextPacket = last;
      state.bootstrap = await api('/api/bootstrap');
      renderRepo(); renderInspector(); renderEditor();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  if (last) state.contextPacket = last;
  renderInspector(); renderEditor();
  throw new Error('The local game runtime did not acknowledge the requested preview state. Keep the game tab running and try again.');
}
async function command(type, payload) { return api('/api/command', { method:'POST', body: JSON.stringify({ type, targetId: state.targetId, payload }) }); }
async function applyPreview() {
  const patch = currentPatch(), assets = currentAssetPatch();
  if (!Object.keys(patch).length && !Object.keys(assets).length) throw new Error('Change a presentation control before applying a preview.');
  $('#authoring-status').textContent = 'Sending a temporary preview to the local game runtime…';
  await command('clear-preview');
  if (Object.keys(patch).length) await command('preview-parameters', { parameters: patch });
  if (Object.keys(assets).length) await command('preview-assets', { assetSlots: assets });
  await waitForPreviewState(patch, assets);
  toast('Temporary preview active — project source is unchanged.');
}
async function revertPreview() {
  await command('clear-preview'); state.editorPatch = {}; state.editorAssets = {};
  await waitForPreviewState({}, {}); toast('This preview reverted to the saved project value.');
}
async function clearAllPreviews() {
  await command('clear-all-previews'); state.editorPatch = {}; state.editorAssets = {};
  await waitForPreviewState({}, {}); toast('All temporary previews cleared.');
}
function renderReceipt() {
  if (!state.receipt?.receipt) return;
  const receipt = state.receipt.receipt, validation = state.receipt.validation?.passed ?? receipt.validation?.every((item) => item.status === 'PASS');
  $('#receipt-summary').innerHTML = [
    ['Canonical source changed', (receipt.sourceDefinitionsChanged ?? []).join(', ') || 'yes'],
    ['Target', receipt.semanticTarget?.humanName ?? receipt.semanticTarget?.semanticTargetId ?? state.targetId],
    ['Before / after', receipt.diffSummary || 'Structured presentation changed'],
    ['Asset bindings', `${(receipt.assetIdsBefore ?? []).join(', ') || 'none'} → ${(receipt.assetIdsAfter ?? []).join(', ') || 'none'}`],
    ['Validation', validation === true ? 'PASS' : validation === false ? 'FAIL' : 'See receipt']
  ].map(([label,value]) => `<div><small>${escape(label)}</small>${escape(value)}</div>`).join('');
  $('#receipt-human').textContent = state.receipt.human ?? '';
  $('#receipt-panel').hidden = false;
}
async function saveProject() {
  const parameterPatch = currentPatch(), assetSlotPatch = currentAssetPatch();
  if (!Object.keys(parameterPatch).length && !Object.keys(assetSlotPatch).length) throw new Error('There is no unsaved editor change to save.');
  $('#authoring-status').textContent = 'Validating and writing the canonical structured source…';
  const result = await api('/api/save', { method:'POST', body: JSON.stringify({ targetId: state.targetId, parameterPatch, assetSlotPatch, observation: $('#observation').value.trim() || undefined, requestedChange: $('#request').value.trim() || undefined }) });
  state.receipt = result; state.editorPatch = {}; state.editorAssets = {};
  await waitForPreviewState({}, {}).catch(() => undefined);
  await reloadAll(); renderReceipt(); toast('Saved to canonical project source. Temporary preview cleared.');
}
async function contextPacket({ observation = false, request = false } = {}) {
  const params = new URLSearchParams({ target: state.targetId, mode:'CHANGE' });
  if (observation && $('#observation').value.trim()) params.set('observation', $('#observation').value.trim());
  if (request && $('#request').value.trim()) params.set('request', $('#request').value.trim());
  return api(`/api/context?${params}`);
}
async function reloadAll() { state.bootstrap = await api('/api/bootstrap'); renderRepo(); renderTargets(); renderAssets(); renderHistory(); renderProfiles(); await refreshContext(); }
function showTab(name) { $$('.tab-panel').forEach((panel) => panel.hidden = panel.id !== `${name}-panel`); if (name === 'git') refreshDiff(); if (name === 'assets') $('#assets-panel').scrollIntoView({behavior:'smooth',block:'start'}); }
async function refreshDiff() { const result = await api('/api/diff'); $('#diff').textContent = result.diff || 'No Studio-owned Git diff.'; }
function renderProfiles() { $('#asset-profile').innerHTML = state.bootstrap.profiles.map((profile) => `<option value="${escape(profile.id)}">${escape(profile.id)} · ${escape(profile.type)}</option>`).join(''); }
function renderAssets() {
  const query = $('#asset-search')?.value.trim().toLowerCase() ?? '';
  const assets = state.bootstrap.assets.filter((asset) => asset.type === state.assetType && (!query || `${asset.id} ${asset.profile} ${asset.role} ${asset.source} ${friendlyAssetName(asset)}`.toLowerCase().includes(query)));
  $('#asset-list').innerHTML = assets.length ? assets.map((asset) => {
    const compatible = compatibleBindings(asset), used = usedBindings(asset);
    const usedText = used.length ? used.map(({targetId,slot}) => `${targetLabel(targetId)} · ${slot.label}`).join(' · ') : 'Unused';
    const compatibleText = compatible.length ? compatible.map(({targetId,slot}) => `${targetLabel(targetId)} · ${slot.label}`).join(' · ') : 'No editable compatible target';
    return `<article class="asset-card"><div><h3>${escape(friendlyAssetName(asset))}</h3><small>${escape(asset.id)}</small></div><p>${escape(asset.profile)} · ${escape(asset.role)}</p>${asset.type === 'image' && asset.runtimePath ? `<img src="${escape(asset.runtimePath)}" alt="${escape(friendlyAssetName(asset))}"/>`:''}${asset.type === 'audio' && asset.runtimePath ? `<audio controls src="${escape(asset.runtimePath)}"></audio>`:''}${asset.type === 'mesh' ? `<p class="muted">GLB metadata preview · triangles ${escape(asset.mesh?.triangles ?? 'unknown')} · vertices ${escape(asset.mesh?.vertices ?? 'unknown')} · pivot ${escape(asset.mesh?.pivot ?? 'profile default')} · collision ${escape(asset.mesh?.collision ?? 'profile default')}</p>`:''}<div class="kv compact">${kv([['Asset ID',asset.id],['hash',asset.contentHash?.slice(0,16) ?? 'not built'],['runtime',asset.runtimeStatus ?? 'not built'],['source',asset.source],['fallback',asset.fallback ?? 'none']])}</div><div class="asset-usage"><strong>Used by</strong><p class="muted">${escape(usedText)}</p><strong>Compatible use targets</strong><p class="muted">${escape(compatibleText)}</p></div>${compatible.length ? `<div class="actions wrap">${compatible.map(({targetId,slot}) => `<button data-use-target="${escape(targetId)}" data-use-slot="${escape(slot.key)}">Use for ${escape(targetLabel(targetId))} · ${escape(slot.label)}</button>`).join('')}</div>` : ''}</article>`;
  }).join('') : '<p class="muted">No matching assets in this category.</p>';
  $$('[data-use-target]').forEach((button) => button.addEventListener('click', async () => {
    state.focusSlot = button.dataset.useSlot;
    await selectTarget(button.dataset.useTarget, { preserveFocus: true });
    $('#target-panel').scrollIntoView({ behavior:'smooth', block:'start' });
    toast(`Opened ${targetLabel(button.dataset.useTarget)} · ${button.dataset.useSlot}. No binding was changed.`);
  }));
}
function renderHistory() {
  $('#history').innerHTML = state.bootstrap.receipts.length ? state.bootstrap.receipts.map((entry) => `<button class="target-button" data-receipt="${escape(entry.id)}"><strong>${escape(entry.receipt?.semanticTarget?.humanName ?? entry.id)}</strong><small>${escape(entry.receipt?.changeMode ?? '')} · ${escape(entry.createdAt)}</small></button>`).join('') : '<p class="muted">No local Studio receipts yet.</p>';
  $$('[data-receipt]').forEach((button) => button.addEventListener('click', async () => { state.receipt = await api(`/api/receipt?id=${encodeURIComponent(button.dataset.receipt)}`); renderReceipt(); showTab('history'); }));
}
async function importAsset() {
  const file = $('#asset-file').files[0]; if (!file) throw new Error('Choose a file first');
  const bytes = new Uint8Array(await file.arrayBuffer()); let binary=''; for (let i=0;i<bytes.length;i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,i+0x8000));
  const result = await api('/api/assets/import', { method:'POST', body: JSON.stringify({ fileName:file.name, dataBase64:btoa(binary), assetId:$('#asset-id').value.trim(), profile:$('#asset-profile').value }) });
  state.receipt = result; renderReceipt(); toast('Asset imported through NAL'); await reloadAll();
}
async function runValidation(action) { $('#validation-output').textContent=`Running ${action}…`; const result=await api('/api/validation',{method:'POST',body:JSON.stringify({action,targetId:state.targetId})}); $('#validation-output').textContent=JSON.stringify(result,null,2); toast(result.passed?'Validation passed':'Validation failed'); await reloadAll(); await refreshDiff(); }

$('#target-search').addEventListener('input', renderTargets);
$('#asset-search').addEventListener('input', renderAssets);
$('#preview').addEventListener('click', () => applyPreview().catch((error)=>{ $('#authoring-status').textContent=error.message; toast(error.message); }));
$('#revert-preview').addEventListener('click', () => revertPreview().catch((error)=>toast(error.message)));
$('#clear-previews').addEventListener('click', () => clearAllPreviews().catch((error)=>toast(error.message)));
$('#save').addEventListener('click', () => saveProject().catch((error)=>{ $('#authoring-status').textContent=error.message; toast(error.message); }));
$('#locate').addEventListener('click', () => command('locate-target').catch((error)=>toast(error.message)));
$('#isolate').addEventListener('click', () => command('isolate-target').catch((error)=>toast(error.message)));
$('#showcase').addEventListener('click', () => command('spawn-showcase').catch((error)=>toast(error.message)));
$('#copy-context').addEventListener('click', async()=>{const p=await contextPacket();await copy(p.human,'Context')});
$('#copy-context-json').addEventListener('click', async()=>{const p=await contextPacket({observation:true,request:true});await copy(p.json,'Context JSON')});
$('#copy-observation').addEventListener('click', async()=>{const p=await contextPacket({observation:true});await copy(p.human,'Context + observation')});
$('#copy-request').addEventListener('click', async()=>{const p=await contextPacket({request:true});await copy(p.human,'Context + change request')});
$('#copy-prompt').addEventListener('click', async()=>{const p=await contextPacket({observation:true,request:true});await copy(p.fullPrompt,'Full development prompt')});
$('#observation').addEventListener('change', () => refreshContext().catch(()=>undefined));
$('#request').addEventListener('change', () => refreshContext().catch(()=>undefined));
$$('[data-tab]').forEach((button)=>button.addEventListener('click',()=>showTab(button.dataset.tab)));
$$('[data-asset-type]').forEach((button)=>button.addEventListener('click',()=>{state.assetType=button.dataset.assetType;renderAssets();showTab('assets')}));
$('#import-asset').addEventListener('click',()=>importAsset().catch((error)=>toast(error.message)));
$$('[data-validate]').forEach((button)=>button.addEventListener('click',()=>runValidation(button.dataset.validate).catch((error)=>toast(error.message))));
$('#copy-receipt').addEventListener('click',()=>state.receipt&&copy(state.receipt.human,'Change receipt'));
$('#copy-receipt-json').addEventListener('click',()=>state.receipt&&copy(state.receipt.json,'Receipt JSON'));
$('#view-receipt-diff').addEventListener('click',()=>{if(state.receipt){$('#diff').textContent=state.receipt.diff||'No diff recorded.';showTab('git')}});
$('#revert-change').addEventListener('click',async()=>{if(!state.receipt?.id)return;try{await api('/api/revert',{method:'POST',body:JSON.stringify({receiptId:state.receipt.id})});state.receipt=null;$('#receipt-panel').hidden=true;state.editorPatch={};state.editorAssets={};toast('Targeted Studio change reverted');await reloadAll();}catch(error){toast(error.message)}});

loadBootstrap().catch((error) => { console.error(error); toast(error.message); });
