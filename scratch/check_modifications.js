const fs = require('fs');
const lines = fs.readFileSync('C:/Users/azwis/.gemini/antigravity-ide/brain/9601e71e-b5e5-4a0c-8646-b8b64f783c91/.system_generated/logs/transcript.jsonl', 'utf8').trim().split('\n');

const toolCalls = [];
lines.forEach(l => {
  const j = JSON.parse(l);
  if (j.step_index >= 1421 && j.tool_calls) {
    j.tool_calls.forEach(tc => {
      const p = tc.parameters || tc.args || tc;
      const target = p.TargetFile || p.AbsolutePath || p.CommandLine;
      if (tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content' || tc.name === 'write_to_file') {
        toolCalls.push({ step: j.step_index, name: tc.name, file: p.TargetFile, desc: p.Description });
      }
    });
  }
});

console.log(JSON.stringify(toolCalls, null, 2));
