/**
 * Utilitário de compressão e conversão de imagens no lado do cliente.
 *
 * Responsabilidades:
 * 1. Detectar e converter imagens HEIC/HEIF (comum em iPhones) para JPEG.
 * 2. Redimensionar imagens grandes mantendo a proporção (cap de 1600px no lado maior).
 * 3. Exportar como JPEG a 85% de qualidade — reduz ~95% do peso sem perda visual perceptível.
 *
 * @module image-compress
 * @see Utilizado exclusivamente no Portal Admin (Client Component) pelo coach/admin.
 */

/* ------------------------------------------------------------------ */
/*  1. Carregamento dinâmico do decodificador HEIC (CDN pública)      */
/* ------------------------------------------------------------------ */

/**
 * Injeta o script `heic2any` via CDN apenas quando um arquivo HEIC é detectado.
 * Essa abordagem evita inflar o bundle principal da aplicação para a maioria
 * dos uploads (JPEG/PNG/WebP), carregando o decodificador sob demanda.
 *
 * @throws {Error} Se o script CDN não puder ser carregado (ex: sem internet).
 */
function loadHeicScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Evita re-injeção se o script já foi carregado nesta sessão
    if ((window as any).heic2any) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Falha ao carregar conversor HEIC via CDN."));
    document.head.appendChild(script);
  });
}

/* ------------------------------------------------------------------ */
/*  2. Detecção de formato HEIC/HEIF                                  */
/* ------------------------------------------------------------------ */

/**
 * Verifica se o arquivo selecionado é do formato HEIC/HEIF.
 * A detecção é feita por MIME type E por extensão, pois alguns sistemas
 * operacionais (Windows) nem sempre reportam o MIME type corretamente
 * para arquivos HEIC.
 *
 * @param file - O arquivo selecionado pelo input file.
 * @returns `true` se HEIC/HEIF, `false` caso contrário.
 */
function isHeicFile(file: File): boolean {
  const mimeMatch =
    file.type === "image/heic" || file.type === "image/heif";
  const extMatch =
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");
  return mimeMatch || extMatch;
}

/* ------------------------------------------------------------------ */
/*  3. Formatação de tamanho para logs legíveis                       */
/* ------------------------------------------------------------------ */

/**
 * Formata bytes em uma string legível (KB/MB).
 * Usado exclusivamente para logs de diagnóstico no console do navegador.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* ------------------------------------------------------------------ */
/*  4. Pipeline principal: compressAndConvertImage                    */
/* ------------------------------------------------------------------ */

/**
 * Pipeline completo de otimização de imagem no lado do cliente.
 *
 * Fluxo:
 * 1. Se HEIC → carrega heic2any dinamicamente → converte para JPEG blob.
 * 2. Lê o blob resultante via FileReader → desenha em <canvas> redimensionado.
 * 3. Exporta o canvas como JPEG a `quality` (0.85 por padrão).
 *
 * @param file - Arquivo de imagem original selecionado pelo coach.
 * @param maxWidth - Largura máxima em pixels (padrão: 1600).
 * @param maxHeight - Altura máxima em pixels (padrão: 1600).
 * @param quality - Fator de qualidade JPEG entre 0 e 1 (padrão: 0.85).
 * @returns Um novo `File` otimizado em formato JPEG.
 *
 * @throws {Error} Se o Canvas ou o FileReader falharem.
 *
 * @example
 * ```ts
 * const optimized = await compressAndConvertImage(rawFile);
 * formData.append("file", optimized);
 * ```
 */
export async function compressAndConvertImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85
): Promise<File> {
  const originalSize = file.size;
  let activeBlob: Blob = file;
  let filename = file.name;

  console.log(
    `%c[📸 ImageCompress] Iniciando processamento`,
    "color: #3B82F6; font-weight: bold;",
    `\n  Arquivo: ${file.name}`,
    `\n  Tipo: ${file.type || "desconhecido"}`,
    `\n  Tamanho original: ${formatFileSize(originalSize)}`,
    `\n  HEIC detectado: ${isHeicFile(file) ? "SIM" : "NÃO"}`
  );

  /* ---- Bypass: imagem já otimizada ---- */
  // Se NÃO é HEIC (não precisa de conversão de formato) e já é leve (<500KB),
  // pula todo o pipeline para evitar overhead desnecessário.
  const SKIP_THRESHOLD = 500 * 1024; // 500 KB
  if (!isHeicFile(file) && originalSize < SKIP_THRESHOLD) {
    console.log(
      `%c[📸 ImageCompress] ⏭️ Bypass — imagem já otimizada`,
      "color: #EAB308; font-weight: bold;",
      `| ${formatFileSize(originalSize)} < 500 KB e formato compatível. Enviando sem alterações.`
    );
    return file;
  }

  if (isHeicFile(file)) {
    try {
      await loadHeicScript();
      const heic2any = (window as any).heic2any;

      if (heic2any) {
        // quality: 1 → gera JPEG intermediário sem perda.
        // A compressão real acontece somente na Etapa 2 (Canvas),
        // evitando dupla compressão que degrada a imagem visivelmente.
        const result = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 1,
        });
        // heic2any pode retornar um Blob ou um array de Blobs
        activeBlob = Array.isArray(result) ? result[0] : result;
        filename = filename.replace(/\.(heic|heif)$/i, ".jpeg");
        console.log(
          `%c[📸 ImageCompress] HEIC → JPEG convertido`,
          "color: #10B981; font-weight: bold;",
          `| Blob intermediário: ${formatFileSize(activeBlob.size)}`
        );
      }
    } catch (err) {
      console.error("[compressAndConvertImage] Erro na conversão HEIC:", err);
      // Prossegue mesmo com erro para tentar ler nativamente (ex: Safari suporta HEIC)
    }
  }

  /* ---- Etapa 2: Redimensionamento e compressão via Canvas ---- */
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calcular novas dimensões preservando aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Falha ao criar contexto 2D do Canvas."));
          return;
        }

        // Desenhar imagem no canvas redimensionado
        ctx.drawImage(img, 0, 0, width, height);

        // Exportar para JPEG comprimido
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Falha ao exportar Blob do Canvas."));
              return;
            }

            // Garantir extensão .jpeg no nome do arquivo final
            const nameWithoutExt =
              filename.substring(0, filename.lastIndexOf(".")) || filename;
            const compressedFile = new File(
              [blob],
              `${nameWithoutExt}.jpeg`,
              {
                type: "image/jpeg",
                lastModified: Date.now(),
              }
            );

            const reduction = ((1 - compressedFile.size / originalSize) * 100).toFixed(1);
            console.log(
              `%c[📸 ImageCompress] ✅ Concluído`,
              "color: #10B981; font-weight: bold;",
              `\n  Arquivo final: ${compressedFile.name}`,
              `\n  Dimensões: ${width}×${height}px`,
              `\n  Tamanho final: ${formatFileSize(compressedFile.size)}`,
              `\n  Redução: ${reduction}% (${formatFileSize(originalSize)} → ${formatFileSize(compressedFile.size)})`
            );

            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () =>
        reject(new Error("Erro ao decodificar a imagem em memória."));
      img.src = e.target?.result as string;
    };

    reader.onerror = () =>
      reject(new Error("Erro ao ler o arquivo selecionado via FileReader."));
    reader.readAsDataURL(activeBlob);
  });
}
