# Migração segura — ScanMaster Pro v2

Esta branch introduz a base da correção sem alterar diretamente a versão publicada.

## Implementado

- Dependências fixadas e empacotáveis com Vite (`package.json`).
- Motor de PDF com `pdf-lib` para unir, extrair, girar, aplicar marca-d'água e otimizar estrutura sem converter páginas em JPEG.
- IndexedDB para salvar arquivos como `Blob`, reduzindo o uso de base64/dataURL e permitindo recuperação do trabalho.
- Service worker com shell offline, fallback de navegação e limpeza de caches antigos.
- Rótulos honestos para conversões Word/PDF.
- Bootstrap isolado para registro da PWA e salvamento automático.

## Integração necessária no arquivo legado

O `index.html` atual ainda concentra a interface e as funções antigas. Para concluir sem regressões, a migração deve ser feita função por função:

1. Importar `src/bootstrap.js` como módulo.
2. Substituir as rotinas antigas de mesclar, extrair, girar e marca-d'água pelas funções de `src/pdf/pdf-engine.js`.
3. Trocar o armazenamento de imagens em `dataURL` por `Blob`/Object URL e persistir o workspace com `src/core/storage.js`.
4. Conectar o estado atual do aplicativo ao `bootstrapScanMaster`.
5. Remover scripts CDN somente depois que o build Vite estiver validado.
6. Excluir `tmp_script.js` após confirmar que não existe referência ativa.

## Limites honestos

- `optimizePdfStructure` preserva o conteúdo, mas não promete atingir tamanho exato.
- PDF para Word continua sendo extração de texto/OCR; preservar layout exige outro mecanismo.
- Word para PDF continua sendo aproximação visual para documentos complexos.

## Testes obrigatórios antes de mesclar

- PDF com texto selecionável, links, formulários e páginas de tamanhos diferentes.
- PDFs de 1, 20, 50 e 100 páginas em celular.
- Restauração após fechar/recarregar.
- Inicialização offline após primeiro carregamento.
- Atualização de versão do service worker.
- Conversões Word/PDF simples e complexas com mensagens de limitação visíveis.
