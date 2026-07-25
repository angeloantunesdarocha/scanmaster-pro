export const CONVERSION_LABELS = Object.freeze({
  pdfToWord: {
    title: 'Extrair texto do PDF para Word',
    description: 'Cria um DOCX editável usando texto incorporado ou OCR. Não preserva fielmente tabelas, colunas, fontes, imagens e posicionamento.',
    outputSuffix: '-texto-extraido.docx'
  },
  wordToPdf: {
    title: 'Criar PDF visual a partir do Word',
    description: 'Gera uma aproximação visual em PDF. Documentos complexos podem apresentar diferenças de fontes, paginação, tabelas, cabeçalhos e elementos flutuantes.',
    outputSuffix: '-aproximacao-visual.pdf'
  },
  optimizePdf: {
    title: 'Otimizar estrutura do PDF',
    description: 'Reduz desperdícios estruturais quando possível, preservando texto e objetos. Não promete um tamanho final exato.'
  }
});

export function applyHonestConversionLabels(root = document) {
  const replacements = [
    ['PDF para Word editável', CONVERSION_LABELS.pdfToWord.title],
    ['PDF para Word', CONVERSION_LABELS.pdfToWord.title],
    ['Word para PDF preservando a formatação', CONVERSION_LABELS.wordToPdf.title],
    ['Word para PDF', CONVERSION_LABELS.wordToPdf.title],
    ['Comprimir PDF', CONVERSION_LABELS.optimizePdf.title]
  ];
  root.querySelectorAll('h1,h2,h3,p,button,label,span').forEach(element => {
    const original = element.textContent?.trim();
    const match = replacements.find(([from]) => original === from);
    if (match) element.textContent = match[1];
  });
}
