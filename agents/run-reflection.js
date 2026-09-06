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

function scoreToPercent(score) {
  if (score.includes('/')) {
    const [num, den] = score.split('/').map(Number);
    return Math.round((num / den) * 100);
  }
  return parseInt(score.replace('%', ''), 10);
}

function getColor(pct) {
  if (pct >= 85) return 'Green';
  if (pct >= 60) return 'Yellow';
  return 'Red';
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

  console.log('\n🌙 OPERATION DDDD — REFLECTION\n' + '─'.repeat(50) + '\n');

  const scoreRaw = await ask(rl, '4D score today (e.g. 24/32 or 75%): ');
  const win = await ask(rl, 'One win from today: ');
  const miss = await ask(rl, 'One miss from today: ');
  const formula = await ask(rl, 'Did move + connect + build all fire? (all/partial/none): ');

  rl.close();

  const pct = scoreToPercent(scoreRaw);
  const color = getColor(pct);

  const claudeMdPath = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  let claudeContext = '';
  try { claudeContext = fs.readFileSync(claudeMdPath, 'utf-8'); }
  catch (e) { console.error('Warning: Could not read CLAUDE.md:', e.message); }

  const systemPrompt = fs.readFileSync(path.join(__dirname, 'reflection.md'), 'utf-8');

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  const userMessage = `Date: ${dateStr}
Score: ${pct}% (${color} Day)
Win: ${win}
Miss: ${miss}
Formula: ${formula}

Drake's context:
${claudeContext}

Generate today's reflection.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log('\n' + '─'.repeat(50) + '\n');

  let fullOutput = '';
  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 1500,
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

    const outputPath = path.join(logsDir, `${dateStr}-reflection.md`);
    fs.writeFileSync(outputPath, `# Reflection — ${dateStr}\n\n${fullOutput}`);

    const weeklyLogPath = path.join(logsDir, 'weekly-log.md');
    const weeklyEntry = `${dateStr} | ${pct}% | ${color} | Win: ${win} | Miss: ${miss}\n`;
    fs.appendFileSync(weeklyLogPath, weeklyEntry);

    console.log(`✅ Saved to logs/${dateStr}-reflection.md`);
    console.log(`📊 Appended to logs/weekly-log.md\n`);
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
