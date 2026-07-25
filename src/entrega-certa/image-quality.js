const MAX_ANALYSIS_SIDE = 1200;

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

async function decodeImage(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file, { imageOrientation: 'from-image' });
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } finally { URL.revokeObjectURL(url); }
}

function canvasForImage(image, maxSide = MAX_ANALYSIS_SIDE) {
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return { canvas, context };
}

function grayscalePixels(imageData) {
  const gray = new Uint8Array(imageData.width * imageData.height);
  const data = imageData.data;
  for (let source = 0, target = 0; source < data.length; source += 4, target += 1) gray[target] = Math.round(data[source] * 0.299 + data[source + 1] * 0.587 + data[source + 2] * 0.114);
  return gray;
}

function meanAndDeviation(values) {
  let sum = 0;
  for (const value of values) sum += value;
  const mean = sum / Math.max(1, values.length);
  let variance = 0;
  for (const value of values) variance += (value - mean) ** 2;
  return { mean, deviation: Math.sqrt(variance / Math.max(1, values.length)) };
}

function laplacianVariance(gray, width, height) {
  const samples = [];
  const step = Math.max(1, Math.floor(Math.max(width, height) / 700));
  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const value = gray[y * width + x] * -4 + gray[(y - 1) * width + x] + gray[(y + 1) * width + x] + gray[y * width + x - 1] + gray[y * width + x + 1];
      samples.push(value);
    }
  }
  return meanAndDeviation(samples).deviation ** 2;
}

function borderInkRatio(gray, width, height) {
  const border = Math.max(2, Math.round(Math.min(width, height) * 0.025));
  let ink = 0;
  let total = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (x >= border && x < width - border && y >= border && y < height - border) continue;
    total += 1;
    if (gray[y * width + x] < 205) ink += 1;
  }
  return ink / Math.max(1, total);
}

function glareRatio(imageData) {
  let glare = 0;
  const total = imageData.width * imageData.height;
  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index], green = imageData.data[index + 1], blue = imageData.data[index + 2];
    const max = Math.max(red, green, blue), min = Math.min(red, green, blue);
    if (max >= 250 && max - min <= 10) glare += 1;
  }
  return glare / Math.max(1, total);
}

function darkRatio(gray) {
  let dark = 0;
  for (const value of gray) if (value < 38) dark += 1;
  return dark / Math.max(1, gray.length);
}

function differenceHash(canvas) {
  const hashCanvas = document.createElement('canvas');
  hashCanvas.width = 9;
  hashCanvas.height = 8;
  const hashContext = hashCanvas.getContext('2d', { willReadFrequently: true });
  hashContext.drawImage(canvas, 0, 0, 9, 8);
  const gray = grayscalePixels(hashContext.getImageData(0, 0, 9, 8));
  let hash = '';
  for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) hash += gray[y * 9 + x] > gray[y * 9 + x + 1] ? '1' : '0';
  return hash;
}

export async function analyseImage(file) {
  const image = await decodeImage(file);
  try {
    const { canvas, context } = canvasForImage(image);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const gray = grayscalePixels(imageData);
    const brightness = meanAndDeviation(gray);
    const blurScore = laplacianVariance(gray, canvas.width, canvas.height);
    const glare = glareRatio(imageData);
    const darkness = darkRatio(gray);
    const borderInk = borderInkRatio(gray, canvas.width, canvas.height);
    const hash = differenceHash(canvas);
    const issues = [];
    if (blurScore < 85) issues.push({ id: 'blur', label: 'Possível desfoque', severity: blurScore < 45 ? 'block' : 'warn' });
    if (glare > 0.035) issues.push({ id: 'glare', label: 'Possível reflexo', severity: glare > 0.08 ? 'block' : 'warn' });
    if (brightness.mean < 78 || darkness > 0.22) issues.push({ id: 'shadow', label: 'Imagem escura ou com sombra', severity: brightness.mean < 52 ? 'block' : 'warn' });
    if (borderInk > 0.48) issues.push({ id: 'crop', label: 'Possível página cortada', severity: borderInk > 0.64 ? 'block' : 'warn' });
    if (brightness.deviation < 22) issues.push({ id: 'contrast', label: 'Contraste baixo', severity: 'warn' });
    const score = clamp(Math.round(100 - (blurScore < 85 ? 28 : 0) - glare * 220 - darkness * 80 - Math.max(0, borderInk - 0.28) * 65 - (brightness.deviation < 22 ? 14 : 0)), 0, 100);
    return {
      width: image.width,
      height: image.height,
      score,
      label: score >= 80 ? 'boa' : score >= 60 ? 'aceitável' : 'refazer captura',
      blocking: issues.some(issue => issue.severity === 'block'),
      issues,
      metrics: { blurScore: Math.round(blurScore), brightness: Math.round(brightness.mean), contrast: Math.round(brightness.deviation), glareRatio: Number(glare.toFixed(4)), borderInkRatio: Number(borderInk.toFixed(4)) },
      hash
    };
  } finally { if (typeof image.close === 'function') image.close(); }
}

export async function encodeImageAsJpeg(file, { maxSide = 2200, quality = 0.9 } = {}) {
  const image = await decodeImage(file);
  try {
    const { canvas } = canvasForImage(image, maxSide);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Não foi possível comprimir a imagem.')), 'image/jpeg', quality));
    return { bytes: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height };
  } finally { if (typeof image.close === 'function') image.close(); }
}
