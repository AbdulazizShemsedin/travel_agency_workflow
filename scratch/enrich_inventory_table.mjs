import fs from 'fs';

const items = JSON.parse(fs.readFileSync('scratch/full_inventory_table.json', 'utf8'));
const fnUsage = JSON.parse(fs.readFileSync('scratch/v2_fn_usage.json', 'utf8'));

for (const item of items) {
  const usage = fnUsage[item.endpoint];
  if (usage) {
    const fns = usage.v2Functions.map(f => `${f.fnName}() [${f.file.replace('src/lib/api/', '')}]`).join(', ');
    item.currentFrontendCaller = fns || 'None';
    item.frontendPageComp = usage.consumers.length > 0 ? usage.consumers.join(', ') : 'None (No UI consumer)';
    
    if (usage.v2Functions.length > 0) {
      item.implemented = 'YES';
      if (usage.consumers.length > 0) {
        item.correctlyIntegrated = 'YES';
        item.status = 'IMPLEMENTED';
        item.remainingWork = 'Runtime verification and test coverage';
      } else {
        item.correctlyIntegrated = 'NO (API only, missing UI)';
        item.status = 'PARTIAL';
        item.remainingWork = 'Build frontend UI to consume endpoint';
      }
    } else {
      item.implemented = 'NO';
      item.correctlyIntegrated = 'NO';
      item.status = 'NOT STARTED';
      item.remainingWork = 'Implement V2 wrapper and UI consumer';
    }
  }

  // Handle special cases
  if (item.endpoint === '/api/method/agency_tracking.api_docs.get_swagger_spec') {
    item.implemented = 'NO (Raw Fetch Available)';
    item.currentFrontendCaller = 'None (Docs/Developer Endpoint)';
    item.status = 'COMPLETE (API Docs)';
    item.remainingWork = 'None (Doc introspection only)';
  }
}

fs.writeFileSync('scratch/enriched_inventory_table.json', JSON.stringify(items, null, 2));

const counts = {};
items.forEach(i => counts[i.status] = (counts[i.status] || 0) + 1);
console.log('Enriched counts:', counts);
