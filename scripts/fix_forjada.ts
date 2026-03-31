const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixForjada() {
  console.log("Looking for 'forjada' in WODs...");
  
  const { data, error } = await supabase
    .from("wods")
    .select("id, title, description");

  if (error) {
    console.error("Error fetching WODs:", error);
    return;
  }

  let updatedCount = 0;
  for (const wod of data) {
    if (wod.description && wod.description.toLowerCase().includes("forjada")) {
      console.log(`Fixing WOD ID ${wod.id} - ${wod.title}`);
      
      const newDesc = wod.description.replace(/Programação sendo forjada\./gi, "Aguardando cadastro oficial de treino pelo Head Coach.").replace(/forjada/gi, "preparada");
      
      const { error: updateError } = await supabase
        .from("wods")
        .update({ description: newDesc, title: "Treino do Dia" })
        .eq("id", wod.id);
        
      if (updateError) {
        console.error("Failed to update WOD:", updateError);
      } else {
        updatedCount++;
      }
    }
  }
  
  console.log(`Updated ${updatedCount} WODs.`);
}

fixForjada();
