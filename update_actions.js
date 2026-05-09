const fs = require('fs');
const p = 'src/lib/actions/running_actions.ts';
let lines = fs.readFileSync(p, 'utf8').split('\n');

lines[483] = lines[483].replace('targetDescription:', 'title: formData.get(\'title\') ? String(formData.get(\'title\')) : undefined,\n    targetDescription:');
lines[504] = lines[504].replace('target_description:', 'title: validatedFields.data.title,\n    target_description:');

lines[534] = lines[534].replace('targetDescription:', 'title?: string | null;\n    targetDescription:');
lines[561] = lines[561].replace('target_description: b.targetDescription,', 'title: b.title,\n        target_description: b.targetDescription,');

lines[589] = lines[589].replace('targetDescription:', 'title?: string | null;\n    targetDescription:');
lines[627] = lines[627].replace('target_description: b.targetDescription,', 'title: b.title,\n      target_description: b.targetDescription,');

lines[679] = lines[679].replace('targetDescription:', 'title: formData.get(\'title\') ? String(formData.get(\'title\')) : undefined,\n    targetDescription:');
lines[701] = lines[701].replace('target_description:', 'title: validatedFields.data.title,\n      target_description:');

lines[760] = lines[760].replace('target_description:', 'title: b.title,\n    target_description:');
lines[840] = lines[840].replace('target_description:', 'title: tw.title,\n      target_description:');
lines[914] = lines[914].replace('target_description:', 'title: tw.title,\n      target_description:');

lines[954] = '  const title = formData.get("title") as string;\n' + lines[954];
lines[990] = lines[990].replace('target_description:', 'title,\n    target_description:');

lines[1025] = '  const title = formData.get("title") as string;\n' + lines[1025];
lines[1059] = lines[1059].replace('target_description:', 'title,\n    target_description:');

lines[1135] = lines[1135].replace('target_description:', 'title: s.title,\n      target_description:');
lines[1200] = lines[1200].replace('target_description:', 'title: session.title,\n        target_description:');

lines[1506] = '      title,\n' + lines[1506];
lines[1642] = '      title,\n' + lines[1642];

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('Done!');
