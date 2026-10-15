const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/azwis/.gemini/antigravity-ide/brain/9601e71e-b5e5-4a0c-8646-b8b64f783c91/.system_generated/logs/transcript_full.jsonl'),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (line.includes('"step_index":1421')) {
    const data = JSON.parse(line);
    fs.writeFileSync('scratch/frontend_notes_full.txt', data.content, 'utf8');
    console.log('Saved frontend notes, length:', data.content.length);
    process.exit(0);
  }
});
