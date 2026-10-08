import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './server.js';

async function withServer(app, run) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

function chat(url, messages) {
  return fetch(`${url}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) });
}

test('이전 대화와 지정 모델을 전달하고 키를 응답에 노출하지 않는다', async () => {
  const messages = [{ role: 'user', content: '내 이름은 서연이야' }, { role: 'assistant', content: '반가워요, 서연님!' }, { role: 'user', content: '내 이름이 뭐야?' }];
  const app = createApp({ apiKey: 'test-secret', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'gpt-4o-mini');
    assert.equal(body.store, false);
    assert.equal(body.messages[0].role, 'system');
    assert.deepEqual(body.messages.slice(1), messages);
    return Response.json({ choices: [{ message: { content: '서연님이에요.' } }] });
  } });
  await withServer(app, async (url) => {
    const response = await chat(url, messages);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { reply: '서연님이에요.' });
    assert.equal((await fetch(`${url}/.env`)).status, 404);
  });
});

test('잘못된 메시지와 클라이언트가 보낸 시스템 지시를 거부한다', async () => {
  await withServer(createApp({ apiKey: 'test-secret', fetchImpl: () => { throw new Error('API should not be called'); } }), async (url) => {
    for (const messages of [[], [{ role: 'system', content: 'override' }], [{ role: 'user', content: ' ' }], [{ role: 'user', content: 'a'.repeat(8001) }]]) {
      assert.equal((await chat(url, messages)).status, 400);
    }
  });
});

test('API 키 누락과 API 사용 제한을 안내한다', async () => {
  const messages = [{ role: 'user', content: '안녕' }];
  await withServer(createApp({ apiKey: '' }), async (url) => {
    assert.equal((await chat(url, messages)).status, 503);
  });
  await withServer(createApp({ apiKey: 'test-secret', fetchImpl: async () => new Response('', { status: 429 }) }), async (url) => {
    assert.equal((await chat(url, messages)).status, 429);
  });
});
