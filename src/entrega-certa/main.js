import './styles.css';
import { DESTINATION_PROFILES, DOCUMENT_TYPES, buildOutputFileName, classifyDocument, documentTypeLabel, evaluateDelivery, findDuplicatePairs } from './core.js';
import { analyseImage } from './image-quality.js';
import { deliveryStorage, debounce } from './storage.js';
import { buildDeliveryPdf, bytesToFile, downloadFile, shareFile } from './pdf-delivery.js';

const state = { profileId: 'processo_seletivo', documents: [], outputFile: null, outputMeta: null, busy: false };
const elements = {
  profile: document.querySelector('#destinationProfile'), personName: document.querySelector('#personName'), processName: document.querySelector('#processName'), maxSize: document.querySelector('#maxSizeMb'),
  required: document.querySelector('#requiredDocuments'), input: document.querySelector('#documentInput'), pickButton: document.querySelector('#pickDocuments'), analyseButton: document.querySelector('#analyseDocuments'),
  prepareButton: document.querySelector('#prepareDelivery'), clearButton: document.querySelector('#clearWorkspace'), documents: document.querySelector('#documentList'), summary: document.querySelector('#deliverySummary'),
  status: document.querySelector('#saveStatus'), progress: document.querySelector('#progressBar'), downloadButton: document.querySelector('#downloadDelivery'), shareButton: document.querySelector('#shareDelivery')
};

