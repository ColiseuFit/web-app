const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let updatedCount = 0;

files.forEach(file => {
  if (file.replace(/\\/g, '/').endsWith('lib/supabase/server.ts')) return;

  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Pattern 1: const { data: { user } } = await supabase.auth.getUser();
  const pattern1 = /const\s+\{\s*data:\s*\{\s*user\s*\}\s*\}\s*=\s*await\s+([a-zA-Z0-9_]+)\.auth\.getUser\(\);/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, 'const user = await getAuthUser();');
    changed = true;
  }

  // Pattern 2: const { data: { user: currentUser } } = await supabase.auth.getUser();
  const pattern2 = /const\s+\{\s*data:\s*\{\s*user:\s*currentUser\s*\}\s*\}\s*=\s*await\s+([a-zA-Z0-9_]+)\.auth\.getUser\(\);/g;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, 'const currentUser = await getAuthUser();');
    changed = true;
  }

  // Add the import if changed
  if (changed) {
    if (!/import\s+.*getAuthUser.*from\s+["'][^"']*\/lib\/supabase\/server["']/.test(content)) {
      const importPattern = /import\s+\{([^}]*createClient[^}]*)\}\s+from\s+(["'][^"']*\/lib\/supabase\/server["']);/;
      if (importPattern.test(content)) {
        content = content.replace(importPattern, (match, p1, p2) => {
          if (p1.includes('getAuthUser')) return match;
          return `import {${p1}, getAuthUser } from ${p2};`;
        });
      } else {
        content = `import { getAuthUser } from "@/lib/supabase/server";\n` + content;
      }
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
    updatedCount++;
  }
});

console.log(`Total files updated: ${updatedCount}`);
