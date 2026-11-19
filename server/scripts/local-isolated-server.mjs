// Starts server/server.js against an in-memory MongoDB, so dynamic tests (security, QA) never touch
// production data. server/.env points at production Atlas: this wrapper OVERRIDES MONGODB_URI,
// JWT_SECRET and the mail settings (dotenv does not override variables that are already set), so no
// real e-mail is sent and no token it issues is valid anywhere else.
//
// mongodb-memory-server is deliberately NOT a dependency of the project (it downloads a ~600 MB mongod).
// Install it once somewhere else and point MMS_DIR at it:
//     mkdir C:/areto-tools && cd C:/areto-tools && npm init -y && npm i mongodb-memory-server@10
//     MMS_DIR=C:/areto-tools MONGOMS_DOWNLOAD_DIR=C:/areto-tools/bin node scripts/local-isolated-server.mjs
// It prints "MONGO_URI mongodb://127.0.0.1:<port>/areto_local_test" (needed by security-local-tests.mjs).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const mmsDir = path.resolve(process.env.MMS_DIR || '.');
const require = createRequire(path.join(mmsDir, 'package.json'));
const { MongoMemoryServer } = require('mongodb-memory-server');

const mongod = await MongoMemoryServer.create({ binary: { downloadDir: process.env.MONGOMS_DOWNLOAD_DIR } });
const uri = mongod.getUri('areto_local_test');
console.log('MONGO_URI', uri);

const env = {
  ...process.env,
  PORT: process.env.PORT || '3001',
  MONGODB_URI: uri,
  JWT_SECRET: 'local-test-secret-not-the-real-one-0123456789abcdef',
  JWT_EXPIRES_IN: '7d',
  RESEND_API_KEY: '', EMAIL_USER: '', EMAIL_PASS: '',
  // The global limiter (120/min per user or IP, see utils/baseMiddleware.js) would trip the UI and security
  // suites, which send hundreds of requests as the same two users. It is tested on its own in
  // utils/baseMiddleware.test.js; the per-route limiters (login, reset...) stay on.
  GLOBAL_RATE_LIMIT_MAX: process.env.GLOBAL_RATE_LIMIT_MAX || '100000',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
const child = spawn(process.execPath, ['server.js'], { cwd: path.resolve(here, '..'), env, stdio: 'inherit' });
const stop = async () => { child.kill(); await mongod.stop(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', async () => { await mongod.stop(); process.exit(0); });