function currentProfile() { return DESTINATION_PROFILES.find(profile => profile.id === state.profileId) || DESTINATION_PROFILES[0]; }
function formatBytes(bytes) { if (!Number.isFinite(bytes)) return '—'; return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(2).replace('.', ',')} MB`; }
function setBusy(busy, text = '') {
  state.busy = busy;
  document.body.classList.toggle('is-busy', busy);
  elements.analyseButton.disabled = busy || state.documents.length === 0;
  elements.prepareButton.disabled = busy || state.documents.length === 0;
  elements.pickButton.disabled = busy;
  elements.progress.hidden = !busy;
  if (text) elements.progress.textContent = text;
}
function renderProfiles() { elements.profile.innerHTML = DESTINATION_PROFILES.map(profile => `<option value="${profile.id}">${profile.label}</option>`).join(''); elements.profile.value = state.profileId; }
function renderRequirements() {
  const profile = currentProfile();
  elements.required.innerHTML = DOCUMENT_TYPES.filter(type => type.id !== 'outro').map(type => `<label class="check-item"><input type="checkbox" value="${type.id}" ${profile.required.includes(type.id) ? 'checked' : ''}><span>${type.label}</span></label>`).join('');
}
function selectedRequirements() { return [...elements.required.querySelectorAll('input:checked')].map(input => input.value); }
function qualityMarkup(quality) {
  if (!quality) return '<span class="pill neutral">Não analisado</span>';
  const className = quality.blocking ? 'danger' : quality.score >= 80 ? 'success' : 'warning';
  const issues = quality.issues.length ? quality.issues.map(issue => issue.label).join(' · ') : 'Sem alerta visual';
  return `<span class="pill ${className}">${quality.score}/100 · ${quality.label}</span><small>${issues}</small>`;
}
function renderDocuments() {
  if (state.documents.length === 0) { elements.documents.innerHTML = '<div class="empty-state">Adicione imagens ou PDFs. Os arquivos ficam somente neste dispositivo.</div>'; return; }
  elements.documents.innerHTML = state.documents.map((item, index) => {
    const duplicate = item.duplicateOf != null ? `<span class="pill danger">Possível duplicata da página ${item.duplicateOf + 1}</span>` : '';
    return `<article class="document-card" data-index="${index}"><div class="document-number">${index + 1}</div><div class="document-main"><strong title="${item.file.name}">${item.file.name}</strong><span>${formatBytes(item.file.size)} · ${item.file.type === 'application/pdf' ? 'PDF preservado' : 'Imagem'}</span><select class="document-type" aria-label="Tipo do documento">${DOCUMENT_TYPES.map(type => `<option value="${type.id}" ${type.id === item.documentType ? 'selected' : ''}>${type.label}</option>`).join('')}</select><div class="quality-line">${qualityMarkup(item.quality)}${duplicate}</div></div><div class="document-actions"><button type="button" class="move-up" aria-label="Mover para cima">↑</button><button type="button" class="move-down" aria-label="Mover para baixo">↓</button><button type="button" class="remove-document" aria-label="Remover">×</button></div></article>`;
  }).join('');
}
function renderSummary() {
  const profile = currentProfile();
  const required = selectedRequirements();
  const maxSizeBytes = Number(elements.maxSize.value || profile.maxSizeMb) * 1024 * 1024;
  const evaluation = evaluateDelivery({ required, documents: state.documents, outputSizeBytes: state.outputFile?.size || 0, maxSizeBytes });
  const missingText = evaluation.missing.length ? evaluation.missing.map(documentTypeLabel).join(', ') : 'Nenhum documento obrigatório pendente';
  elements.summary.innerHTML = `<div class="final-status ${evaluation.ready ? 'ready' : 'pending'}">${evaluation.ready ? 'PRONTO PARA ENVIAR' : 'AINDA PRECISA DE AJUSTES'}</div><dl><div><dt>Destino</dt><dd>${profile.label}</dd></div><div><dt>Arquivo</dt><dd>${state.outputFile?.name || 'Será gerado após a preparação'}</dd></div><div><dt>Tamanho</dt><dd>${state.outputFile ? formatBytes(state.outputFile.size) : '—'} / limite de ${elements.maxSize.value || profile.maxSizeMb} MB</dd></div><div><dt>Páginas</dt><dd>${state.outputMeta?.pageCount || '—'}</dd></div><div><dt>Documentos identificados</dt><dd>${evaluation.documentCount}${required.length ? ` de ${required.length}` : ''}</dd></div><div><dt>Pendências</dt><dd>${missingText}</dd></div></dl>${state.outputMeta && !state.outputMeta.reachedTarget ? '<p class="warning-box">O limite não foi alcançado sem rasterizar os PDFs nativos. As páginas originais foram preservadas; reduza ou remova algum PDF grande.</p>' : ''}`;
  elements.downloadButton.disabled = !state.outputFile;
  elements.shareButton.disabled = !state.outputFile;
}
function invalidateOutput() { state.outputFile = null; state.outputMeta = null; renderSummary(); }
function applyDuplicateDetection() { state.documents.forEach(item => { item.duplicateOf = null; }); for (const pair of findDuplicatePairs(state.documents, 6)) state.documents[pair.second].duplicateOf = pair.first; }

async function analyseDocuments() {
  setBusy(true, 'Analisando qualidade e páginas repetidas…');
  try {
    for (let index = 0; index < state.documents.length; index += 1) {
      const item = state.documents[index];
      elements.progress.textContent = `Analisando ${index + 1} de ${state.documents.length}: ${item.file.name}`;
      if (item.file.type.startsWith('image/')) { item.quality = await analyseImage(item.file); item.hash = item.quality.hash; }
      else item.quality = { score: 100, label: 'PDF nativo preservado', blocking: false, issues: [] };
      const detected = classifyDocument({ name: item.file.name });
      if (item.documentType === 'outro' && detected.id !== 'outro') item.documentType = detected.id;
    }
    applyDuplicateDetection(); invalidateOutput(); renderDocuments(); renderSummary();
  } catch (error) { alert(`Não foi possível concluir a análise: ${error.message}`); }
  finally { setBusy(false); scheduleSave(); }
}

async function prepareDelivery() {
  setBusy(true, 'Preparando documento final…');
  try {
    const profile = currentProfile();
    const maxSizeBytes = Number(elements.maxSize.value || profile.maxSizeMb) * 1024 * 1024;
    const result = await buildDeliveryPdf(state.documents, maxSizeBytes, progress => { elements.progress.textContent = `${progress.message} Tentativa ${progress.step} de ${progress.total}`; });
    const fileName = buildOutputFileName({ personName: elements.personName.value, destinationLabel: profile.label, processName: elements.processName.value });
    state.outputFile = bytesToFile(result.bytes, fileName); state.outputMeta = result; renderSummary(); await scheduleSave.flush();
  } catch (error) { alert(`Falha ao preparar a entrega: ${error.message}`); }
  finally { setBusy(false); }
}

function serializeWorkspace() {
  return { profileId: state.profileId, personName: elements.personName.value, processName: elements.processName.value, maxSizeMb: elements.maxSize.value, required: selectedRequirements(), documents: state.documents.map(item => ({ file: item.file, documentType: item.documentType, quality: item.quality, hash: item.hash, duplicateOf: item.duplicateOf })) };
}
async function saveWorkspace() {
  try { await deliveryStorage.save(serializeWorkspace()); elements.status.textContent = 'Trabalho salvo neste dispositivo'; }
  catch (error) { console.warn(error); elements.status.textContent = 'Não foi possível salvar automaticamente'; }
}
const scheduleSave = debounce(saveWorkspace, 700);
async function restoreWorkspace() {
  try {
    const saved = await deliveryStorage.load();
    if (!saved) return;
    state.profileId = saved.profileId || state.profileId;
    state.documents = Array.isArray(saved.documents) ? saved.documents.filter(item => item.file instanceof Blob) : [];
    renderProfiles(); elements.personName.value = saved.personName || ''; elements.processName.value = saved.processName || ''; elements.maxSize.value = saved.maxSizeMb || currentProfile().maxSizeMb; renderRequirements();
    if (Array.isArray(saved.required)) elements.required.querySelectorAll('input').forEach(input => { input.checked = saved.required.includes(input.value); });
    renderDocuments(); renderSummary(); elements.status.textContent = 'Trabalho anterior recuperado';
  } catch (error) { console.warn('Falha ao recuperar trabalho:', error); }
}
function addFiles(files) {
  const accepted = [...files].filter(file => file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
  for (const file of accepted) { const detected = classifyDocument({ name: file.name }); state.documents.push({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, file, documentType: detected.id, quality: null, hash: null, duplicateOf: null }); }
  invalidateOutput(); renderDocuments(); renderSummary(); scheduleSave();
}
function bindEvents() {
  elements.pickButton.addEventListener('click', () => elements.input.click());
  elements.input.addEventListener('change', event => { addFiles(event.target.files); event.target.value = ''; });
  elements.profile.addEventListener('change', () => { state.profileId = elements.profile.value; const profile = currentProfile(); elements.maxSize.value = profile.maxSizeMb; renderRequirements(); invalidateOutput(); renderSummary(); scheduleSave(); });
  elements.required.addEventListener('change', () => { invalidateOutput(); scheduleSave(); });
  [elements.personName, elements.processName, elements.maxSize].forEach(input => input.addEventListener('input', () => { invalidateOutput(); scheduleSave(); }));
  elements.analyseButton.addEventListener('click', analyseDocuments); elements.prepareButton.addEventListener('click', prepareDelivery);
  elements.downloadButton.addEventListener('click', () => state.outputFile && downloadFile(state.outputFile));
  elements.shareButton.addEventListener('click', async () => { if (!state.outputFile) return; if (!await shareFile(state.outputFile)) downloadFile(state.outputFile); });
  elements.clearButton.addEventListener('click', async () => { if (!confirm('Limpar todos os documentos e o trabalho salvo?')) return; state.documents = []; invalidateOutput(); await deliveryStorage.clear(); renderDocuments(); renderSummary(); elements.status.textContent = 'Trabalho limpo'; });
  elements.documents.addEventListener('change', event => { const card = event.target.closest('.document-card'); if (!card || !event.target.classList.contains('document-type')) return; state.documents[Number(card.dataset.index)].documentType = event.target.value; invalidateOutput(); renderSummary(); scheduleSave(); });
  elements.documents.addEventListener('click', event => {
    const card = event.target.closest('.document-card'); if (!card) return; const index = Number(card.dataset.index);
    if (event.target.closest('.remove-document')) state.documents.splice(index, 1);
    if (event.target.closest('.move-up') && index > 0) [state.documents[index - 1], state.documents[index]] = [state.documents[index], state.documents[index - 1]];
    if (event.target.closest('.move-down') && index < state.documents.length - 1) [state.documents[index + 1], state.documents[index]] = [state.documents[index], state.documents[index + 1]];
    applyDuplicateDetection(); invalidateOutput(); renderDocuments(); renderSummary(); scheduleSave();
  });
  window.addEventListener('pagehide', () => void saveWorkspace());
}
async function registerServiceWorker() { if ('serviceWorker' in navigator) try { await navigator.serviceWorker.register('/sw.js', { scope: '/' }); } catch (error) { console.warn(error); } }
async function start() { renderProfiles(); elements.maxSize.value = currentProfile().maxSizeMb; renderRequirements(); renderDocuments(); renderSummary(); bindEvents(); await Promise.allSettled([restoreWorkspace(), registerServiceWorker()]); }
start();
