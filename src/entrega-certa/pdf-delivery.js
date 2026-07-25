import { PDFDocument } from 'pdf-lib';
import { encodeImageAsJpeg } from './image-quality.js';

const A4 = { width: 595.28, height: 841.89 };
const COMPRESSION_STEPS = [
  { maxSide: 2400, quality: 0.92 },
  { maxSide: 2100, quality: 0.86 },
  { maxSide: 1800, quality: 0.80 },
  { maxSide: 1500, quality: 0.72 },
  { maxSide: 1250, quality: 0.64 },
  { maxSide: 1050, quality: 0.56 }
];

async function appendNativePdf(output, file) {
  const source = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false, ignoreEncryption: false });
  const pages = await output.copyPages(source, source.getPageIndices());
  pages.forEach(page => output.addPage(page));
  return pages.length;
}

async function appendImage(output, file, compression) {
  const encoded = await encodeImageAsJpeg(file, compression);
  const image = await output.embedJpg(encoded.bytes);
  const landscape = encoded.width > encoded.height;
  const pageWidth = landscape ? A4.height : A4.width;
  const pageHeight = landscape ? A4.width : A4.height;
  const margin = 20;
  const scale = Math.min((pageWidth - margin * 2) / encoded.width, (pageHeight - margin * 2) / encoded.height);
  const drawWidth = encoded.width * scale;
  const drawHeight = encoded.height * scale;
  const page = output.addPage([pageWidth, pageHeight]);
  page.drawImage(image, { x: (pageWidth - drawWidth) / 2, y: (pageHeight - drawHeight) / 2, width: drawWidth, height: drawHeight });
  return 1;
}

async function buildOnce(documents, compression) {
  const output = await PDFDocument.create();
  let pageCount = 0;
  let containsNativePdf = false;
  for (const document of documents) {
    const file = document.file;
    if (!file) continue;
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      containsNativePdf = true;
      pageCount += await appendNativePdf(output, file);
    } else if (file.type.startsWith('image/')) pageCount += await appendImage(output, file, compression);
  }
  if (pageCount === 0) throw new Error('Adicione pelo menos uma imagem ou PDF válido.');
  output.setProducer('ScanMaster Pro — Entrega Certa');
  output.setCreator('ScanMaster Pro');
  const bytes = await output.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 30 });
  return { bytes, pageCount, containsNativePdf };
}

export async function buildDeliveryPdf(documents, maxSizeBytes, onProgress = () => {}) {
  let best = null;
  for (let index = 0; index < COMPRESSION_STEPS.length; index += 1) {
    onProgress({ step: index + 1, total: COMPRESSION_STEPS.length, message: 'Montando e ajustando o PDF…' });
    const result = await buildOnce(documents, COMPRESSION_STEPS[index]);
    if (!best || result.bytes.byteLength < best.bytes.byteLength) best = { ...result, compression: COMPRESSION_STEPS[index] };
    if (result.bytes.byteLength <= maxSizeBytes) return { ...result, compression: COMPRESSION_STEPS[index], reachedTarget: true };
    if (!documents.some(item => item.file?.type?.startsWith('image/'))) break;
  }
  return { ...best, reachedTarget: best.bytes.byteLength <= maxSizeBytes };
}

export function bytesToFile(bytes, fileName) {
  return new File([bytes], fileName, { type: 'application/pdf', lastModified: Date.now() });
}

export function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function shareFile(file) {
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) return false;
  await navigator.share({ title: 'Documento pronto para envio', text: 'PDF preparado pelo ScanMaster Pro.', files: [file] });
  return true;
}
