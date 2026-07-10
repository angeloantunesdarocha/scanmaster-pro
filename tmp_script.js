
    const settingsKey = 'scanmaster-settings';
    const state = {
      pages: [],
      currentPageIdx: -1,
      currentStream: null,
      facingMode: 'environment',
      hasTorch: false,
      torchOn: false,
      generatedPdfUrl: '',
      generatedPdfName: '',
      importedFiles: [],
      extractData: { pages: [], selected: [] },
      settings: {
        theme: 'light',
        quality: 0.95,
        defaultName: 'documento_scan',
        pageSize: 'a4',
        watermark: false
      }
    ,
    watermarkConfig: {
      enabled: false,
      pattern: 'corporate',
      text: 'CONFIDENCIAL',
      color: '#E0E0E0',
      opacity: 0.2,
      font: 'Arial',
      angle: 45,
      position: 'diagonal',
      repeat: false,
      size: 'auto'
    }
    };

    const pageSizeNames = { a4: 'A4', letter: 'Carta', auto: 'Automático' };
    const pageSizes = { a4: 'a4', letter: 'letter', auto: 'a4' };
    let jsPDF = null;
    let lastFocusedElement = null;
    let activeModal = null;
    let disabledTabindexElements = [];

    const modalFocusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    function getFocusableElements(modal) {
      return Array.from(modal.querySelectorAll(modalFocusableSelectors))
        .filter(el => !el.disabled && el.offsetParent !== null);
    }

    function disableOutsideFocus(modal) {
      const allFocusable = Array.from(document.querySelectorAll(modalFocusableSelectors)).filter(el => !el.disabled && el.offsetParent !== null);
      disabledTabindexElements = allFocusable.filter(el => !modal.contains(el));
      disabledTabindexElements.forEach(el => {
        if (el.hasAttribute('tabindex')) {
          el.dataset.prevTabindex = el.getAttribute('tabindex');
        }
        el.setAttribute('tabindex', '-1');
      });
    }

    function restoreOutsideFocus() {
      disabledTabindexElements.forEach(el => {
        if (el.dataset.prevTabindex !== undefined) {
          el.setAttribute('tabindex', el.dataset.prevTabindex);
          delete el.dataset.prevTabindex;
        } else {
          el.removeAttribute('tabindex');
        }
      });
      disabledTabindexElements = [];
    }

    function openModal(id) {
      const modal = document.getElementById(id);
      if (!modal) return;
      lastFocusedElement = document.activeElement;
      activeModal = modal;
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      disableOutsideFocus(modal);
      document.addEventListener('focusin', trapFocus);
      const closeButton = modal.querySelector('.modal-close');
      const focusables = getFocusableElements(modal);
      if (closeButton) {
        closeButton.focus();
      } else if (focusables.length) {
        focusables[0].focus();
      }
    }

    function closeModal(id) {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('active');
      document.body.style.overflow = '';
      restoreOutsideFocus();
      document.removeEventListener('focusin', trapFocus);
      activeModal = null;
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
      lastFocusedElement = null;
    }

    function trapFocus(event) {
      if (!activeModal) return;
      if (activeModal.contains(event.target)) return;
      const focusables = getFocusableElements(activeModal);
      if (focusables.length) {
        event.preventDefault();
        focusables[0].focus();
      }
    }

    function handleModalKeydown(event) {
      window.__handleModalKeydownCount = (window.__handleModalKeydownCount || 0) + 1;
      if (!activeModal) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal(activeModal.id);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = getFocusableElements(activeModal);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    function revokeGeneratedPdf() {
      if (state.generatedPdfUrl) {
        try {
          URL.revokeObjectURL(state.generatedPdfUrl);
        } catch (e) {
          // ignore
        }
        state.generatedPdfUrl = '';
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      bindUI();
      loadSettings();
      renderNav();
      renderPages();
      renderImported();
      restoreTheme();
      updateInfoCards();
      jsPDF = window.jspdf?.jsPDF || window.jsPDF;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Seu navegador não suporta câmera', true);
      }
      document.addEventListener('keydown', handleModalKeydown);
    });

    function bindUI() {
      document.getElementById('themeToggle').addEventListener('click', toggleTheme);
      document.getElementById('openCameraBtn').addEventListener('click', openCamera);
      document.getElementById('closeCameraBtn').addEventListener('click', closeCamera);
      document.getElementById('switchCamBtn').addEventListener('click', toggleCamera);
      document.getElementById('toggleFlashBtn').addEventListener('click', toggleFlash);
      document.getElementById('captureBtn').addEventListener('click', capturePhoto);
      document.getElementById('addImageBtn').addEventListener('click', () => document.getElementById('fileInput').click());
      document.getElementById('fileInput').addEventListener('change', event => handleImageFiles(event.target.files));
      document.getElementById('generatePdfBtn').addEventListener('click', generatePdf);
      document.getElementById('downloadPdfBtn').addEventListener('click', downloadPdf);
      document.getElementById('closePreviewBtn').addEventListener('click', closePreview);
      document.getElementById('pdfQuality').addEventListener('change', saveSettings);
      document.getElementById('defaultName').addEventListener('input', saveSettings);
      document.getElementById('pageSize').addEventListener('change', saveSettings);
      document.getElementById('watermarkToggle').addEventListener('change', saveSettings);
      document.getElementById('mergeInput').addEventListener('change', mergePDFs);
      document.getElementById('compressInput').addEventListener('change', compressPDF);
      document.getElementById('extractInput').addEventListener('change', extractPages);
      document.getElementById('rotateInput').addEventListener('change', rotatePDF);
      document.getElementById('watermarkInput').addEventListener('change', addWatermark);
      document.getElementById('ocrInput').addEventListener('change', ocrProcess);
      document.getElementById('toJpgInput').addEventListener('change', pdfToJpg);
      document.getElementById('toPdfInput').addEventListener('change', imagesToPdf);
      document.getElementById('mergeBtn').addEventListener('click', () => document.getElementById('mergeInput').click());
      document.getElementById('compressBtn').addEventListener('click', () => document.getElementById('compressInput').click());
      document.getElementById('extractBtn').addEventListener('click', () => document.getElementById('extractInput').click());
      document.getElementById('rotateBtn').addEventListener('click', () => document.getElementById('rotateInput').click());
      document.getElementById('watermarkBtn').addEventListener('click', openWatermarkModal);
      document.getElementById('ocrBtn').addEventListener('click', () => document.getElementById('ocrInput').click());
      document.getElementById('toJpgBtn').addEventListener('click', () => document.getElementById('toJpgInput').click());
      document.getElementById('toPdfBtn').addEventListener('click', () => document.getElementById('toPdfInput').click());
      document.getElementById('closeWatermarkModalBtn').addEventListener('click', () => closeModal('watermarkModal'));
      document.getElementById('wmPreviewBtn').addEventListener('click', previewWatermark);
      document.getElementById('wmOpenPreviewBtn').addEventListener('click', previewWatermark);
      document.getElementById('closeWatermarkPreviewBtn').addEventListener('click', () => closeModal('watermarkPreviewModal'));
      document.getElementById('wmApplyBtn').addEventListener('click', applyWatermarkFromModal);
      document.getElementById('wmChooseFileBtn').addEventListener('click', () => document.getElementById('watermarkFileInput').click());
      document.getElementById('watermarkFileInput').addEventListener('change', event => {
        state.watermarkTempFile = event.target.files[0] || null;
        if (state.watermarkTempFile) previewWatermark();
        event.target.value = '';
      });
      document.getElementById('wmOpacity').addEventListener('input', event => {
        document.getElementById('wmOpacityLabel').textContent = event.target.value + '%';
      });
      document.getElementById('selectAll').addEventListener('change', toggleAllExtract);
      document.getElementById('closeExtractModalBtn').addEventListener('click', () => closeModal('extractModal'));
      document.getElementById('cancelExtractBtn').addEventListener('click', () => closeModal('extractModal'));
      document.getElementById('doExtractBtn').addEventListener('click', doExtract);
      document.getElementById('rotatePageBtn').addEventListener('click', () => rotateCurrentPage(90));
      document.getElementById('cropPageBtn').addEventListener('click', () => applyEdit('crop'));
      document.getElementById('sharpenPageBtn').addEventListener('click', () => applyEdit('sharpen'));
      document.getElementById('bwPageBtn').addEventListener('click', () => applyEdit('bw'));
      document.getElementById('grayscalePageBtn').addEventListener('click', () => applyEdit('grayscale'));
      document.getElementById('contrastPageBtn').addEventListener('click', () => applyEdit('contrast'));
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.target, btn));
      });
    }

    function renderNav() {
      const active = document.querySelector('.nav-btn.active');
      if (active) return;
      switchTab('scannerSection', document.querySelector('.nav-btn'));
    }

    function switchTab(target, button) {
      document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
      document.getElementById(target).classList.add('active');
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
      if (button) button.classList.add('active');
    }

    function loadSettings() {
      const saved = JSON.parse(localStorage.getItem(settingsKey) || '{}');
      state.settings = { ...state.settings, ...saved };
      document.getElementById('pdfQuality').value = state.settings.quality;
      document.getElementById('defaultName').value = state.settings.defaultName;
      document.getElementById('pageSize').value = state.settings.pageSize;
      document.getElementById('watermarkToggle').checked = state.settings.watermark;
      document.getElementById('themeSwitch').checked = state.settings.theme === 'dark';
      document.getElementById('qualityLabel').textContent = state.settings.quality === 0.95 ? 'Alta' : state.settings.quality === 0.8 ? 'Média' : 'Baixa';
      document.getElementById('pageSizeLabel').textContent = pageSizeNames[state.settings.pageSize];
    }

    function saveSettings() {
      state.settings.quality = parseFloat(document.getElementById('pdfQuality').value);
      state.settings.defaultName = document.getElementById('defaultName').value.trim() || 'documento_scan';
      state.settings.pageSize = document.getElementById('pageSize').value;
      state.settings.watermark = document.getElementById('watermarkToggle').checked;
      state.settings.theme = document.getElementById('themeSwitch').checked ? 'dark' : 'light';
      localStorage.setItem(settingsKey, JSON.stringify(state.settings));
      document.getElementById('qualityLabel').textContent = state.settings.quality === 0.95 ? 'Alta' : state.settings.quality === 0.8 ? 'Média' : 'Baixa';
      document.getElementById('pageSizeLabel').textContent = pageSizeNames[state.settings.pageSize];
      restoreTheme();
    }

    function restoreTheme() {
      const theme = state.settings.theme;
      document.documentElement.setAttribute('data-theme', theme);
      document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    function toggleTheme() {
      document.getElementById('themeSwitch').checked = !document.getElementById('themeSwitch').checked;
      saveSettings();
    }

    function openCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return showToast('Câmera indisponível no seu navegador.', true);
      }
      openModal('cameraModal');
      startCamera();
    }

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: state.facingMode }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false
        });
        state.currentStream = stream;
        const video = document.getElementById('video');
        video.srcObject = stream;
        await video.play();
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        state.hasTorch = !!(capabilities.torch);
        document.getElementById('toggleFlashBtn').style.opacity = state.hasTorch ? '1' : '0.4';
      } catch (error) {
        showToast('Erro ao abrir câmera: ' + error.message, true);
      }
    }

    function closeCamera() {
      if (state.currentStream) {
        state.currentStream.getTracks().forEach(track => track.stop());
      }
      state.currentStream = null;
      state.torchOn = false;
      closeModal('cameraModal');
    }

    async function toggleCamera() {
      state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment';
      if (state.currentStream) {
        closeCamera();
      }
      openCamera();
    }

    async function toggleFlash() {
      if (!state.currentStream) {
        return showToast('Abra a câmera primeiro.', true);
      }
      const track = state.currentStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      if (!capabilities.torch) {
        return showToast('Flash não disponível neste dispositivo.', true);
      }
      state.torchOn = !state.torchOn;
      try {
        await track.applyConstraints({ advanced: [{ torch: state.torchOn }] });
        showToast(state.torchOn ? 'Flash ativado' : 'Flash desativado');
      } catch (error) {
        showToast('Falha ao alternar flash.', true);
      }
    }

    function capturePhoto() {
      const video = document.getElementById('video');
      if (!video || video.readyState < 2) {
        return showToast('Câmera ainda não está pronta.', true);
      }
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', state.settings.quality);
      state.pages.push({ id: Date.now(), dataUrl, rotation: 0, filter: 'none' });
      renderPages();
      updateInfoCards();
      showToast('Página capturada com sucesso');
    }

    function handleImageFiles(files) {
      if (!files.length) return;
      Array.from(files).forEach(file => {
        if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
          const reader = new FileReader();
          reader.onload = event => {
            const text = event.target.result || '';
            const dataUrl = createTextPageDataUrl(text);
            state.pages.push({ id: Date.now() + Math.random(), dataUrl, rotation: 0, filter: 'none', textSource: true });
            renderPages();
            updateInfoCards();
          };
          reader.readAsText(file, 'UTF-8');
        } else if (file.type.startsWith('image/') || /\.(jpe?g|png)$/i.test(file.name)) {
          const reader = new FileReader();
          reader.onload = event => {
            state.pages.push({ id: Date.now() + Math.random(), dataUrl: event.target.result, rotation: 0, filter: 'none' });
            renderPages();
            updateInfoCards();
          };
          reader.readAsDataURL(file);
        } else {
          showToast('Formato não suportado. Use TXT, JPG, JPEG ou PNG.', true);
        }
      });
      document.getElementById('fileInput').value = '';
    }

    function createTextPageDataUrl(text) {
      const width = 1200;
      const height = 1650;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#111111';
      ctx.font = '26px Inter, system-ui, sans-serif';
      ctx.textBaseline = 'top';
      const padding = 48;
      const maxWidth = width - padding * 2;
      const lineHeight = 36;
      const lines = wrapText(text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'), ctx, maxWidth);
      let y = padding;
      ctx.fillStyle = '#222';
      for (const line of lines) {
        ctx.fillText(line, padding, y);
        y += lineHeight;
        if (y > height - padding) break;
      }
      return canvas.toDataURL('image/png');
    }

    function wrapText(text, ctx, maxWidth) {
      const words = text.split(/\s+/);
      const lines = [];
      let current = '';
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        const metrics = ctx.measureText(test);
        if (metrics.width > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines;
    }

    function renderPages() {
      const grid = document.getElementById('pagesGrid');
      grid.innerHTML = '';
      if (!state.pages.length) {
        const empty = document.createElement('div');
        empty.className = 'page-placeholder';
        empty.textContent = 'Nenhuma página adicionada. Use o scanner ou adicione imagens.';
        grid.appendChild(empty);
        return;
      }
      state.pages.forEach((page, index) => {
        const card = document.createElement('div');
        card.className = 'page-card';
        card.draggable = true;
        card.dataset.index = index;
        card.innerHTML = `
          <img src="${page.dataUrl}" alt="Página ${index + 1}">
          <div class="page-info">
            <strong>Página ${index + 1}</strong>
            <button class="page-remove" type="button" aria-label="Remover página">✕</button>
          </div>`;
        card.addEventListener('click', () => openPreview(index));
        card.querySelector('.page-remove').addEventListener('click', event => {
          event.stopPropagation();
          removePage(index);
        });
        card.addEventListener('dragstart', dragStart);
        card.addEventListener('dragover', dragOver);
        card.addEventListener('drop', dropPage);
        card.addEventListener('dragend', dragEnd);
        grid.appendChild(card);
      });
    }

    function dragStart(event) {
      event.currentTarget.classList.add('dragging');
      event.dataTransfer.setData('text/plain', event.currentTarget.dataset.index);
    }
    function dragOver(event) {
      event.preventDefault();
    }
    function dropPage(event) {
      event.preventDefault();
      const fromIndex = Number(event.dataTransfer.getData('text/plain'));
      const toIndex = Number(event.currentTarget.dataset.index);
      if (fromIndex === toIndex) return;
      const moved = state.pages.splice(fromIndex, 1)[0];
      state.pages.splice(toIndex, 0, moved);
      renderPages();
      showToast('Páginas reordenadas');
    }
    function dragEnd(event) {
      event.currentTarget.classList.remove('dragging');
    }

    function removePage(index) {
      state.pages.splice(index, 1);
      renderPages();
      updateInfoCards();
      showToast('Página removida');
    }

    function updateInfoCards() {
      document.getElementById('pageCount').textContent = state.pages.length;
      document.getElementById('qualityLabel').textContent = state.settings.quality === 0.95 ? 'Alta' : state.settings.quality === 0.8 ? 'Média' : 'Baixa';
      document.getElementById('pageSizeLabel').textContent = pageSizeNames[state.settings.pageSize];
    }

    function openPreview(index) {
      state.currentPageIdx = index;
      const page = state.pages[index];
      document.getElementById('previewImg').src = page.dataUrl;
      document.getElementById('previewLabel').textContent = `Página ${index + 1}`;
      openModal('previewModal');
    }

    function closePreview() {
      state.currentPageIdx = -1;
      closeModal('previewModal');
    }

    function applyEdit(action) {
      if (state.currentPageIdx < 0) return;
      const page = state.pages[state.currentPageIdx];
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        if (action === 'crop') {
          const crop = 0.08;
          const cropX = Math.round(width * crop);
          const cropY = Math.round(height * crop);
          const cropW = width - cropX * 2;
          const cropH = height - cropY * 2;
          const cropped = document.createElement('canvas');
          cropped.width = cropW;
          cropped.height = cropH;
          cropped.getContext('2d').drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          page.dataUrl = cropped.toDataURL('image/jpeg', state.settings.quality);
        } else if (action === 'sharpen') {
          const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
          convolve(ctx, imageData, kernel, 3);
          page.dataUrl = canvas.toDataURL('image/jpeg', state.settings.quality);
        } else if (action === 'bw') {
          for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const value = avg > 128 ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = value;
          }
          ctx.putImageData(imageData, 0, 0);
          page.dataUrl = canvas.toDataURL('image/jpeg', state.settings.quality);
        } else if (action === 'grayscale') {
          for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg;
          }
          ctx.putImageData(imageData, 0, 0);
          page.dataUrl = canvas.toDataURL('image/jpeg', state.settings.quality);
        } else if (action === 'contrast') {
          const f = (259 * (128 + 255)) / (255 * (259 - 128));
          for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp(f * (data[i] - 128) + 128);
            data[i + 1] = clamp(f * (data[i + 1] - 128) + 128);
            data[i + 2] = clamp(f * (data[i + 2] - 128) + 128);
          }
          ctx.putImageData(imageData, 0, 0);
          page.dataUrl = canvas.toDataURL('image/jpeg', state.settings.quality);
        }
        document.getElementById('previewImg').src = page.dataUrl;
        renderPages();
        showToast('Edição aplicada');
      };
      img.src = page.dataUrl;
    }

    function convolve(ctx, imageData, kernel, size) {
      const side = size;
      const half = Math.floor(side / 2);
      const src = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const output = ctx.createImageData(width, height);
      const dst = output.data;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0, g = 0, b = 0;
          for (let ky = 0; ky < side; ky++) {
            for (let kx = 0; kx < side; kx++) {
              const ix = x + kx - half;
              const iy = y + ky - half;
              if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
                const srcPos = (iy * width + ix) * 4;
                const wt = kernel[ky * side + kx];
                r += src[srcPos] * wt;
                g += src[srcPos + 1] * wt;
                b += src[srcPos + 2] * wt;
              }
            }
          }
          const dstPos = (y * width + x) * 4;
          dst[dstPos] = clamp(r);
          dst[dstPos + 1] = clamp(g);
          dst[dstPos + 2] = clamp(b);
          dst[dstPos + 3] = src[dstPos + 3];
        }
      }
      ctx.putImageData(output, 0, 0);
    }

    function clamp(value) {
      return Math.max(0, Math.min(255, value));
    }

    function rotateCurrentPage(deg) {
      if (state.currentPageIdx < 0) return;
      const page = state.pages[state.currentPageIdx];
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        if (deg % 180 === 0) {
          canvas.width = img.width;
          canvas.height = img.height;
        } else {
          canvas.width = img.height;
          canvas.height = img.width;
        }
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(deg * Math.PI / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        page.dataUrl = canvas.toDataURL('image/jpeg', state.settings.quality);
        document.getElementById('previewImg').src = page.dataUrl;
        renderPages();
        showToast('Imagem girada');
      };
      img.src = page.dataUrl;
    }

    async function generatePdf() {
      if (!state.pages.length) return showToast('Adicione pelo menos uma página.', true);
      revokeGeneratedPdf();
      showLoading('Gerando PDF...');
      try {
        const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: pageSizes[state.settings.pageSize] });
        const applyOnGenerate = state.watermarkConfig && state.watermarkConfig.applyOnGenerate;
        for (let index = 0; index < state.pages.length; index++) {
          const page = state.pages[index];
          if (index > 0) pdf.addPage();
          if (applyOnGenerate) {
            // draw image onto canvas, overlay watermark, then add
            const img = await new Promise(resolve => { const i=new Image(); i.onload=()=>resolve(i); i.src=page.dataUrl; });
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img,0,0);
            overlayWatermarkOnCanvas(ctx, canvas, state.watermarkConfig);
            const dataUrl = canvas.toDataURL('image/jpeg', state.settings.quality);
            const imgProps = pdf.getImageProperties(dataUrl);
            const pw = pdf.internal.pageSize.getWidth();
            const ph = pdf.internal.pageSize.getHeight();
            const ratio = Math.min(pw / imgProps.width, ph / imgProps.height);
            const w = imgProps.width * ratio;
            const h = imgProps.height * ratio;
            const x = (pw - w) / 2;
            const y = (ph - h) / 2;
            pdf.addImage(dataUrl, 'JPEG', x, y, w, h, undefined, 'FAST');
          } else {
            const imgProps = pdf.getImageProperties(page.dataUrl);
            const pw = pdf.internal.pageSize.getWidth();
            const ph = pdf.internal.pageSize.getHeight();
            const ratio = Math.min(pw / imgProps.width, ph / imgProps.height);
            const w = imgProps.width * ratio;
            const h = imgProps.height * ratio;
            const x = (pw - w) / 2;
            const y = (ph - h) / 2;
            pdf.addImage(page.dataUrl, 'JPEG', x, y, w, h, undefined, 'FAST');
          }
        }
        state.generatedPdfName = `${state.settings.defaultName || 'documento_scan'}.pdf`;
        state.generatedPdfUrl = pdf.output('bloburl');
        showToast('PDF gerado com sucesso');
      } catch (error) {
        showToast('Erro ao gerar PDF: ' + error.message, true);
      } finally {
        hideLoading();
      }
    }

    function downloadPdf() {
      if (!state.generatedPdfUrl) {
        return showToast('Gere o PDF antes de baixar.', true);
      }
      const link = document.createElement('a');
      link.href = state.generatedPdfUrl;
      link.download = state.generatedPdfName || `${state.settings.defaultName || 'documento_scan'}.pdf`;
      link.click();
      revokeGeneratedPdf();
      showToast('Download iniciado');
    }

    function readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function showLoading(text) {
      document.getElementById('loadingText').textContent = text;
      document.getElementById('loading').classList.add('active');
      updateProgress(0);
    }

    function hideLoading() {
      document.getElementById('loading').classList.remove('active');
      updateProgress(0);
    }

    function updateProgress(value) {
      document.getElementById('progressFill').style.width = `${Math.round(value * 100)}%`;
    }

    function showToast(message, isError = false) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.style.background = isError ? 'rgba(211,47,47,0.96)' : 'var(--surface)';
      toast.style.color = isError ? '#fff' : 'var(--text)';
      toast.classList.add('show');
      clearTimeout(toast.timeout);
      toast.timeout = setTimeout(() => toast.classList.remove('show'), 2800);
    }

    function handleImport(event) {
      const files = Array.from(event.target.files);
      files.forEach(file => state.importedFiles.push({ name: file.name, size: file.size, type: file.type, file }));
      renderImported();
      event.target.value = '';
      showToast('Arquivos importados');
    }

    function renderImported() {
      const list = document.getElementById('importedList');
      list.innerHTML = '';
      state.importedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        const icon = file.type.includes('pdf') ? '📄' : file.type.startsWith('image/') ? '🖼️' : '📁';
        item.innerHTML = `
          <div class="file-icon">${icon}</div>
          <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-size">${formatBytes(file.size)}</div>
          </div>
          <button class="icon-btn remove-imported-btn" type="button" aria-label="Remover arquivo" style="width:38px;height:38px;border-radius:14px;">✕</button>`;
        item.querySelector('.remove-imported-btn').addEventListener('click', () => removeImported(index));
        list.appendChild(item);
      });
    }

    function removeImported(index) {
      state.importedFiles.splice(index, 1);
      renderImported();
    }

    function formatBytes(bytes) {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1048576).toFixed(1)} MB`;
    }

    async function mergePDFs(event) {
      const files = Array.from(event.target.files);
      if (files.length < 2) return showToast('Selecione pelo menos 2 PDFs.', true);
      showLoading('Mesclando PDFs...');
      try {
        const outputPdf = new jsPDF({ compress: true });
        let pageCount = 0;
        for (const file of files) {
          const buffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            const image = canvas.toDataURL('image/jpeg', 0.85);
            if (pageCount > 0) outputPdf.addPage();
            const props = outputPdf.getImageProperties(image);
            const pdfWidth = outputPdf.internal.pageSize.getWidth();
            const ratio = pdfWidth / props.width;
            outputPdf.addImage(image, 'JPEG', 0, 0, props.width * ratio, props.height * ratio, undefined, 'FAST');
            pageCount++;
            updateProgress(pageCount / (pdf.numPages * files.length));
          }
        }
        outputPdf.save('pdf_mesclado.pdf');
        showToast('PDF mesclado com sucesso');
      } catch (error) {
        showToast('Erro ao mesclar: ' + error.message, true);
      } finally {
        hideLoading();
        event.target.value = '';
      }
    }

    async function compressPDF(event) {
      const file = event.target.files[0];
      if (!file) return;
      showLoading('Comprimindo PDF...');
      try {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const outputPdf = new jsPDF({ compress: true });
        for (let i = 1; i <= pdf.numPages; i++) {
          if (i > 1) outputPdf.addPage();
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          const image = canvas.toDataURL('image/jpeg', 0.7);
          const props = outputPdf.getImageProperties(image);
          const pdfWidth = outputPdf.internal.pageSize.getWidth();
          const ratio = pdfWidth / props.width;
          outputPdf.addImage(image, 'JPEG', 0, 0, props.width * ratio, props.height * ratio, undefined, 'FAST');
          updateProgress(i / pdf.numPages);
        }
        outputPdf.save('pdf_comprimido.pdf');
        showToast('PDF comprimido');
      } catch (error) {
        showToast('Erro ao comprimir: ' + error.message, true);
      } finally {
        hideLoading();
        event.target.value = '';
      }
    }

    async function extractPages(event) {
      const file = event.target.files[0];
      if (!file) return;
      showLoading('Carregando PDF...');
      try {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        state.extractData = { pages: [], selected: [] };
        const grid = document.getElementById('extractGrid');
        grid.innerHTML = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          state.extractData.pages.push({ num: i, dataUrl });
          state.extractData.selected.push(false);
          const card = document.createElement('div');
          card.className = 'page-card';
          card.id = `ex-${i}`;
          card.setAttribute('role', 'button');
          card.tabIndex = 0;
          card.setAttribute('aria-pressed', 'false');
          card.innerHTML = `<img src="${dataUrl}"><div class="page-info"><strong>Pág ${i}</strong></div>`;
          card.style.border = '2px solid transparent';
          card.addEventListener('click', () => toggleExtract(i - 1));
          card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleExtract(i - 1);
            }
          });
          grid.appendChild(card);
          updateProgress(i / pdf.numPages);
        }
        openModal('extractModal');
      } catch (error) {
        showToast('Erro ao carregar PDF: ' + error.message, true);
      } finally {
        hideLoading();
        event.target.value = '';
      }
    }

    function toggleExtract(index) {
      state.extractData.selected[index] = !state.extractData.selected[index];
      const card = document.getElementById(`ex-${index + 1}`);
      const isSelected = state.extractData.selected[index];
      card.style.borderColor = isSelected ? 'var(--primary)' : 'transparent';
      card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    }

    function toggleAllExtract() {
      const all = document.getElementById('selectAll').checked;
      state.extractData.selected = state.extractData.pages.map(() => all);
      state.extractData.pages.forEach((item, index) => {
        const card = document.getElementById(`ex-${index + 1}`);
        card.style.borderColor = all ? 'var(--primary)' : 'transparent';
      });
    }

    async function doExtract() {
      const selected = state.extractData.pages.filter((_, index) => state.extractData.selected[index]);
      if (!selected.length) return showToast('Selecione pelo menos uma página.', true);
      showLoading('Gerando PDF...');
      try {
        const pdf = new jsPDF({ compress: true });
        selected.forEach((item, index) => {
          if (index > 0) pdf.addPage();
          const props = pdf.getImageProperties(item.dataUrl);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const ratio = pdfWidth / props.width;
          pdf.addImage(item.dataUrl, 'JPEG', 0, 0, props.width * ratio, props.height * ratio, undefined, 'FAST');
        });
        pdf.save('paginas_extraidas.pdf');
        showToast('Páginas extraídas');
        closeModal('extractModal');
      } catch (error) {
        showToast('Erro ao extrair: ' + error.message, true);
      } finally {
        hideLoading();
      }
    }

    async function rotatePDF(event) {
      const file = event.target.files[0];
      if (!file) return;
      const angle = prompt('Informe ângulo: 90, 180 ou 270', '90');
      const deg = parseInt(angle, 10);
      if (![90, 180, 270].includes(deg)) return showToast('Ângulo inválido', true);
      showLoading('Rotacionando PDF...');
      try {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const outputPdf = new jsPDF({ compress: true });
        for (let i = 1; i <= pdf.numPages; i++) {
          if (i > 1) outputPdf.addPage();
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          if (deg === 90 || deg === 270) {
            canvas.width = viewport.height;
            canvas.height = viewport.width;
          } else {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
          }
          const ctx = canvas.getContext('2d');
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(deg * Math.PI / 180);
          ctx.drawImage(await renderPdfPageToCanvas(page, viewport), -viewport.width / 2, -viewport.height / 2);
          const image = canvas.toDataURL('image/jpeg', 0.85);
          const props = outputPdf.getImageProperties(image);
          const pdfWidth = outputPdf.internal.pageSize.getWidth();
          const ratio = pdfWidth / props.width;
          outputPdf.addImage(image, 'JPEG', 0, 0, props.width * ratio, props.height * ratio, undefined, 'FAST');
          updateProgress(i / pdf.numPages);
        }
        outputPdf.save('pdf_rotacionado.pdf');
        showToast('PDF rotacionado');
      } catch (error) {
        showToast('Erro: ' + error.message, true);
      } finally {
        hideLoading();
        event.target.value = '';
      }
    }

    async function renderPdfPageToCanvas(page, viewport) {
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      return canvas;
    }

    function samplePageLightness(ctx, width, height) {
      const sampleCols = 36;
      const sampleRows = 36;
      const stepX = Math.max(1, Math.floor(width / sampleCols));
      const stepY = Math.max(1, Math.floor(height / sampleRows));
      const imageData = ctx.getImageData(0, 0, width, height).data;
      let total = 0;
      let count = 0;
      for (let y = 0; y < height; y += stepY) {
        for (let x = 0; x < width; x += stepX) {
          const idx = (y * width + x) * 4;
          const r = imageData[idx];
          const g = imageData[idx + 1];
          const b = imageData[idx + 2];
          total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
          count++;
        }
      }
      return count ? total / count / 255 : 0.75;
    }

    async function addWatermark(event) {
      const file = event.target.files[0];
      if (!file) return;
      const text = prompt('Texto da marca d\'água:', 'CONFIDENCIAL');
      if (!text) return showToast('Marca d\'água cancelada', true);
      showLoading('Aplicando marca...');
      try {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const outputPdf = new jsPDF({ compress: true });
        for (let i = 1; i <= pdf.numPages; i++) {
          if (i > 1) outputPdf.addPage();
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          const pageLightness = samplePageLightness(ctx, canvas.width, canvas.height);
          const watermarkAlpha = Math.min(0.72, Math.max(0.35, 0.45 + (pageLightness - 0.65) * 0.4));
          const isLightPage = pageLightness > 0.65;
          const watermarkColor = isLightPage ? '#1e1e1e' : '#f2f2f2';
          const outlineColor = isLightPage ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
          ctx.save();
          ctx.globalAlpha = watermarkAlpha;
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 4);
          ctx.font = `bold ${Math.round(canvas.width / 10)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = watermarkColor;
          ctx.strokeStyle = outlineColor;
          ctx.lineWidth = Math.max(2, canvas.width * 0.004);
          ctx.shadowColor = isLightPage ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
          ctx.shadowBlur = Math.max(2, canvas.width * 0.0025);
          ctx.strokeText(text, 0, 0);
          ctx.fillText(text, 0, 0);
          ctx.restore();
          const image = canvas.toDataURL('image/jpeg', 0.85);
          const props = outputPdf.getImageProperties(image);
          const pdfWidth = outputPdf.internal.pageSize.getWidth();
          const ratio = pdfWidth / props.width;
          outputPdf.addImage(image, 'JPEG', 0, 0, props.width * ratio, props.height * ratio, undefined, 'FAST');
          updateProgress(i / pdf.numPages);
        }
        outputPdf.save('pdf_marca_dagua.pdf');
        showToast('Marca d\'água aplicada');
      } catch (error) {
        showToast('Erro: ' + error.message, true);
      } finally {
        hideLoading();
        event.target.value = '';
      }
    }

    function getWmConfigFromForm() {
      const pattern = document.getElementById('wmPattern').value;
      const text = (document.getElementById('wmText').value || '').trim() || (pattern === 'corporate' ? 'RASCUNHO' : pattern === 'critical' ? 'CONFIDENCIAL' : 'INSTITUCIONAL');
      const color = document.getElementById('wmColor').value || '#E0E0E0';
      let opacity = parseInt(document.getElementById('wmOpacity').value, 10) / 100;
      opacity = Math.max(0.1, Math.min(0.85, opacity));
      const font = document.getElementById('wmFont').value || 'Arial';
      const angle = parseFloat(document.getElementById('wmAngle').value) || 45;
      const position = document.getElementById('wmPosition').value || 'diagonal';
      const repeat = document.getElementById('wmRepeat').checked || (position === 'repeated');
      return { pattern, text, color, opacity, font, angle, position, repeat, size: 'auto' };
    }

    function openWatermarkModal() {
      const cfg = { ...state.watermarkConfig };
      document.getElementById('wmPattern').value = cfg.pattern || 'corporate';
      document.getElementById('wmText').value = cfg.text || '';
      document.getElementById('wmColor').value = cfg.color || '#E0E0E0';
      document.getElementById('wmOpacity').value = Math.round((cfg.opacity || 0.2) * 100);
      document.getElementById('wmOpacityLabel').textContent = Math.round((cfg.opacity || 0.2) * 100) + '%';
      document.getElementById('wmFont').value = cfg.font || 'Arial';
      document.getElementById('wmAngle').value = cfg.angle || 45;
      document.getElementById('wmPosition').value = cfg.position || 'diagonal';
      document.getElementById('wmRepeat').checked = !!cfg.repeat;
      state.watermarkTempFile = null;
      openModal('watermarkModal');
      // initial preview
      setTimeout(() => previewWatermark(), 150);
    }

    async function previewWatermark() {
      const cfg = getWmConfigFromForm();
      openModal('watermarkPreviewModal');
      await new Promise(r => setTimeout(r, 60));
      const sheet = document.querySelector('#watermarkPreviewModal .wm-sheet');
      const sheetCanvas = document.getElementById('wmSheetCanvas');
      const overlayCanvas = document.getElementById('wmOverlayCanvas');
      const dpr = window.devicePixelRatio || 1;
      const rect = sheet.getBoundingClientRect();
      // determine CSS display size for sheet (respect aspect-ratio)
      const displayWidth = Math.min(rect.width, 700);
      const displayHeight = displayWidth * 297 / 210; // A4 ratio
      // set canvas sizes (pixel) and CSS size
      sheetCanvas.style.width = displayWidth + 'px';
      sheetCanvas.style.height = displayHeight + 'px';
      overlayCanvas.style.width = displayWidth + 'px';
      overlayCanvas.style.height = displayHeight + 'px';
      sheetCanvas.width = Math.round(displayWidth * dpr);
      sheetCanvas.height = Math.round(displayHeight * dpr);
      overlayCanvas.width = Math.round(displayWidth * dpr);
      overlayCanvas.height = Math.round(displayHeight * dpr);
      const sCtx = sheetCanvas.getContext('2d');
      const oCtx = overlayCanvas.getContext('2d');
      // scale contexts to CSS pixels
      sCtx.setTransform(dpr,0,0,dpr,0,0);
      oCtx.setTransform(dpr,0,0,dpr,0,0);
      // clear canvases
      sCtx.clearRect(0,0,displayWidth,displayHeight);
      oCtx.clearRect(0,0,displayWidth,displayHeight);
      // attempt to render real PDF first if available
      if (state.watermarkTempFile) {
        try {
          const buffer = await state.watermarkTempFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
          const page = await pdf.getPage(1);
          const vp = page.getViewport({ scale: 1 });
          const tmp = document.createElement('canvas');
          tmp.width = vp.width;
          tmp.height = vp.height;
          await page.render({ canvasContext: tmp.getContext('2d'), viewport: vp }).promise;
          // draw into sheet canvas fitting full area
          sCtx.drawImage(tmp, 0, 0, displayWidth, displayHeight);
        } catch (e) {
          console.warn('Preview render PDF failed', e);
          // continue to other fallbacks
        }
      }
      // if no watermarkTempFile or failed, use app pages first
      if ((!state.watermarkTempFile || sCtx.getImageData(0,0,1,1).data.every(v=>v===0)) && state.pages && state.pages.length) {
        const img = new Image();
        img.onload = () => {
          sCtx.drawImage(img, 0, 0, displayWidth, displayHeight);
        };
        img.src = state.pages[0].dataUrl;
      }
      // if still blank, draw A4 simulation
      const pixelCheck = sCtx.getImageData(0,0,1,1).data;
      if (!pixelCheck || pixelCheck.every(v => v === 0)) {
        sCtx.fillStyle = '#ffffff';
        sCtx.fillRect(0,0,displayWidth,displayHeight);
        sCtx.fillStyle = '#111';
        sCtx.font = `${Math.round(displayWidth * 0.035)}px Arial`;
        sCtx.fillText('Documento — amostra de pré-visualização', 24, 48);
        // add some faux paragraphs
        sCtx.fillStyle = '#333';
        sCtx.font = `${Math.round(displayWidth * 0.026)}px Arial`;
        for (let i=0;i<10;i++) {
          sCtx.fillText('Este é um texto de exemplo para simular o conteúdo de uma página A4.', 24, 100 + i*28);
        }
      }
      // draw watermark overlay on overlay canvas
      const overlayCfg = cfg;
      overlayWatermarkOnCanvas(oCtx, overlayCanvas, overlayCfg);
      // ensure overlay sits above sheet visually (z-index handled by modal markup)
    }

    // --- OCR helpers ---
    function preprocessCanvasForOcr(canvas) {
      const ctx = canvas.getContext('2d');
      // operate on pixel data in-place
      let img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = img.data;
      // convert to grayscale & compute average luminance
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        data[i] = data[i + 1] = data[i + 2] = l;
        sum += l;
      }
      const avg = sum / (canvas.width * canvas.height);
      // contrast boost
      const contrast = 24; // mild contrast
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      for (let i = 0; i < data.length; i += 4) {
        let v = data[i];
        v = factor * (v - 128) + 128;
        v = Math.max(0, Math.min(255, Math.round(v)));
        data[i] = data[i + 1] = data[i + 2] = v;
      }
      // simple sharpen kernel
      const copy = new Uint8ClampedArray(data);
      const w = canvas.width, h = canvas.height;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          const center = copy[idx];
          const top = copy[((y - 1) * w + x) * 4];
          const bottom = copy[((y + 1) * w + x) * 4];
          const left = copy[(y * w + (x - 1)) * 4];
          const right = copy[(y * w + (x + 1)) * 4];
          // sharpen: center*5 - neighbors
          let val = center * 5 - (top + bottom + left + right);
          val = Math.max(0, Math.min(255, Math.round(val)));
          data[idx] = data[idx + 1] = data[idx + 2] = val;
        }
      }
      // optional binarize if very low contrast
      if (avg < 90 || avg > 240) {
        // do nothing extreme
      } else {
        // adaptive-ish threshold
        const threshold = Math.round(avg * 0.95);
        for (let i = 0; i < data.length; i += 4) {
          const v = data[i] < threshold ? 0 : data[i];
          data[i] = data[i + 1] = data[i + 2] = v;
        }
      }
      ctx.putImageData(img, 0, 0);
      return canvas;
    }

    function cleanOcrText(raw) {
      if (!raw) return '';
      let t = raw;
      // remove control chars except line breaks and tabs
      t = t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/g, '');
      // normalize different dash/hyphen chars
      t = t.replace(/[\u2012\u2013\u2014\u2015]/g, '-');
      // remove weird symbols but keep common punctuation and letters (including accents)
      t = t.replace(/[^\w\d\s\-–—.,:;()\[\]"'¿?¡!%°À-ÿ\n\r]/g, '');
      // join words split by hyphen at line breaks
      t = t.replace(/-\s*\n\s*/g, '');
      // collapse multiple spaces
      t = t.replace(/[ \t]{2,}/g, ' ');
      // remove trailing spaces at line ends
      t = t.split('\n').map(l => l.replace(/[ \t]+$/g, '')).join('\n');
      // collapse multiple blank lines to max two
      t = t.replace(/(\n\s*){3,}/g, '\n\n');
      // ensure page separators are clearly delimited
      t = t.replace(/---+\s*Página\s*(\d+)\s*-*/gi, '\n--- Página $1 ---\n');
      return t.trim();
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function measureWatermarkText(text, fontSize, fontFamily) {
      const tmpCanvas = document.createElement('canvas');
      const tmpCtx = tmpCanvas.getContext('2d');
      tmpCtx.font = `bold ${fontSize}px ${fontFamily}`;
      const metrics = tmpCtx.measureText(text);
      return {
        width: metrics.width,
        height: fontSize,
        actualHeight: (metrics.actualBoundingBoxAscent || fontSize * 0.8) + (metrics.actualBoundingBoxDescent || fontSize * 0.2)
      };
    }

    function calculateWatermarkLayout(canvasWidth, canvasHeight, cfg) {
      const text = (cfg.text || 'CONFIDENCIAL').trim() || 'CONFIDENCIAL';
      const position = cfg.position || 'diagonal';
      const repeat = position === 'repeated' || !!cfg.repeat;
      const angleDeg = position === 'center' ? 0 : (parseFloat(cfg.angle) || 45);
      const angle = (angleDeg % 360) * Math.PI / 180;
      const color = cfg.color || '#E0E0E0';
      const opacity = Math.max(0.1, Math.min(0.95, cfg.opacity || 0.2));
      const fontFamily = cfg.font || 'Arial';
      const minSize = repeat ? 28 : position === 'center' ? 36 : 48;
      const maxSize = repeat ? 56 : position === 'center' ? 84 : 96;
      let fontSize = maxSize;
      let metrics = measureWatermarkText(text, fontSize, fontFamily);
      const pageDiagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
      const targetWidth = position === 'center'
        ? canvasWidth * 0.85
        : position === 'diagonal'
          ? pageDiagonal * 0.8
          : canvasWidth * 0.6;
      const targetHeight = position === 'repeated'
        ? canvasHeight * 0.18
        : canvasHeight * 0.4;
      while (fontSize > minSize && (metrics.width > targetWidth || metrics.actualHeight > targetHeight)) {
        fontSize -= 2;
        metrics = measureWatermarkText(text, fontSize, fontFamily);
      }
      fontSize = Math.max(minSize, fontSize);
      const positions = [];
      if (repeat) {
        const spacingX = Math.max(canvasWidth / 2, metrics.width * 1.6);
        const spacingY = Math.max(canvasHeight / 4, metrics.actualHeight * 2.2);
        const startX = -canvasWidth / 2;
        const endX = canvasWidth * 1.5;
        const startY = -canvasHeight / 2;
        const endY = canvasHeight * 1.5;
        let rowIndex = 0;
        for (let y = startY; y <= endY; y += spacingY) {
          const offsetX = (rowIndex % 2) * (spacingX / 2);
          for (let x = startX - offsetX; x <= endX; x += spacingX) {
            positions.push({ x, y });
          }
          rowIndex += 1;
        }
      } else {
        positions.push({ x: canvasWidth / 2, y: canvasHeight / 2 });
      }
      return {
        mode: position,
        angle,
        fontSize,
        opacity,
        color,
        text,
        positions,
        repeat,
        fontFamily
      };
    }

    function overlayWatermarkOnCanvas(ctx, canvas, cfg) {
      try {
        const transform = ctx.getTransform();
        const scaleX = transform.a || 1;
        const scaleY = transform.d || 1;
        const coordWidth = canvas.width / scaleX;
        const coordHeight = canvas.height / scaleY;
        const layout = calculateWatermarkLayout(coordWidth, coordHeight, cfg);
        ctx.save();
        ctx.globalAlpha = layout.opacity;
        ctx.fillStyle = layout.color;
        ctx.strokeStyle = getLuminance(layout.color) > 0.6 ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(1, layout.fontSize * 0.04);
        ctx.font = `bold ${layout.fontSize}px ${layout.fontFamily}`;
        ctx.translate(coordWidth / 2, coordHeight / 2);
        ctx.rotate(-layout.angle);
        if (layout.repeat) {
          for (const pos of layout.positions) {
            ctx.strokeText(layout.text, pos.x, pos.y);
            ctx.fillText(layout.text, pos.x, pos.y);
          }
        } else {
          ctx.strokeText(layout.text, 0, 0);
          ctx.fillText(layout.text, 0, 0);
        }
        ctx.restore();
      } catch (e) {
        console.warn('overlayWatermarkOnCanvas error', e);
      }
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function getLuminance(hex) {
      try {
        const c = hex.replace('#','');
        const r = parseInt(c.substring(0,2),16)/255;
        const g = parseInt(c.substring(2,4),16)/255;
        const b = parseInt(c.substring(4,6),16)/255;
        return 0.2126*r + 0.7152*g + 0.0722*b;
      } catch (e) { return 0.6; }
    }

    async function processPdfBufferWithWatermark(buffer, cfg) {
      showLoading('Aplicando marca...');
      try {
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const outputPdf = new jsPDF({ compress: true });
        for (let i = 1; i <= pdf.numPages; i++) {
          if (i > 1) outputPdf.addPage();
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          overlayWatermarkOnCanvas(ctx, canvas, cfg);
          const image = canvas.toDataURL('image/jpeg', 0.9);
          const props = outputPdf.getImageProperties(image);
          const pdfWidth = outputPdf.internal.pageSize.getWidth();
          const ratio = pdfWidth / props.width;
          outputPdf.addImage(image, 'JPEG', 0, 0, props.width * ratio, props.height * ratio, undefined, 'FAST');
          updateProgress(i / pdf.numPages);
        }
        outputPdf.save('pdf_marca_dagua.pdf');
        showToast('Marca d\'água aplicada');
      } catch (error) {
        showToast('Erro ao aplicar marca: ' + error.message, true);
      } finally {
        hideLoading();
      }
    }

    async function applyWatermarkFromModal() {
      const cfg = getWmConfigFromForm();
      // if user selected a pdf file in modal
      if (state.watermarkTempFile) {
        try {
          const buffer = await state.watermarkTempFile.arrayBuffer();
          await processPdfBufferWithWatermark(buffer, cfg);
          state.watermarkTempFile = null;
          closeModal('watermarkModal');
        } catch (e) {
          showToast('Falha ao aplicar marca: ' + e.message, true);
        }
        return;
      }
      // else if there are pages in app, apply on generate
      if (state.pages && state.pages.length) {
        state.watermarkConfig = { ...cfg, applyOnGenerate: true };
        closeModal('watermarkModal');
        // trigger generation
        generatePdf();
        return;
      }
      showToast('Nenhum PDF selecionado e sem páginas para gerar.', true);
    }

    async function ocrProcess(event) {
      const file = event.target.files[0];
      if (!file) return;
      showLoading('Preparando imagem para OCR...');
      try {
        let aggregated = '';
        // Attempt to create a worker if available, but be defensive about API differences
        let worker = null;
        let workerReady = false;
        const logger = m => {
          if (m && m.status && m.progress) updateProgress(m.progress);
        };
        try {
          if (Tesseract && typeof Tesseract.createWorker === 'function') {
            worker = Tesseract.createWorker({ logger });
            // some CDN versions expose worker methods differently — guard calls
            if (typeof worker.load === 'function') {
              await worker.load();
            }
            if (typeof worker.loadLanguage === 'function') {
              await worker.loadLanguage('por+eng');
            }
            if (typeof worker.initialize === 'function') {
              await worker.initialize('por+eng');
            }
            // attempt to set parameters if supported
            if (typeof worker.setParameters === 'function') {
              try {
                await worker.setParameters({ tessedit_pageseg_mode: '3', preserve_interword_spaces: '1' });
              } catch (e) {
                console.warn('worker.setParameters not supported', e);
              }
            }
            // mark ready if recognize exists
            if (typeof worker.recognize === 'function') workerReady = true;
          }
        } catch (e) {
          console.warn('Tesseract worker initialization failed, will fallback to Tesseract.recognize', e);
          worker = null;
          workerReady = false;
        }

        if (file.type.startsWith('image/')) {
          showLoading('Processando imagem...');
          const imageUrl = await readFile(file);
          const img = new Image();
          img.src = imageUrl;
          await new Promise(r => img.onload = r);
          // draw at good resolution
          const canvas = document.createElement('canvas');
          const maxDim = Math.max(img.width, img.height);
          const scale = Math.min(3, Math.max(1, 2000 / maxDim));
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          preprocessCanvasForOcr(canvas);
            showLoading('Executando OCR...');
            // choose recognition path depending on worker availability
            if (worker && workerReady) {
              try {
                const res = await worker.recognize(canvas);
                aggregated += `\n--- Página 1 ---\n${res.data ? res.data.text : (res.text || '')}\n`;
              } catch (e) {
                console.warn('worker.recognize failed, falling back to Tesseract.recognize', e);
                const res = await Tesseract.recognize(canvas, 'por+eng', { logger });
                aggregated += `\n--- Página 1 ---\n${res.data.text}\n`;
              }
            } else {
              const res = await Tesseract.recognize(canvas, 'por+eng', { logger });
              aggregated += `\n--- Página 1 ---\n${res.data.text}\n`;
            }
        } else {
          // PDF: render high quality pages
          const buffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
          const total = pdf.numPages;
          for (let i = 1; i <= total; i++) {
            showLoading(`Processando página ${i} de ${total}...`);
            const page = await pdf.getPage(i);
            // choose scale between 2 and 3 for better OCR
            const scale = 2.5;
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            preprocessCanvasForOcr(canvas);
            showLoading(`Executando OCR na página ${i}...`);
            if (worker && workerReady) {
              try {
                const res = await worker.recognize(canvas);
                aggregated += `\n--- Página ${i} ---\n${res.data ? res.data.text : (res.text || '')}\n`;
              } catch (e) {
                console.warn('worker.recognize failed on page', i, e);
                const res = await Tesseract.recognize(canvas, 'por+eng', { logger });
                aggregated += `\n--- Página ${i} ---\n${res.data.text}\n`;
              }
            } else {
              const res = await Tesseract.recognize(canvas, 'por+eng', { logger });
              aggregated += `\n--- Página ${i} ---\n${res.data.text}\n`;
            }
            updateProgress(i / total);
          }
        }
        showLoading('Limpando texto extraído...');
        const cleaned = cleanOcrText(aggregated);
        // finalize worker if supported
        try {
          if (worker && typeof worker.terminate === 'function') await worker.terminate();
        } catch (e) { console.warn('worker.terminate failed', e); }

        // create TXT download
        const blob = new Blob([cleaned], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'texto_extraido.txt';
        link.click();

        // create simple Word (.doc) by wrapping in HTML
        const docHtml = `<!doctype html><html><head><meta charset="utf-8"></head><body><pre>${escapeHtml(cleaned)}</pre></body></html>`;
        const docBlob = new Blob([docHtml], { type: 'application/msword;charset=utf-8' });
        const docUrl = URL.createObjectURL(docBlob);
        const docLink = document.createElement('a');
        docLink.href = docUrl;
        docLink.download = 'texto_extraido.doc';
        docLink.click();

        showToast('Arquivos gerados: TXT e Word.');
      } catch (error) {
        showToast('Erro no OCR: ' + error.message, true);
      } finally {
        hideLoading();
        event.target.value = '';
      }
    }

    async function pdfToJpg(event) {
      const file = event.target.files[0];
      if (!file) return;
      showLoading('Convertendo PDF...');
      try {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          const imageUrl = canvas.toDataURL('image/jpeg', 0.92);
          const link = document.createElement('a');
          link.href = imageUrl;
          link.download = `pagina_${i}.jpg`;
          link.click();
          updateProgress(i / pdf.numPages);
        }
        showToast('Conversão concluída');
      } catch (error) {
        showToast('Erro: ' + error.message, true);
      } finally {
        hideLoading();
        event.target.value = '';
      }
    }

    async function imagesToPdf(event) {
      const files = Array.from(event.target.files);
      if (!files.length) return;
      showLoading('Criando PDF...');
      try {
        const pdf = new jsPDF({ compress: true });
        for (let i = 0; i < files.length; i++) {
          const imageUrl = await readFile(files[i]);
          const props = pdf.getImageProperties(imageUrl);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const ratio = pdfWidth / props.width;
          if (i > 0) pdf.addPage();
          pdf.addImage(imageUrl, 'JPEG', 0, 0, props.width * ratio, props.height * ratio, undefined, 'FAST');
          updateProgress((i + 1) / files.length);
        }
        pdf.save('imagem_para_pdf.pdf');
        showToast('PDF criado com sucesso');
      } catch (error) {
        showToast('Erro: ' + error.message, true);
      } finally {
        hideLoading();
        event.target.value = '';
      }
    }
  