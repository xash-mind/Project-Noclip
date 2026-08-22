const state = { bootstrap: null, targetId: null, contextPacket: null, previewPatch: {}, previewAssets: {}, receipt: null, assetType: 'image' };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function api(path, init = {}) {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error ?? `${response.status} ${response.statusText}`);
  return value;
}
function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2600); }
async function copy(value, label) { await navigator.clipboard.writeText(value); toast(`${label} copied`); }
function escape(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function target() { return state.bootstrap.targets.find((candidate) => candidate.semanticTargetId === state.targetId); }
function definition() { return state.bootstrap.registry.representations.find((candidate) => candidate.id === state.contextPacket?.context.representation.id); }
function targetLabel(targetId) { const item = state.bootstrap.targets.find((candidate) => candidate.semanticTargetId === targetId); return item?.shortAddress ?? item?.humanName ?? targetId; }
function representationOptions(category) { return state.bootstrap.registry.representations.filter((candidate) => candidate.category === category && !String(candidate.id).startsWith('legacy.') && candidate.id !== 'studio.nal'); }
function kv(entries) { return entries.map(([key,value]) => `<b>${escape(key)}</b><span>${escape(value ?? '—')}</span>`).join(''); }
function stack(values) { return values.length ? values.map((value) => `<code>${escape(value)}</code>`).join('') : '<span>none</span>'; }
function canonicalAsset(slot) { return slot?.assetId ?? ''; }
function currentAsset(slot) { return state.previewAssets[slot.key] ?? state.contextPacket.context.representation.activeAssetSlotOverrides?.[slot.key] ?? canonicalAsset(slot); }
function assetById(id) { return state.bootstrap.assets.find((asset) => asset.id === id); }
function compatibleAssets(slot) {
  return state.bootstrap.assets.filter((asset) => asset.type === slot.assetType && asset.profile === slot.profile && slot.roles.includes(asset.role) && asset.runtimeStatus === 'ready');
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

async function loadBootstrap() {
  state.bootstrap = await api('/api/bootstrap');
  const requested = new URLSearchParams(location.search).get('target') || state.bootstrap.focusTargetId;
  state.targetId = state.bootstrap.targets.some((candidate) => candidate.semanticTargetId === requested) ? requested : state.bootstrap.targets[0]?.semanticTargetId;
  renderTargets(); renderRepo(); renderAssets(); renderHistory(); renderProfiles();
  if (state.targetId) await selectTarget(state.targetId);
}
function renderTargets() {
  const query = $('#target-search').value.trim().toLowerCase();
  $('#target-list').innerHTML = state.bootstrap.targets.filter((item) => !query || `${item.humanName} ${item.shortAddress ?? ''} ${item.semanticTargetId}`.toLowerCase().includes(query)).map((item) => `<button class="target-button ${item.semanticTargetId === state.targetId ? 'active' : ''}" data-target="${escape(item.semanticTargetId)}"><strong>${escape(item.shortAddress ? `${item.shortAddress} — ${item.humanName}` : item.humanName)}</strong><small>${escape(item.category)} · ${item.structuredEditable ? 'Studio editable' : 'inspect only'}</small></button>`).join('');
  $$('.target-button[data-target]').forEach((button) => button.addEventListener('click', () => selectTarget(button.dataset.target)));
}
function renderRepo() {
  const git = state.bootstrap.git;
  $('#branch').textContent = git.branch || 'detached HEAD';
  $('#dirty').textContent = git.clean ? 'clean worktree' : `${git.entries.length} worktree change(s)`;
  $('#git-state').innerHTML = kv([['branch', git.branch || 'detached'], ['clean', String(git.clean)], ['Studio changes', git.studioChanges.join(', ') || 'none'], ['pre-existing', git.preExistingChanges.join(', ') || 'none'], ['other dirty', git.otherChanges.join(', ') || 'none']]);
}
async function selectTarget(targetId) {
  state.targetId = targetId; state.previewPatch = {}; state.previewAssets = {}; state.receipt = null; $('#receipt-panel').hidden = true;
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
function renderInspector() {
  const ctx = state.contextPacket.context, selected = target();
  $('#target-category').textContent = ctx.designTarget.category;
  $('#target-name').textContent = ctx.designTarget.humanName;
  $('#target-id').textContent = ctx.designTarget.semanticTargetId;
  $('#editability').textContent = selected?.structuredEditable ? 'STRUCTURED STUDIO TARGET' : 'READ-ONLY / CODE HANDOFF';
  const instance = ctx.runtimeInstance;
  $('#world-inspector').innerHTML = kv([
    ['Region', instance?.regionId ?? state.bootstrap.runtime?.regionId ?? 'design target'], ['Conditions', instance?.conditionIds?.join(', ') || state.bootstrap.runtime?.conditionIds?.join(', ') || 'none'], ['Generation', instance?.generationVersion ?? state.bootstrap.runtime?.generationVersion ?? 'n/a'], ['Runtime instance', instance?.stableRuntimeId ?? 'none selected'], ['Cell', instance ? `${instance.cell.id} (${instance.cell.x}, ${instance.cell.z})` : 'n/a'], ['Position', instance ? `${instance.worldPosition.x.toFixed?.(2) ?? instance.worldPosition.x}, ${instance.worldPosition.y.toFixed?.(2) ?? instance.worldPosition.y}, ${instance.worldPosition.z.toFixed?.(2) ?? instance.worldPosition.z}` : 'n/a']
  ]);
  const slots = ctx.representation.assetSlots ?? [];
  const sourceMode = ctx.representation.canonicalValues?.sourceMode;
  const sourceType = slots.length ? (sourceMode === 'procedural' ? 'Procedural' : 'NAL Asset') : 'Colour / material';
  $('#presentation-inspector').innerHTML = kv([
    ['Representation', ctx.representation.id], ['Binding', `${ctx.representation.binding.semanticTargetId} → ${ctx.representation.binding.representationId}`], ['Geometry', ctx.representation.geometryId ?? 'presentation-owned'], ['Source', sourceType], ['Materials', ctx.representation.materialIds.join(', ') || 'none'], ['Assets', slots.map((slot) => `${slot.label}: ${currentAsset(slot) || 'unbound'}`).join(' · ') || 'none'], ['LCG', ctx.representation.lcg ?? 'n/a'], ['Collision', ctx.representation.collisionMode], ['Fallback', ctx.representation.fallback ?? 'none']
  ]);
  $('#source-inspector').innerHTML = `<strong>${escape(ctx.ownership.definitionModule)}</strong>${stack(ctx.ownership.sourcePaths)}<small>Focused tests</small>${stack(ctx.ownership.relevantTests)}`;
  $('#diagnostics').innerHTML = stack([...ctx.diagnostics, ...ctx.validationWarnings]);
  $('#code-required').hidden = Boolean(selected?.structuredEditable);
  $('#preview-banner').hidden = Object.keys(ctx.representation.activePreviewOverrides ?? {}).length === 0 && Object.keys(ctx.representation.activeAssetSlotOverrides ?? {}).length === 0 && Object.keys(state.previewPatch).length === 0 && Object.keys(state.previewAssets).length === 0;
}
function parameterField(meta, value) {
  const description = escape([meta.unit, meta.description].filter(Boolean).join(' · '));
  if (meta.kind === 'boolean') return `<label>${escape(meta.label)}<input data-param="${escape(meta.key)}" type="checkbox" ${value ? 'checked' : ''}/><small>${description}</small></label>`;
  if (meta.kind === 'enum') return `<label>${escape(meta.label)}<select data-param="${escape(meta.key)}">${(meta.values ?? []).map((choice) => `<option value="${escape(choice)}" ${choice === value ? 'selected':''}>${escape(choice)}</option>`).join('')}</select><small>${description}</small></label>`;
  if (meta.kind === 'color') return `<label>${escape(meta.label)}<div class="color-control"><input data-param="${escape(meta.key)}" type="color" value="${escape(value)}"/><code>${escape(value)}</code></div><small>${description}</small></label>`;
  return `<label>${escape(meta.label)}<input data-param="${escape(meta.key)}" type="${meta.kind === 'number' ? 'number':'text'}" value="${escape(value)}" ${meta.min !== undefined ? `min="${meta.min}"`:''} ${meta.max !== undefined ? `max="${meta.max}"`:''} ${meta.step !== undefined ? `step="${meta.step}"`:''}/><small>${description}</small></label>`;
}
function assetSlotField(slot) {
  const selected = currentAsset(slot), asset = assetById(selected), choices = compatibleAssets(slot);
  const options = [`${slot.optional ? '<option value="">Procedural / unbound</option>' : ''}`, ...choices.map((item) => `<option value="${escape(item.id)}" ${item.id === selected ? 'selected':''}>${escape(item.id)}</option>`)].join('');
  return `<article class="asset-slot" data-slot-card="${escape(slot.key)}"><div><strong>${escape(slot.label)}</strong><small>${escape(slot.profile)} · ${escape(slot.roles.join(', '))}</small></div>${asset?.runtimePath ? `<img src="${escape(asset.runtimePath)}" alt="${escape(asset.id)} preview"/>` : '<div class="asset-placeholder">Procedural / no image bound</div>'}<label>Image Asset<select data-asset-slot="${escape(slot.key)}">${options}</select></label><div class="kv compact">${kv([['Asset ID', selected || 'none'], ['source', asset?.source ?? 'procedural'], ['size', asset?.image?.width && asset?.image?.height ? `${asset.image.width}×${asset.image.height}` : 'unknown'], ['runtime', asset?.runtimeStatus ?? (selected ? 'not built' : 'n/a')]])}</div><small>${escape(slot.description ?? '')}</small></article>`;
}
function renderEditor() {
  const ctx = state.contextPacket.context, def = definition(), editable = def?.editableParameters ?? [], slots = def?.assetSlots ?? [];
  const parameterHtml = editable.map((meta) => {
    const value = state.previewPatch[meta.key] ?? ctx.representation.activePreviewOverrides?.[meta.key] ?? ctx.representation.canonicalValues[meta.key];
    return parameterField(meta, value);
  }).join('');
  const slotHtml = slots.length ? `<div class="asset-slot-grid">${slots.map(assetSlotField).join('')}</div>` : '';
  $('#fields').innerHTML = parameterHtml || slotHtml ? `${parameterHtml}${slotHtml}` : '<p class="muted">This semantic target is inspectable but not safely editable. Use the development-context handoff for code-owned changes.</p>';
  $$('[data-param]').forEach((input) => input.addEventListener('input', () => {
    const meta = editable.find((candidate) => candidate.key === input.dataset.param);
    state.previewPatch[input.dataset.param] = meta?.kind === 'number' ? Number(input.value) : meta?.kind === 'boolean' ? input.checked : input.value;
    if (meta?.kind === 'color') input.parentElement.querySelector('code').textContent = input.value;
    $('#preview-banner').hidden = false;
  }));
  $$('[data-asset-slot]').forEach((select) => select.addEventListener('change', () => {
    state.previewAssets[select.dataset.assetSlot] = select.value;
    $('#preview-banner').hidden = false;
    renderEditor();
  }));
  const reps = representationOptions(ctx.designTarget.category);
  $('#representation').innerHTML = reps.map((rep) => `<option value="${escape(rep.id)}" ${rep.id === ctx.representation.binding.representationId ? 'selected':''}>${escape(rep.id)} — ${escape(rep.humanName)}</option>`).join('');
  $('#representation').disabled = !target()?.structuredEditable || reps.length === 0;
  $('#preview').disabled = !target()?.structuredEditable;
  $('#save').disabled = !target()?.structuredEditable;
}
function currentPatch() {
  const ctx = state.contextPacket.context, result = {};
  for (const [key,value] of Object.entries(state.previewPatch)) if (ctx.representation.canonicalValues[key] !== value) result[key] = value;
  return result;
}
function currentAssetPatch() {
  const result = {};
  for (const slot of state.contextPacket.context.representation.assetSlots ?? []) {
    const selected = currentAsset(slot);
    if (selected !== canonicalAsset(slot)) result[slot.key] = selected;
  }
  return result;
}
function selectedAssetSlotsForPreview() {
  const result = {};
  for (const slot of state.contextPacket.context.representation.assetSlots ?? []) {
    const selected = currentAsset(slot); if (selected) result[slot.key] = selected;
  }
  return result;
}
async function command(type, payload) { return api('/api/command', { method:'POST', body: JSON.stringify({ type, targetId: state.targetId, payload }) }); }
async function applyPreview() {
  const patch = currentPatch();
  if (Object.keys(patch).length) await command('preview-parameters', { parameters: patch });
  const assets = selectedAssetSlotsForPreview();
  if (Object.keys(assets).length) await command('preview-assets', { assetSlots: assets });
  const rep = $('#representation').value; if (rep && rep !== state.contextPacket.context.representation.binding.representationId) await command('preview-binding', { representationId: rep });
  $('#preview-banner').hidden = false; toast('Runtime preview applied — source unchanged'); setTimeout(refreshContext, 700);
}
async function revertPreview() { await command('clear-preview'); state.previewPatch = {}; state.previewAssets = {}; toast('Preview reverted to canonical source'); setTimeout(refreshContext,700); }
async function clearAllPreviews() { await command('clear-all-previews'); state.previewPatch = {}; state.previewAssets = {}; toast('All runtime previews cleared'); setTimeout(refreshContext,700); }
async function saveProject() {
  const patch = currentPatch(), assetSlotPatch = currentAssetPatch(), rep = $('#representation').value;
  const input = { targetId: state.targetId, parameterPatch: patch, assetSlotPatch, observation: $('#observation').value.trim() || undefined, requestedChange: $('#request').value.trim() || undefined };
  if (rep && rep !== state.contextPacket.context.representation.binding.representationId) input.representationId = rep;
  const result = await api('/api/save', { method:'POST', body: JSON.stringify(input) });
  state.receipt = result; state.previewPatch = {}; state.previewAssets = {}; $('#receipt-panel').hidden = false; $('#receipt-human').textContent = result.human;
  toast('Change saved to canonical structured source'); await reloadAll();
}
async function contextPacket({ observation = false, request = false } = {}) {
  const params = new URLSearchParams({ target: state.targetId, mode:'CHANGE' });
  if (observation && $('#observation').value.trim()) params.set('observation', $('#observation').value.trim());
  if (request && $('#request').value.trim()) params.set('request', $('#request').value.trim());
  return api(`/api/context?${params}`);
}
async function reloadAll() { state.bootstrap = await api('/api/bootstrap'); renderRepo(); renderTargets(); renderAssets(); renderHistory(); await refreshContext(); }
function showTab(name) { $$('.tab-panel').forEach((panel) => panel.hidden = panel.id !== `${name}-panel`); if (name === 'git') refreshDiff(); }
async function refreshDiff() { const result = await api('/api/diff'); $('#diff').textContent = result.diff || 'No Studio-owned Git diff.'; }
function renderProfiles() { $('#asset-profile').innerHTML = state.bootstrap.profiles.map((profile) => `<option value="${escape(profile.id)}">${escape(profile.id)} · ${escape(profile.type)}</option>`).join(''); }
function renderAssets() {
  const assets = state.bootstrap.assets.filter((asset) => asset.type === state.assetType);
  $('#asset-list').innerHTML = assets.length ? assets.map((asset) => {
    const bindings = compatibleBindings(asset);
    return `<article class="asset-card"><h3>${escape(asset.id)}</h3><p>${escape(asset.profile)} · ${escape(asset.role)}</p>${asset.type === 'image' && asset.runtimePath ? `<img src="${escape(asset.runtimePath)}" alt="${escape(asset.id)}"/>`:''}${asset.type === 'audio' && asset.runtimePath ? `<audio controls src="${escape(asset.runtimePath)}"></audio>`:''}${asset.type === 'mesh' ? `<p class="muted">GLB metadata preview · triangles ${escape(asset.mesh?.triangles ?? 'unknown')} · vertices ${escape(asset.mesh?.vertices ?? 'unknown')} · pivot ${escape(asset.mesh?.pivot ?? 'profile default')} · collision ${escape(asset.mesh?.collision ?? 'profile default')}</p>`:''}<div class="kv">${kv([['hash',asset.contentHash?.slice(0,16) ?? 'not built'],['runtime',asset.runtimeStatus ?? 'not built'],['source',asset.source],['usages',asset.usages?.join(', ') || 'unused'],['fallback',asset.fallback ?? 'none']])}</div>${bindings.length ? `<div class="actions wrap">${bindings.map(({targetId,slot}) => `<button data-use-target="${escape(targetId)}" data-use-slot="${escape(slot.key)}" data-use-asset="${escape(asset.id)}">Use for ${escape(targetLabel(targetId))} · ${escape(slot.label)}</button>`).join('')}</div>` : ''}</article>`;
  }).join('') : '<p class="muted">No assets in this category yet.</p>';
  $$('[data-use-target]').forEach((button) => button.addEventListener('click', async () => {
    await selectTarget(button.dataset.useTarget); state.previewAssets[button.dataset.useSlot] = button.dataset.useAsset; renderEditor(); $('#preview-banner').hidden = false; toast(`${button.dataset.useAsset} selected for preview`);
  }));
}
function renderHistory() {
  $('#history').innerHTML = state.bootstrap.receipts.length ? state.bootstrap.receipts.map((entry) => `<button class="target-button" data-receipt="${escape(entry.id)}"><strong>${escape(entry.receipt?.semanticTarget?.humanName ?? entry.id)}</strong><small>${escape(entry.receipt?.changeMode ?? '')} · ${escape(entry.createdAt)}</small></button>`).join('') : '<p class="muted">No local Studio receipts yet.</p>';
  $$('[data-receipt]').forEach((button) => button.addEventListener('click', async () => { state.receipt = await api(`/api/receipt?id=${encodeURIComponent(button.dataset.receipt)}`); $('#receipt-panel').hidden=false; $('#receipt-human').textContent=state.receipt.human; showTab('history'); }));
}
async function importAsset() {
  const file = $('#asset-file').files[0]; if (!file) throw new Error('Choose a file first');
  const bytes = new Uint8Array(await file.arrayBuffer()); let binary=''; for (let i=0;i<bytes.length;i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,i+0x8000));
  const result = await api('/api/assets/import', { method:'POST', body: JSON.stringify({ fileName:file.name, dataBase64:btoa(binary), assetId:$('#asset-id').value.trim(), profile:$('#asset-profile').value }) });
  state.receipt = result; $('#receipt-panel').hidden=false; $('#receipt-human').textContent=result.human; toast('Asset imported through NAL'); await reloadAll();
}
async function runValidation(action) { $('#validation-output').textContent=`Running ${action}…`; const result=await api('/api/validation',{method:'POST',body:JSON.stringify({action,targetId:state.targetId})}); $('#validation-output').textContent=JSON.stringify(result,null,2); toast(result.passed?'Validation passed':'Validation failed'); await reloadAll(); await refreshDiff(); }

$('#target-search').addEventListener('input', renderTargets);
$('#preview').addEventListener('click', () => applyPreview().catch((error)=>toast(error.message)));
$('#revert-preview').addEventListener('click', () => revertPreview().catch((error)=>toast(error.message)));
$('#clear-previews').addEventListener('click', () => clearAllPreviews().catch((error)=>toast(error.message)));
$('#save').addEventListener('click', () => saveProject().catch((error)=>toast(error.message)));
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
$('#revert-change').addEventListener('click',async()=>{if(!state.receipt?.id)return;try{await api('/api/revert',{method:'POST',body:JSON.stringify({receiptId:state.receipt.id})});state.receipt=null;$('#receipt-panel').hidden=true;toast('Studio change reverted');await reloadAll();}catch(error){toast(error.message)}});

loadBootstrap().catch((error) => { console.error(error); toast(error.message); });
