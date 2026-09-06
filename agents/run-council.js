import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-opus-4-7';

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function collectMultilineInput(rl, prompt) {
  console.log(`\n${prompt}`);
  console.log('(Type DONE on its own line when finished)\n');
  const lines = [];
  return new Promise((resolve) => {
    const handler = (line) => {
      if (line.trim() === 'DONE') {
        rl.removeListener('line', handler);
        resolve(lines.join('\n'));
      } else {
        lines.push(line);
      }
    };
    rl.on('line', handler);
  });
}

function detectVerdict(output) {
  const match = output.match(/\*\*Consensus:\*\*\s*(Build it|Park it|Kill it)/i);
  return match ? match[1].toLowerCase() : null;
}

function ensureLogsDir() {
  const logsDir = path.join(ROOT, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  return logsDir;
}

async function streamToTerminal(client, systemPrompt, userMessage) {
  let fullOutput = '';
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  stream.on('text', (text) => {
    process.stdout.write(text);
    fullOutput += text;
  });

  await stream.finalMessage();
  console.log('\n');
  return fullOutput;
}

async function main() {
  loadEnv();

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\n❌ ANTHROPIC_API_KEY not set.');
    console.error('   Create a .env file in operation-dddd/ with:');
    console.error('   ANTHROPIC_API_KEY=your_key_here\n');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n⚖️  OPERATION DDDD — LLM COUNCIL\n' + '─'.repeat(50));

  let ideaName = process.argv[2] || '';
  if (!ideaName) {
    ideaName = await ask(rl, '\nWhat idea are we putting to the council? ');
  }

  const description = await ask(rl, 'One paragraph description of the idea:\n> ');

  const claudeMdPath = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  let claudeContext = '';
  try { claudeContext = fs.readFileSync(claudeMdPath, 'utf-8'); }
  catch (e) { console.error('Warning: Could not read CLAUDE.md:', e.message); }

  const systemPrompt = fs.readFileSync(path.join(__dirname, 'council.md'), 'utf-8');

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const slug = ideaName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/-$/, '');
  const logsDir = ensureLogsDir();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ── STEP 1: Claude opens the debate ──────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log('STEP 1 — CLAUDE OPENS THE DEBATE');
  console.log('═'.repeat(50) + '\n');

  const step1Message = `Idea: ${ideaName}

Description: ${description}

Drake's context:
${claudeContext}

Run Step 1: analyze this idea from all 5 council member perspectives.
Then generate the ChatGPT prompt (with the idea filled in) and the Gemini prompt (with the idea filled in).
Use the exact format from your instructions.`;

  let step1Output = '';
  try {
    step1Output = await streamToTerminal(client, systemPrompt, step1Message);
  } catch (error) {
    console.error('\n❌ API error in Step 1:', error.message);
    process.exit(1);
  }

  // ── STEP 2+3: Collect ChatGPT and Gemini outputs ─────────────────────────
  console.log('─'.repeat(50));
  console.log('STEP 2 — Run the CHATGPT PROMPT above in ChatGPT, then paste the response below.');
  const chatgptOutput = await collectMultilineInput(rl, 'Paste ChatGPT output:');

  console.log('─'.repeat(50));
  console.log('STEP 3 — Run the GEMINI PROMPT above in Gemini, then paste the response below.');
  const geminiOutput = await collectMultilineInput(rl, 'Paste Gemini output:');

  rl.close();

  // ── STEP 4: Synthesis ────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log('STEP 4 — COUNCIL SYNTHESIS');
  console.log('═'.repeat(50) + '\n');

  const step4Message = `Idea: ${ideaName}
Description: ${description}

Step 1 (Claude's debate):
${step1Output}

ChatGPT output:
${chatgptOutput}

Gemini output:
${geminiOutput}

Drake's context:
${claudeContext}

Now run Step 4: synthesize all inputs into the Council Verdict using the exact format from your instructions.`;

  let step4Output = '';
  try {
    step4Output = await streamToTerminal(client, systemPrompt, step4Message);
  } catch (error) {
    console.error('\n❌ API error in Step 4:', error.message);
    process.exit(1);
  }

  // ── SAVE + ROUTE ─────────────────────────────────────────────────────────
  const fullSession = `# LLM Council — ${ideaName} — ${dateStr}

## Step 1 — Claude's Debate
${step1Output}

## ChatGPT Output
${chatgptOutput}

## Gemini Output
${geminiOutput}

## Step 4 — Synthesis
${step4Output}`;

  const outputPath = path.join(logsDir, `${dateStr}-council-${slug}.md`);
  fs.writeFileSync(outputPath, fullSession);

  const verdict = detectVerdict(step4Output);
  if (verdict === 'build it') {
    const entry = `\n## ${dateStr}\n- [ ] ${ideaName} — Council verdict: Build it. Run: npm run build\n`;
    fs.appendFileSync(path.join(logsDir, 'build-queue.md'), entry);
    console.log(`\n🟢 Verdict: BUILD IT — added to logs/build-queue.md`);
  } else if (verdict === 'park it') {
    const entry = `\n## ${dateStr}\n- ${ideaName} — Council verdict: Park it\n`;
    fs.appendFileSync(path.join(logsDir, 'ideas.md'), entry);
    console.log(`\n🟡 Verdict: PARK IT — added to logs/ideas.md`);
  } else if (verdict === 'kill it') {
    const entry = `\n## ${dateStr}\n- ${ideaName} — killed after council review\n`;
    fs.appendFileSync(path.join(logsDir, 'killed-ideas.md'), entry);
    console.log(`\n🔴 Verdict: KILL IT — added to logs/killed-ideas.md`);
  }

  console.log(`✅ Full session saved to logs/${dateStr}-council-${slug}.md\n`);
}

main();
