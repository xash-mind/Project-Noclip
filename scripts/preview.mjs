import { spawn } from 'node:child_process';
spawn('http-server', ['dist', '-p', '4173', '-c-1'], { stdio: 'inherit' });
