const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing credentials");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixForjada() {
  console.log("Looking for 'forjada' in all text columns...");
  
  const { data, error } = await supabase
    .from("wods")
    .select("*");

  if (error) {
    console.error("Error fetching WODs:", error);
    return;
  }

  let updatedCount = 0;
  for (const wod of data) {
    let needsUpdate = false;
    const updatePayload: any = {};
    
    // Check all string fields
    const fields = ["title", "description", "wod_content", "warm_up", "technique"];
    
    for (const field of fields) {
      if (wod[field] && wod[field].toLowerCase().includes("forjada")) {
        needsUpdate = true;
        updatePayload[field] = wod[field]
          .replace(/Programação sendo forjada\./gi, "Aguardando cadastro oficial de treino pelo Head Coach.")
          .replace(/sendo forjada/gi, "sendo criada")
          .replace(/forjada/gi, "preparada");
      }
    }

    if (needsUpdate) {
      console.log(`Fixing WOD ID ${wod.id}`);
      const { error: updateError } = await supabase
        .from("wods")
        .update(updatePayload)
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
