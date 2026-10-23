import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const dataDir = await mkdtemp(path.join(tmpdir(), 'ejaz-central-test-'));
const port = 34187 + Math.floor(Math.random() * 1000);
const base = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  NODE_ENV: 'production',
  HOST: '127.0.0.1',
  PORT: String(port),
  JWT_SECRET: 'integration-test-only-secret-change-this-12345678901234567890',
  OWNER_SETUP_KEY: 'integration-test-one-time-owner-setup-key',
  EJAZ_DATA_DIR: dataDir,
};
let child;
let token = '';
let checks = 0;

function assert(condition, message) {
  checks++;
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}
async function request(route, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + route, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(5000),
  });
  const type = response.headers.get('content-type') || '';
  const body = type.includes('application/json') ? await response.json() : await response.text();
  return { response, body };
}
function startServer() {
  child = spawn(process.execPath, [path.join(root, 'node_modules/tsx/dist/cli.mjs'), path.join(root, 'server.ts')], {
    cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', data => process.stdout.write(`[server] ${data}`));
  child.stderr.on('data', data => process.stderr.write(`[server] ${data}`));
}
async function stopServer() {
  if (!child || child.exitCode !== null) return;
  const current = child;
  current.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve => current.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, 4000)),
  ]);
  if (current.exitCode === null) current.kill('SIGKILL');
  child = undefined;
}
async function waitHealthy() {
  for (let i = 0; i < 60; i++) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error('Central server exited before becoming healthy');
    try {
      const result = await fetch(base + '/api/health', { signal: AbortSignal.timeout(1000) });
      if (result.ok) {
        const json = await result.json();
        if (json.status === 'UP') return json;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Central server did not become healthy within 30 seconds');
}

try {
  console.log('Starting isolated central server integration tests...');
  startServer();
  const health = await waitHealthy();
  assert(health.status === 'UP', 'health endpoint reports UP');
  assert(health.database === 'LOCAL_JSON_PERSISTENT', 'server identifies persistent local database');

  let result = await request('/api/customers');
  assert(result.response.status === 401, 'customer API rejects unauthenticated access');

  result = await request('/api/auth/setup-owner', {
    method: 'POST',
    body: { fullName: 'اختبار المالك', username: 'integration-owner', phone: '0000000000', password: 'TestPassword!234', setupKey: env.OWNER_SETUP_KEY },
    headers: {},
  });
  assert(result.response.ok && result.body.success === true, 'one-time owner setup succeeds with the correct setup key');

  result = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'integration-owner', password: 'TestPassword!234' },
    headers: {},
  });
  assert(result.response.ok && result.body.success === true && !!result.body.token, 'owner login returns a bearer token');
  token = result.body.token;
  assert(!('passwordHash' in result.body.user) && !('passwordSalt' in result.body.user), 'login response never exposes password hashes or salts');

  result = await request('/api/auth/me');
  assert(result.response.ok && result.body.user.username === 'integration-owner', 'authenticated session identity is verified');

  result = await request('/api/customers', { method: 'POST', body: { name: 'عميل اختبار تكاملي', phone: '700000001', address: 'اختبار محلي' } });
  assert(result.response.ok && result.body.success === true && !!result.body.customer?.id, 'customer creation persists through the authenticated API');
  const customerId = result.body.customer.id;

  result = await request('/api/customers');
  assert(result.response.ok && result.body.customers.some(customer => customer.id === customerId), 'customer list includes the newly created customer');

  result = await request('/api/sync/pull');
  assert(result.response.ok && result.body.success === true && result.body.data.customers.some(customer => customer.id === customerId), 'authenticated central sync pull returns the customer');

  result = await request('/api/backup/export');
  assert(result.response.ok && JSON.stringify(result.body).includes(customerId), 'authorized backup export contains persisted customer data');

  await stopServer();
  startServer();
  await waitHealthy();
  result = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'integration-owner', password: 'TestPassword!234' },
    headers: {},
  });
  assert(result.response.ok && result.body.success === true, 'owner credentials remain valid after server restart');
  token = result.body.token;
  result = await request('/api/customers');
  assert(result.response.ok && result.body.customers.some(customer => customer.id === customerId), 'customer data survives a full server restart');

  console.log(`CENTRAL SERVER INTEGRATION TESTS PASSED: ${checks} assertions.`);
} catch (error) {
  console.error('CENTRAL SERVER INTEGRATION TESTS FAILED:', error);
  process.exitCode = 1;
} finally {
  await stopServer();
  await rm(dataDir, { recursive: true, force: true });
}
