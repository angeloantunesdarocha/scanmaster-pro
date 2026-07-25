export const DOCUMENT_TYPES = [
  { id: 'rg_frente', label: 'RG — frente', keywords: ['rg frente', 'registro geral frente', 'identidade frente'] },
  { id: 'rg_verso', label: 'RG — verso', keywords: ['rg verso', 'registro geral verso', 'identidade verso'] },
  { id: 'cpf', label: 'CPF', keywords: ['cpf', 'cadastro de pessoas fisicas', 'cadastro de pessoa fisica'] },
  { id: 'cnh_frente', label: 'CNH — frente', keywords: ['cnh frente', 'carteira nacional de habilitacao frente'] },
  { id: 'cnh_verso', label: 'CNH — verso', keywords: ['cnh verso', 'carteira nacional de habilitacao verso'] },
  { id: 'comprovante_residencia', label: 'Comprovante de residência', keywords: ['comprovante de residencia', 'conta de luz', 'conta de agua', 'fatura de energia', 'endereco'] },
  { id: 'historico_escolar', label: 'Histórico escolar', keywords: ['historico escolar', 'boletim escolar', 'registro academico'] },
  { id: 'certificado', label: 'Certificado ou diploma', keywords: ['certificado', 'diploma', 'conclusao de curso'] },
  { id: 'curriculo', label: 'Currículo', keywords: ['curriculo', 'curriculum vitae', 'experiencia profissional'] },
  { id: 'carteira_trabalho', label: 'Carteira de trabalho', keywords: ['carteira de trabalho', 'ctps'] },
  { id: 'titulo_eleitor', label: 'Título de eleitor', keywords: ['titulo de eleitor', 'justica eleitoral'] },
  { id: 'certidao_nascimento', label: 'Certidão de nascimento', keywords: ['certidao de nascimento', 'nascimento'] },
  { id: 'certidao_casamento', label: 'Certidão de casamento', keywords: ['certidao de casamento', 'casamento'] },
  { id: 'declaracao', label: 'Declaração', keywords: ['declaracao', 'declaro para os devidos fins'] },
  { id: 'contrato', label: 'Contrato', keywords: ['contrato', 'contratante', 'contratado'] },
  { id: 'outro', label: 'Outro documento', keywords: [] }
];

export const DESTINATION_PROFILES = [
  { id: 'faculdade', label: 'Faculdade', description: 'Matrícula, assistência estudantil e processos acadêmicos.', required: ['rg_frente', 'rg_verso', 'cpf', 'comprovante_residencia', 'historico_escolar'], maxSizeMb: 10, oneFile: true },
  { id: 'concurso', label: 'Concurso', description: 'Inscrição, posse e comprovação de títulos.', required: ['rg_frente', 'rg_verso', 'cpf', 'comprovante_residencia'], maxSizeMb: 5, oneFile: true },
  { id: 'processo_seletivo', label: 'Processo seletivo', description: 'Seleções públicas, privadas e chamadas simplificadas.', required: ['rg_frente', 'rg_verso', 'cpf', 'comprovante_residencia'], maxSizeMb: 5, oneFile: true },
  { id: 'bolsa_estudantil', label: 'Bolsa estudantil', description: 'Comprovação de identidade, residência e vínculo acadêmico.', required: ['rg_frente', 'rg_verso', 'cpf', 'comprovante_residencia', 'historico_escolar'], maxSizeMb: 10, oneFile: true },
  { id: 'emprego', label: 'Emprego', description: 'Admissão, cadastro e envio ao setor de RH.', required: ['rg_frente', 'rg_verso', 'cpf', 'comprovante_residencia', 'curriculo'], maxSizeMb: 10, oneFile: true },
  { id: 'inss', label: 'INSS', description: 'Protocolos e requerimentos previdenciários.', required: ['rg_frente', 'rg_verso', 'cpf', 'comprovante_residencia'], maxSizeMb: 5, oneFile: true },
  { id: 'prefeitura', label: 'Prefeitura', description: 'Cadastros, benefícios e processos municipais.', required: ['rg_frente', 'rg_verso', 'cpf', 'comprovante_residencia'], maxSizeMb: 10, oneFile: true },
  { id: 'banco', label: 'Banco', description: 'Cadastro, atualização de dados e comprovação documental.', required: ['rg_frente', 'rg_verso', 'cpf', 'comprovante_residencia'], maxSizeMb: 10, oneFile: true },
  { id: 'email', label: 'E-mail', description: 'Arquivo leve para anexar sem perder legibilidade.', required: [], maxSizeMb: 20, oneFile: true },
  { id: 'whatsapp', label: 'WhatsApp', description: 'Documento organizado e leve para compartilhar no celular.', required: [], maxSizeMb: 16, oneFile: true },
  { id: 'portal', label: 'Portal com limite de arquivo', description: 'Perfil personalizado para qualquer portal.', required: [], maxSizeMb: 5, oneFile: true }
];

export function normalizeText(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_\-.]+/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function classifyDocument({ name = '', text = '' } = {}) {
  const haystack = normalizeText(`${name} ${text}`);
  let best = { id: 'outro', label: 'Outro documento', confidence: 0, matched: '' };
  for (const type of DOCUMENT_TYPES) {
    for (const keyword of type.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword || !haystack.includes(normalizedKeyword)) continue;
      const confidence = Math.min(0.98, 0.55 + normalizedKeyword.length / 70);
      if (confidence > best.confidence) best = { id: type.id, label: type.label, confidence, matched: keyword };
    }
  }
  return best;
}

export function documentTypeLabel(id) {
  return DOCUMENT_TYPES.find(item => item.id === id)?.label || 'Outro documento';
}

export function sanitizeFilePart(value, fallback = 'Documento') {
  const clean = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_');
  return clean || fallback;
}

export function buildOutputFileName({ personName, destinationLabel, processName } = {}) {
  return ['Documentos', sanitizeFilePart(personName, 'Usuario'), sanitizeFilePart(processName || destinationLabel, 'Entrega')].join('_') + '.pdf';
}

export function hammingDistance(first = '', second = '') {
  const length = Math.max(first.length, second.length);
  let distance = Math.abs(first.length - second.length);
  for (let index = 0; index < Math.min(first.length, second.length); index += 1) if (first[index] !== second[index]) distance += 1;
  return Math.min(distance, length);
}

export function findDuplicatePairs(items, threshold = 6) {
  const pairs = [];
  for (let first = 0; first < items.length; first += 1) {
    if (!items[first]?.hash) continue;
    for (let second = first + 1; second < items.length; second += 1) {
      if (!items[second]?.hash) continue;
      const distance = hammingDistance(items[first].hash, items[second].hash);
      if (distance <= threshold) pairs.push({ first, second, distance });
    }
  }
  return pairs;
}

export function evaluateDelivery({ required = [], documents = [], outputSizeBytes = 0, maxSizeBytes = Infinity } = {}) {
  const detected = new Set(documents.map(item => item.documentType).filter(Boolean));
  const missing = required.filter(id => !detected.has(id));
  const blockingQuality = documents.filter(item => item.quality?.blocking);
  const duplicates = documents.filter(item => item.duplicateOf != null);
  const sizeOk = outputSizeBytes > 0 && outputSizeBytes <= maxSizeBytes;
  return { ready: missing.length === 0 && blockingQuality.length === 0 && duplicates.length === 0 && sizeOk, missing, blockingQuality, duplicates, sizeOk, documentCount: detected.size, requiredCount: required.length };
}
