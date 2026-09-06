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

async function main() {
  loadEnv();

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\n❌ ANTHROPIC_API_KEY not set.');
    console.error('   Create a .env file in operation-dddd/ with:');
    console.error('   ANTHROPIC_API_KEY=your_key_here\n');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n🔨 OPERATION DDDD — BUILD SESSION\n' + '─'.repeat(50) + '\n');

  const project = await ask(rl, 'What are we building? (Ascend / The Answer / PE prep / other): ');
  const state = await ask(rl, 'Current state in one sentence: ');
  const time = await ask(rl, 'Time available? (20 / 45 / 90 min): ');

  rl.close();

  const claudeMdPath = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  let claudeContext = '';
  try { claudeContext = fs.readFileSync(claudeMdPath, 'utf-8'); }
  catch (e) { console.error('Warning: Could not read CLAUDE.md:', e.message); }

  const systemPrompt = fs.readFileSync(path.join(__dirname, 'builder.md'), 'utf-8');

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  const userMessage = `Project: ${project}
Current state: ${state}
Time available: ${time} min

Drake's context:
${claudeContext}

Generate the build session plan.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log('\n' + '─'.repeat(50) + '\n');

  let fullOutput = '';
  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    stream.on('text', (text) => {
      process.stdout.write(text);
      fullOutput += text;
    });

    await stream.finalMessage();
    console.log('\n');

    const logsDir = path.join(ROOT, 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    const slug = project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const outputPath = path.join(logsDir, `${dateStr}-build-${slug}.md`);
    fs.writeFileSync(outputPath, `# Build Session — ${project} — ${dateStr}\n\n${fullOutput}`);

    console.log(`✅ Saved to logs/${dateStr}-build-${slug}.md\n`);
  } catch (error) {
    if (error.status === 401) {
      console.error('\n❌ Invalid API key. Check your ANTHROPIC_API_KEY in .env');
    } else {
      console.error('\n❌ API error:', error.message);
    }
    process.exit(1);
  }
}

main();
