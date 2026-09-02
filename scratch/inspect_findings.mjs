import fs from 'fs';

const findings = JSON.parse(fs.readFileSync('scratch/search_keyword_findings.json', 'utf8'));

for (const [k, list] of Object.entries(findings)) {
  if (list.length > 0) {
    console.log(`\n================== KEYWORD: ${k} (${list.length}) ==================`);
    const byFile = {};
    for (const item of list) {
      if (!byFile[item.file]) byFile[item.file] = [];
      byFile[item.file].push(item);
    }
    for (const [file, items] of Object.entries(byFile)) {
      console.log(`\nFile: ${file} (${items.length} occurrences)`);
      items.slice(0, 5).forEach(it => console.log(`  Line ${it.line}: ${it.content.slice(0, 100)}`));
      if (items.length > 5) console.log(`  ... and ${items.length - 5} more lines`);
    }
  }
}
