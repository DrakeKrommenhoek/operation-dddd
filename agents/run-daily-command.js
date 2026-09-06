import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
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

function getArcPhase(date) {
  const d = date.toISOString().split('T')[0];
  if (d >= '2026-04-20' && d <= '2026-04-26') return { week: '1', phase: 'Week 1', location: 'Jaco' };
  if (d >= '2026-04-27' && d <= '2026-05-10') return { week: '2–3', phase: 'Weeks 2–3', location: 'Tamarindo / Sol Sanctuary' };
  if (d >= '2026-05-11' && d <= '2026-05-17') return { week: '4', phase: 'Week 4', location: 'W&L' };
  if (d >= '2026-05-18' && d <= '2026-05-24') return { week: '5', phase: 'Week 5', location: 'Home' };
  if (d >= '2026-05-25' && d <= '2026-05-31') return { week: '5+', phase: 'Pre-Denver', location: 'Home / Transition' };
  return { week: '6+', phase: 'Denver Phase', location: 'Denver — Mountaingate Capital' };
}

async function main() {
  loadEnv();

  const claudeMdPath = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  let claudeContext = '';
  try { claudeContext = fs.readFileSync(claudeMdPath, 'utf-8'); }
  catch (e) { console.error('Warning: Could not read CLAUDE.md:', e.message); }

  const systemPrompt = fs.readFileSync(path.join(__dirname, 'daily-command.md'), 'utf-8');

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const arc = getArcPhase(today);

  const logsDir = path.join(ROOT, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  let existingLog = '';
  const existingLogPath = path.join(logsDir, `${dateStr}.md`);
  if (fs.existsSync(existingLogPath)) existingLog = fs.readFileSync(existingLogPath, 'utf-8');

  const userMessage = `Today is ${dayName}, ${dateStr}.
Arc Phase: ${arc.phase}
Location: ${arc.location}
Week: ${arc.week} of 5

Drake's full context:
${claudeContext}
${existingLog ? `\nExisting log for today:\n${existingLog}` : ''}

Generate the Daily Command for today.`;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\n❌ ANTHROPIC_API_KEY not set.');
    console.error('   Create a .env file in operation-dddd/ with:');
    console.error('   ANTHROPIC_API_KEY=your_key_here\n');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(`\n⚡ OPERATION DDDD — DAILY COMMAND\n${'─'.repeat(50)}\n`);

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

    const outputPath = path.join(logsDir, `${dateStr}-morning.md`);
    fs.writeFileSync(outputPath, `# Daily Command — ${dateStr}\n\n${fullOutput}`);
    console.log(`✅ Saved to logs/${dateStr}-morning.md\n`);
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
