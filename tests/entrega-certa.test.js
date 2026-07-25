import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOutputFileName, classifyDocument, evaluateDelivery, findDuplicatePairs, hammingDistance, normalizeText } from '../src/entrega-certa/core.js';

test('normaliza acentos e separadores', () => {
  assert.equal(normalizeText('Histórico_Escolar-2026.PDF'), 'historico escolar 2026 pdf');
});

test('identifica comprovante de residência pelo nome', () => {
  assert.equal(classifyDocument({ name: 'conta_de_luz_julho.pdf' }).id, 'comprovante_residencia');
});

test('gera nome de arquivo seguro', () => {
  assert.equal(buildOutputFileName({ personName: 'Ângelo Antunes', processName: 'Processo Seletivo 2026' }), 'Documentos_Angelo_Antunes_Processo_Seletivo_2026.pdf');
});

test('calcula distância de hashes e duplicatas', () => {
  assert.equal(hammingDistance('1111', '1101'), 1);
  assert.deepEqual(findDuplicatePairs([{ hash: '1111' }, { hash: '1101' }, { hash: '0000' }], 1), [{ first: 0, second: 1, distance: 1 }]);
});

test('só marca pronto quando requisitos, qualidade, duplicatas e tamanho estão corretos', () => {
  const ready = evaluateDelivery({ required: ['cpf'], documents: [{ documentType: 'cpf', quality: { blocking: false }, duplicateOf: null }], outputSizeBytes: 900, maxSizeBytes: 1000 });
  assert.equal(ready.ready, true);
  const missing = evaluateDelivery({ required: ['cpf'], documents: [], outputSizeBytes: 900, maxSizeBytes: 1000 });
  assert.equal(missing.ready, false);
  assert.deepEqual(missing.missing, ['cpf']);
});
