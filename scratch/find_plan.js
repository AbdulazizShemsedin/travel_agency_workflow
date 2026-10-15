const fs = require('fs');
const lines = fs.readFileSync('C:/Users/azwis/.gemini/antigravity-ide/brain/9601e71e-b5e5-4a0c-8646-b8b64f783c91/.system_generated/logs/transcript.jsonl', 'utf8').trim().split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
  const j = JSON.parse(lines[i]);
  if (j.type === 'PLANNER_RESPONSE' && j.content && (j.content.includes('T1') || j.content.includes('T8') || j.content.includes('T9') || j.content.includes('T10'))) {
    console.log('Found planner step:', j.step_index);
    console.log(j.content.slice(0, 1500));
    break;
  }
}
