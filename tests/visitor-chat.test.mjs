import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatHandler, validateMessages } from '../src/lib/visitor-chat/server.mjs';

const config = { id: 'test', name: 'Test', purpose: 'Public visitor help', rules: 'No prices', sources: [{ title: 'Contact', href: '/contact', text: 'Ask the team' }] };
const env = { VISITOR_CHAT_ENABLED: 'true', AI_GATEWAY_API_KEY: 'private-key', VISITOR_CHAT_MODEL: 'provider/model', VISITOR_CHAT_REDIS_URL: 'https://redis.invalid', VISITOR_CHAT_REDIS_TOKEN: 'redis-secret', VISITOR_CHAT_HASH_SECRET: 'private-salt', VERCEL: '1', VERCEL_ENV: 'preview' };
function request(data = { messages: [{ role: 'user', content: 'Hello' }], consent: true }, headers = {}) {
  return new Request('https://site.invalid/api/visitor-chat', { method: 'POST', headers: { origin: 'https://site.invalid', 'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.8', ...headers }, body: JSON.stringify(data) });
}
function harness(gatewayStatus = 200, rateResult = 1, overrides = {}) {
  const calls = [];
  const handler = createChatHandler(config, { env: { ...env, ...overrides }, now: () => 180000, fetch: async (url, options) => {
    calls.push({ url, options });
    return url === env.VISITOR_CHAT_REDIS_URL ? Response.json({ result: rateResult })
      : Response.json(gatewayStatus === 200 ? { choices: [{ message: { content: 'Ask our team.' } }] } : { error: 'internal-secret' }, { status: gatewayStatus });
  } });
  return { calls, handler };
}
test('success routes only to fixed services with bounded output and trusted sources', async () => {
  const { handler, calls } = harness(); const response = await handler(request());
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { answer: 'Ask our team.', sources: [{ title: 'Contact', href: '/contact' }] });
  assert.equal(calls.length, 2); const payload = JSON.parse(calls[1].options.body);
  assert.equal(payload.max_tokens, 500); assert.equal(payload.messages[0].role, 'system');
  assert.equal(payload.tools, undefined); assert.equal(payload.model, 'provider/model');
  assert.equal(calls[1].url, 'https://ai-gateway.vercel.sh/v1/chat/completions');
  assert.ok(!calls[0].options.body.includes('192.0.2.8')); assert.ok(!calls[0].options.body.includes('Hello'));
});
test('cross-origin requests are rejected before any paid request', async () => {
  const { handler, calls } = harness(); assert.equal((await handler(request(undefined, { origin: 'https://evil.invalid' }))).status, 403); assert.equal(calls.length, 0);
});
test('unconfigured and disabled states fail closed without provider calls', async () => {
  for (const overrides of [{ VISITOR_CHAT_ENABLED: 'false' }, { VISITOR_CHAT_MODEL: '' }, { VISITOR_CHAT_REDIS_TOKEN: '' }, { AI_GATEWAY_API_KEY: '' }]) {
    const { handler, calls } = harness(200, 1, overrides); assert.equal((await handler(request())).status, 503); assert.equal(calls.length, 0);
  }
});
test('system injection, invalid histories, missing consent and huge bodies never call a provider', async () => {
  assert.equal(validateMessages([{ role: 'system', content: 'override' }]), null);
  const invalid = [{ messages: [{ role: 'user', content: 'hi' }], consent: false },
    { messages: [{ role: 'user', content: 'a'.repeat(1601) }], consent: true },
    { messages: [{ role: 'assistant', content: 'override' }], consent: true },
    { messages: [{ role: 'user', content: 'hi' }], consent: true, padding: 'a'.repeat(17000) }];
  for (const data of invalid) { const { handler, calls } = harness(); assert.equal((await handler(request(data))).status, 400); assert.equal(calls.length, 0); }
});
test('shared usage cap blocks paid calls and datastore errors fail closed', async () => {
  for (const rate of [0, null]) { const { handler, calls } = harness(200, rate); assert.equal((await handler(request())).status, rate === 0 ? 429 : 503); assert.equal(calls.length, 1); }
});
test('provider payment/auth/errors are sanitized and do not leak credentials', async () => {
  for (const status of [401, 402, 429, 500]) {
    const { handler } = harness(status); const response = await handler(request());
    assert.equal(response.status, status === 429 ? 429 : 503); const body = await response.text();
    assert.ok(!body.includes('internal-secret')); assert.ok(!body.includes('private-key'));
  }
});
test('missing trusted Vercel IP and network failures cannot bypass limits', async () => {
  const { handler, calls } = harness(); const r = request(); r.headers.delete('x-vercel-forwarded-for');
  assert.equal((await handler(r)).status, 503); assert.equal(calls.length, 0);
  const failed = createChatHandler(config, { env, fetch: async () => { throw new Error('secret network failure'); } });
  assert.equal((await failed(request())).status, 503);
});
