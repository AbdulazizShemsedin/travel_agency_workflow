const fs = require('fs');
const lines = fs.readFileSync('C:/Users/azwis/.gemini/antigravity-ide/brain/9601e71e-b5e5-4a0c-8646-b8b64f783c91/.system_generated/logs/transcript.jsonl', 'utf8').trim().split('\n');
lines.slice(-15).forEach(l => {
  const j = JSON.parse(l);
  console.log('--- STEP:', j.step_index, j.type);
  if (j.tool_calls) {
    j.tool_calls.forEach(tc => {
      console.log('TOOL CALL:', tc.name || tc.function?.name, JSON.stringify(tc.parameters || tc.args || tc).slice(0, 300));
    });
  }
  if (j.content) {
    console.log('CONTENT:', j.content.slice(0, 400));
  }
});
