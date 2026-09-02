import fs from 'fs';

const items = JSON.parse(fs.readFileSync('scratch/enriched_inventory_table.json', 'utf8'));

let md = `| # | Endpoint | Method | Tag/Module | Purpose | Auth | Roles | Request Parameters | Request Body | Request Content-Type | Status Codes | Response Schema | Binary/File? | Current Frontend Caller | Frontend Page / Component | Implemented? | Correctly Integrated? | Runtime Verified? | Remaining Work | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;

items.forEach((it, idx) => {
  const sanitize = (str) => String(str || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  md += `| ${idx + 1} | \`${sanitize(it.endpoint)}\` | **${sanitize(it.httpMethod)}** | ${sanitize(it.module)} | ${sanitize(it.purpose)} | ${sanitize(it.auth)} | ${sanitize(it.roles)} | ${sanitize(it.parameters)} | \`${sanitize(it.requestBody)}\` | ${sanitize(it.requestContentType)} | ${sanitize(it.responseCodes)} | \`${sanitize(it.responseSchema)}\` | ${sanitize(it.isBinary)} | \`${sanitize(it.currentFrontendCaller)}\` | \`${sanitize(it.frontendPageComp)}\` | ${sanitize(it.implemented)} | ${sanitize(it.correctlyIntegrated)} | ${sanitize(it.runtimeVerified)} | ${sanitize(it.remainingWork)} | **${sanitize(it.status)}** |\n`;
});

fs.writeFileSync('scratch/inventory_markdown_table.md', md);
console.log(`Generated Markdown table with ${items.length} rows.`);
