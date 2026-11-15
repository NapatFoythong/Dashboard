import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const candidates = [];
const install = process.argv.includes('--install');
if (process.env.PYTHON) candidates.push({ command: process.env.PYTHON, prefix: [] });
if (process.platform === 'win32') {
  candidates.push({ command: 'py', prefix: ['-3.12'] }, { command: 'py', prefix: ['-3.13'] }, { command: 'python', prefix: [] });
  const localProgramRoots = [
    process.env.USERPROFILE && join(process.env.USERPROFILE, 'AppData', 'Local', 'Programs', 'Python'),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'Python'),
  ].filter(Boolean);
  for (const localPrograms of localProgramRoots) {
    if (existsSync(localPrograms)) {
      for (const directory of readdirSync(localPrograms).filter(name => /^Python3\d+$/.test(name)).sort().reverse()) {
        candidates.push({ command: join(localPrograms, directory, 'python.exe'), prefix: [] });
      }
    }
  }
} else {
  candidates.push({ command: 'python3', prefix: [] }, { command: 'python', prefix: [] });
}

const uniqueCandidates = candidates.filter((candidate, index) => candidates.findIndex(other => other.command === candidate.command && other.prefix.join(' ') === candidate.prefix.join(' ')) === index);
const selected = uniqueCandidates.find(candidate => {
  const args = install ? ['--version'] : [...candidate.prefix, '-c', 'import fastapi, matplotlib, uvicorn'];
  const result = spawnSync(candidate.command, install ? [...candidate.prefix, ...args] : args, { encoding: 'utf8', windowsHide: true });
  return install
    ? result.status === 0 && /Python\s+3\./.test(`${result.stdout}${result.stderr}`)
    : result.status === 0;
});

if (!selected) {
  console.error('Python 3 was not found. Install Python 3.11 or newer, then run npm run charts:install.');
  process.exit(1);
}

const args = install
  ? [...selected.prefix, '-m', 'pip', 'install', '-r', 'python-api/requirements.txt']
  : [...selected.prefix, '-m', 'uvicorn', 'api:app', '--app-dir', 'python-api', '--host', '127.0.0.1', '--port', '8000'];
const child = spawn(selected.command, args, { stdio: 'inherit', windowsHide: true });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
