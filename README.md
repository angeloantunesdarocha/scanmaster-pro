<div align="center">

# 📄 ScanMaster Pro

**Ferramentas para PDF e scanner inteligente de documentos no navegador — organize, converta, aplique OCR e exporte arquivos localmente.**

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Deploy](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel)](https://scanmaster-pro-dusky.vercel.app)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)]()
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)]()
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)]()

[🌐 Demo ao vivo](https://scanmaster-pro-dusky.vercel.app) • [✨ Funcionalidades](#-funcionalidades) • [🧪 Tecnologias](#-tecnologias-utilizadas) • [🚀 Como usar](#-como-usar) • [🗺 Roadmap](#-roadmap)

</div>

---

## 📌 Visão geral

O **ScanMaster Pro** é um conjunto de ferramentas para PDF que roda no navegador, sem instalar nada, com scanner de documentos integrado para celular e desktop.

A aplicação detecta o documento automaticamente, corrige a perspectiva, permite ajustar manualmente os quatro cantos, aplica **OCR** para extrair texto, oferece **filtros** e exporta para **PDF**, **Word** ou **imagem**.

> 🔒 **Privacidade:** o processamento dos documentos ocorre no dispositivo do usuário. Bibliotecas e modelos são carregados de CDNs; uma conexão é necessária para o primeiro acesso e algumas funções.

> ℹ️ **Limites de formato:** compressão e marca d'água renderizam páginas em imagens e podem remover texto pesquisável, links, formulários ou metadados. A conversão PDF → Word reconstrói o texto e não garante o layout original. Arquivos protegidos por senha e PDFs muito grandes podem não abrir no navegador.

A interface foi inspirada em **aplicativos profissionais de digitalização** e funciona em **desktop, tablet e smartphone**.

---

## ✨ Funcionalidades

### 📷 Captura e detecção
- **Captura pela câmera** em dispositivos móveis (câmera traseira, padrão)
- **Upload de imagens** da galeria
- **Detecção automática do documento** com bounding box em tempo real
- **Correção automática de perspectiva** (transformação perspectiva 4 pontos)
- **Ajuste manual dos 4 cantos** com handles arrastáveis para casos em que o automático falhar

### 🧠 Processamento de imagem
- **Filtro preto e branco** (modo scanner clássico)
- **Escala de cinza** ajustável
- **Aumento de nitidez e contraste**
- **Pré-visualização ao vivo** antes de salvar

### 🔎 OCR e extração de texto
- **Reconhecimento óptico de caracteres (OCR)** em português e inglês
- **Cópia rápida** do texto extraído para a área de transferência
- **Exportação do OCR** em `.txt`

### 📄 Organização e edição de PDF
- **Mesclar PDFs** preservando páginas, texto e conteúdo vetorial
- **Organizar páginas**: reordenar e remover páginas com pré-visualização
- **Dividir PDF** salvando um intervalo de páginas como outro arquivo
- **Extrair páginas** selecionadas sem rasterizar o conteúdo
- **Rotacionar páginas** e **adicionar numeração** sem rasterizar o conteúdo
- **Assinatura visual** desenhada no navegador e incorporada às páginas escolhidas (não é assinatura digital certificada)
- **Marca d'água** e **compressão** por recriação rasterizada

### 🔄 Exportação e conversão
- **Imagem → PDF** (uma ou várias páginas, com tamanho A4/Carta/Ofício)
- **Word → PDF** (`.docx` enviado pelo usuário, convertido localmente)
- **PDF → Word** (`.pdf` enviado, reconstruído como `.docx` editável; o layout pode variar)
- **Geração de PDF multi-página** a partir de várias digitalizações
- **Pré-visualização, conversão e download controlado do resultado.**

---

## ⭐ Diferenciais

- 🔒 **Processamento local** — o documento é processado no dispositivo do usuário
- 🛡 **Privacidade dos documentos** preservada pela arquitetura
- 🌐 **Funciona diretamente no navegador**, sem servidor próprio
- 📦 **Não requer instalação** — abre na URL e está pronto para uso
- 📱 **Compatível com desktop e dispositivos móveis**
- 🧠 **Scanner inteligente** com interface inspirada em aplicativos profissionais de digitalização
- 🔲 **Detecção automática** do contorno do documento
- ✏️ **Correção de perspectiva** automática
- 🎯 **Ajuste manual dos quatro cantos** quando a detecção automática falhar
- 🔎 **OCR integrado** em português e inglês
- 🔄 **Conversão Word ↔ PDF** no navegador
- 🔄 **Conversão PDF ↔ Word** no navegador
- 🖼 **Imagem → PDF** com tamanho de página configurável

---

## 🧪 Tecnologias utilizadas

- **HTML5** — estrutura semântica da página
- **CSS3** — layout responsivo, animações e tema visual
- **JavaScript (Vanilla)** — lógica da aplicação, sem frameworks
- **OpenCV.js** — detecção de contorno e análise de imagem
- **PDF.js** — leitura e renderização de PDFs no navegador
- **pdf-lib** — mesclagem, divisão, organização, rotação, numeração e assinatura visual sem rasterizar páginas
- **jsPDF** — geração de PDFs a partir de conteúdo da aplicação
- **Mammoth.js** — conversão `.docx` → HTML
- **Tesseract.js** — OCR executado via WebAssembly no navegador
- **html2canvas** — captura de elementos HTML para imagem

> 🔧 *Validação auxiliar:* `validate_html.py` (script Python 3) verifica conformidade do HTML. **Este script não faz parte da aplicação em tempo de execução** — é uma ferramenta de apoio ao desenvolvimento.

---

## 🧱 Stack técnica

| Camada | Tecnologia |
|---|---|
| Estrutura | HTML5 semântico |
| Lógica | JavaScript (vanilla) |
| UI | CSS3 (layout responsivo, animações) |
| OCR | Tesseract.js (WebAssembly) |
| Detecção de documento | OpenCV.js (análise de contornos) |
| Leitura de PDF | PDF.js |
| Geração de PDF | jsPDF |
| Conversão Office | Mammoth.js |
| Captura de tela | html2canvas |
| Validação de HTML | Script Python 3 (`validate_html.py`) |
| Deploy | Vercel |
| PWA | `manifest.json` incluso |

> 💡 O stack é **intencionalmente client-side** para reduzir dependências externas e custo de servidor.

---

## 📸 Capturas de tela

> 🖼 *As imagens abaixo serão adicionadas futuramente na pasta `docs/screenshots/`.*
>
> - `docs/screenshots/tela-inicial.png` — Tela inicial
> - `docs/screenshots/scanner-camera.png` — Scanner com câmera
> - `docs/screenshots/deteccao-automatica.png` — Detecção automática do documento
> - `docs/screenshots/ajuste-cantos.png` — Ajuste manual dos quatro cantos
> - `docs/screenshots/ferramentas-pdf-word.png` — Ferramentas de PDF e Word
> - `docs/screenshots/resultado-pdf.png` — Resultado final em PDF

---

## 🖼 Demonstração online

🔗 **https://scanmaster-pro-dusky.vercel.app**

> Abra no celular para testar a captura pela câmera. No desktop, use upload de imagem.

---

## 🚀 Como usar

### Online (recomendado)

Acesse **https://scanmaster-pro-dusky.vercel.app** — abra no celular para usar a câmera.

### Local

```bash
# 1. Clone o repositório
git clone https://github.com/angeloantunesdarocha/scanmaster-pro.git

# 2. Entre na pasta
cd scanmaster-pro

# 3. Sirva os arquivos com qualquer servidor estático
# Python 3
python -m http.server 8000

# ou Node
npx http-server -p 8000

# 4. Abra no navegador
# http://localhost:8000
```

> ⚠️ Não funciona abrindo o `index.html` direto via `file://` em alguns navegadores (a câmera exige HTTPS ou `localhost`).

### Limitações conhecidas

- **`.doc` legado (formato antigo do Word)** tem suporte limitado. Para resultados confiáveis, utilize arquivos `.docx`.
- O **primeiro carregamento** baixa bibliotecas e modelos (incluindo o OCR) pela internet. Após isso, o navegador faz cache. O uso subsequente depende do cache do navegador.
- A aplicação declara `manifest.json`, mas a **instalação como PWA** depende do navegador utilizado.

### Rodar a validação HTML (apenas para desenvolvimento)

```bash
python validate_html.py
```

---

## 📁 Estrutura do projeto

```
scanmaster-pro/
├── index.html
├── manifest.json
├── scanmaster-icon.png
├── validate_html.py
└── README.md
```

---

## 🗺 Roadmap

Funcionalidades ainda não disponíveis:

- [ ] OCR para mais idiomas (espanhol, francês)
- [ ] Assinatura digital dentro do app
- [ ] Marca-d'água customizável nos PDFs gerados
- [x] Compressão de PDF (recria páginas como imagens; resultado depende do arquivo)
- [ ] Sincronização opcional (opt-in do usuário) com serviços de armazenamento
- [ ] Tradução automática do texto extraído pelo OCR
- [ ] Histórico local das últimas digitalizações

---

## ❓ Perguntas frequentes

**Preciso instalar algo?**
Não. É uma página web. Abre no navegador do celular ou do PC.

**Meus documentos vão para algum servidor?**
O processamento acontece no seu dispositivo. Bibliotecas e modelos podem ser baixados no primeiro acesso.

**Funciona no iPhone?**
A aplicação foi pensada para rodar em navegadores modernos. O comportamento exato em cada navegador (incluindo iOS/Safari) pode variar e depende da versão do navegador.

**E o formato .doc antigo?**
A aplicação processa `.docx` (formato atual do Word). O formato `.doc` legado tem suporte limitado no navegador.

---

## 👤 Autor

**Ângelo Antunes da Rocha** — Desenvolvedor web e estudante de Sistemas de Informação (IFNMG).

[![GitHub](https://img.shields.io/badge/GitHub-angeloantunesdarocha-181717?logo=github)](https://github.com/angeloantunesdarocha)

---

## 📄 Licença

> ⚠️ Este repositório **ainda não possui um arquivo `LICENSE`**.
> Até que uma licença seja adicionada explicitamente, **todos os direitos estão reservados ao autor** e o código não deve ser reutilizado sem autorização.
