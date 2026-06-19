const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Carregar variáveis do .env.local se disponível
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
} catch (e) {
  console.log("Dotenv não pôde ser carregado manualmente, assumindo variáveis de ambiente.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const contractsDir = path.resolve(__dirname, "../docs/CONTRATOS (MODELOS)");

async function seedContracts() {
  console.log("=== Semeando Modelos de Contratos da Arena Coliseu ===");

  if (!fs.existsSync(contractsDir)) {
    console.error(`Diretório não encontrado: ${contractsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(contractsDir).filter(f => f.endsWith(".md"));
  console.log(`Encontrados ${files.length} arquivos markdown de modelos.`);

  // Buscar templates existentes no banco para evitar duplicados
  const { data: existingTemplates, error: fetchError } = await supabase
    .from("contract_templates")
    .select("id, title");

  if (fetchError) {
    console.error("Erro ao buscar modelos existentes no banco de dados:", fetchError);
    process.exit(1);
  }

  const templatesMap = new Map(existingTemplates.map(t => [t.title.trim().toLowerCase(), t.id]));

  for (const file of files) {
    const filePath = path.join(contractsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // Extrair título do primeiro cabeçalho markdown (# Título...)
    const lines = content.split(/\r?\n/);
    let title = "";
    if (lines[0] && lines[0].startsWith("# ")) {
      // Remover "# " e limpar espaços
      title = lines[0].substring(2).trim();
    } else {
      // Fallback baseado no nome do arquivo
      title = file.replace(/^(00_CONTRATO_MODELO_)/, "").replace(/\.md$/, "").replace(/_/g, " ");
    }

    // Remover emojis decorativos do fim do título
    title = title.replace(/\s*[⚔️🏛️🤝💸🔥⚡🛡️]+\s*$/, "").trim();

    if (!title) {
      console.warn(`Aviso: Arquivo pulado (sem título detectado): ${file}`);
      continue;
    }

    const cleanedContent = content.trim();
    const existingId = templatesMap.get(title.toLowerCase());

    if (existingId) {
      console.log(`[ATUALIZANDO] "${title}" (ID: ${existingId})`);
      const { error: updateError } = await supabase
        .from("contract_templates")
        .update({
          content: cleanedContent,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingId);

      if (updateError) {
        console.error(`Erro ao atualizar "${title}":`, updateError);
      } else {
        console.log(`Sucesso ao atualizar "${title}".`);
      }
    } else {
      console.log(`[INSERINDO] "${title}"`);
      const { data: insertData, error: insertError } = await supabase
        .from("contract_templates")
        .insert({
          title: title,
          content: cleanedContent,
          is_active: true
        })
        .select();

      if (insertError) {
        console.error(`Erro ao inserir "${title}":`, insertError);
      } else {
        console.log(`Sucesso ao inserir "${title}" (ID: ${insertData[0].id}).`);
      }
    }
  }

  console.log("=== Processo de semeação concluído com sucesso! ===");
}

seedContracts();
