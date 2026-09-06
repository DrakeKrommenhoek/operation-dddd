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

function ensureLogsDir() {
  const logsDir = path.join(ROOT, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  return logsDir;
}

function extractSection(output, header) {
  const lines = output.split('\n');
  const items = [];
  let inSection = false;
  for (const line of lines) {
    if (line.startsWith('## ') && line.includes(header)) { inSection = true; continue; }
    if (inSection && line.startsWith('## ')) { inSection = false; }
    if (inSection && line.trim().startsWith('- ')) items.push(line.trim());
  }
  return items;
}

function appendToLog(logsDir, filename, dateStr, sectionHeader, items) {
  if (!items.length) return;
  const filePath = path.join(logsDir, filename);
  const block = `\n## ${dateStr}\n${items.join('\n')}\n`;
  fs.appendFileSync(filePath, block);
}

async function collectMultilineInput() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\nDrop everything. Raw is fine.\n');
  console.log('(Type your dump. When done, type DONE on its own line.)\n');
  const lines = [];
  return new Promise((resolve) => {
    rl.on('line', (line) => {
      if (line.trim() === 'DONE') { rl.close(); resolve(lines.join('\n')); }
      else lines.push(line);
    });
  });
}

async function main() {
  loadEnv();

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\n❌ ANTHROPIC_API_KEY not set.');
    console.error('   Create a .env file in operation-dddd/ with:');
    console.error('   ANTHROPIC_API_KEY=your_key_here\n');
    process.exit(1);
  }

  let rawDump = '';
  const fileArgIdx = process.argv.indexOf('--file');
  if (fileArgIdx !== -1 && process.argv[fileArgIdx + 1]) {
    const filePath = process.argv[fileArgIdx + 1];
    rawDump = fs.readFileSync(filePath, 'utf-8');
    console.log(`\n📥 Loaded dump from ${filePath}`);
  } else {
    rawDump = await collectMultilineInput();
  }

  if (!rawDump.trim()) {
    console.log('Nothing to process. Exiting.');
    process.exit(0);
  }

  const claudeMdPath = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  let claudeContext = '';
  try { claudeContext = fs.readFileSync(claudeMdPath, 'utf-8'); }
  catch (e) { console.error('Warning: Could not read CLAUDE.md:', e.message); }

  const systemPrompt = fs.readFileSync(path.join(__dirname, 'inbox.md'), 'utf-8');

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const timestamp = today.toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const userMessage = `Date: ${dateStr}

Drake's context:
${claudeContext}

Raw dump to process:
${rawDump}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const logsDir = ensureLogsDir();

  console.log('\n' + '─'.repeat(50) + '\n');

  let fullOutput = '';
  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    stream.on('text', (text) => {
      process.stdout.write(text);
      fullOutput += text;
    });

    await stream.finalMessage();
    console.log('\n');

    const outputPath = path.join(logsDir, `${dateStr}-inbox-${timestamp.slice(11)}.md`);
    fs.writeFileSync(outputPath, `# Inbox — ${dateStr}\n\n${fullOutput}`);

    appendToLog(logsDir, 'ideas.md', dateStr, '💡 IDEAS', extractSection(fullOutput, '💡 IDEAS — PARKED'));
    appendToLog(logsDir, 'people-queue.md', dateStr, '👤 PEOPLE', extractSection(fullOutput, '👤 PEOPLE'));
    appendToLog(logsDir, 'build-queue.md', dateStr, '🔨 BUILD QUEUE', extractSection(fullOutput, '🔨 BUILD QUEUE'));
    appendToLog(logsDir, 'life-admin.md', dateStr, '🗂 LIFE ADMIN', extractSection(fullOutput, '🗂 LIFE ADMIN'));

    // Council queue detection
    const councilItems = extractSection(fullOutput, '🟢 COUNCIL QUEUE');
    if (councilItems.length) {
      appendToLog(logsDir, 'council-queue.md', dateStr, '🟢 COUNCIL QUEUE', councilItems);
      console.log(`\n🟢 ${councilItems.length} idea(s) ready for council. Run: npm run council`);
      councilItems.forEach((item) => console.log(`   ${item}`));
    }

    console.log('\nInbox clear. Saved to logs/');
  } catch (error) {
    const rawPath = path.join(logsDir, `raw-dump-${timestamp}.md`);
    fs.writeFileSync(rawPath, `# Raw Dump — ${timestamp}\n\n${rawDump}`);
    console.error(`\n❌ API error: ${error.message}`);
    console.error(`Raw dump saved to logs/raw-dump-${timestamp}.md — nothing lost.`);
    process.exit(1);
  }
}

main();
