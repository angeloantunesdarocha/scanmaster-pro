import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';

async function toBytes(fileOrBytes) {
  if (fileOrBytes instanceof Uint8Array) return fileOrBytes;
  if (fileOrBytes instanceof ArrayBuffer) return new Uint8Array(fileOrBytes);
  if (fileOrBytes?.arrayBuffer) return new Uint8Array(await fileOrBytes.arrayBuffer());
  throw new TypeError('Entrada de PDF inválida.');
}

async function loadPdf(input) {
  return PDFDocument.load(await toBytes(input), { updateMetadata: false, ignoreEncryption: false });
}

export async function mergePdfs(inputs) {
  const output = await PDFDocument.create();
  for (const input of inputs) {
    const source = await loadPdf(input);
    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach(page => output.addPage(page));
  }
  return output.save({ useObjectStreams: true, addDefaultPage: false });
}

export async function extractPages(input, pageNumbers) {
  const source = await loadPdf(input);
  const output = await PDFDocument.create();
  const indices = [...new Set(pageNumbers)]
    .map(number => Number(number) - 1)
    .filter(index => Number.isInteger(index) && index >= 0 && index < source.getPageCount());
  const pages = await output.copyPages(source, indices);
  pages.forEach(page => output.addPage(page));
  return output.save({ useObjectStreams: true, addDefaultPage: false });
}

export async function rotatePdf(input, rotationDegrees) {
  const pdf = await loadPdf(input);
  const increment = Number(rotationDegrees) || 0;
  pdf.getPages().forEach(page => {
    const current = page.getRotation().angle || 0;
    page.setRotation(degrees((current + increment + 360) % 360));
  });
  return pdf.save({ useObjectStreams: true });
}

export async function watermarkPdf(input, options = {}) {
  const pdf = await loadPdf(input);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const text = String(options.text || 'ScanMaster Pro');
  const opacity = Math.min(1, Math.max(0.05, Number(options.opacity ?? 0.22)));
  const angle = Number(options.angle ?? -35);
  pdf.getPages().forEach(page => {
    const { width, height } = page.getSize();
    const size = Math.max(16, Math.min(width, height) * 0.055);
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size,
      font,
      color: rgb(0.35, 0.2, 0.75),
      opacity,
      rotate: degrees(angle)
    });
  });
  return pdf.save({ useObjectStreams: true });
}

export async function optimizePdfStructure(input) {
  const pdf = await loadPdf(input);
  /* Compressão estrutural sem destruir texto, links ou formulários.
     Não promete atingir tamanho exato: isso exigiria recompressão seletiva de imagens. */
  return pdf.save({ useObjectStreams: true, objectsPerTick: 30, updateFieldAppearances: false });
}

export function downloadPdf(bytes, fileName) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
