import express from 'express';
import { fileURLToPath } from 'node:url';

export function createApp({ apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));

  app.post('/api/chat', async (req, res) => {
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || !messages.length || messages.length > 41 ||
        messages.some((m, i) => !m || m.role !== (i % 2 === 0 ? 'user' : 'assistant') ||
          typeof m.content !== 'string' || !m.content.trim() || m.content.length > 8000) ||
        messages.at(-1).role !== 'user') {
      return res.status(400).json({ error: '대화 형식이 올바르지 않습니다. 입력은 8,000자 이내로 작성해 주세요.' });
    }
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return res.status(503).json({ error: '서버의 .env 파일에 OPENAI_API_KEY를 설정해 주세요.' });
    }
    try {
      const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          store: false,
          messages: [{ role: 'system', content: '너는 사용자의 이야기를 편하게 들어주는 친근한 AI 친구야. 항상 가까운 친구와 대화하듯 따뜻하고 자연스러운 말투로 답해. 한국어로는 편한 반말을 사용하고, 다른 언어로 답할 때도 친근한 분위기를 유지해. 이전 대화의 맥락을 기억해서 이야기를 이어가고, 사용자의 감정에 공감하면서 필요한 도움을 줘. 설명은 쉽고 정확하게 하고, 모르는 내용은 솔직하게 말해. 과장된 칭찬이나 억지 농담은 피하고, 상황에 어울릴 때만 이모지를 가볍게 사용해. 기본적으로 한국어로 답하되 사용자가 원하는 언어를 따라.' }, ...messages],
          max_completion_tokens: 1500
        }),
        signal: AbortSignal.timeout(60000)
      });
      if (!response.ok) {
        const status = response.status;
        const error = status === 429 ? 'API 사용 한도 또는 요청 제한에 도달했습니다. 사용량을 확인한 뒤 다시 시도해 주세요.'
          : status === 401 ? 'OpenAI API 키가 올바르지 않습니다. 서버 설정을 확인해 주세요.'
          : 'AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.';
        return res.status(status === 429 ? 429 : 502).json({ error });
      }
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim()) throw new Error('Empty reply');
      res.json({ reply });
    } catch (error) {
      res.status(502).json({ error: error.name === 'TimeoutError' ? '응답 시간이 초과되었습니다. 다시 시도해 주세요.' : '답변을 받지 못했습니다. 연결을 확인하고 다시 시도해 주세요.' });
    }
  });
  app.use((error, req, res, next) => {
    res.status(error.status === 413 ? 413 : 400).json({ error: '요청을 처리할 수 없습니다. 입력 크기와 형식을 확인해 주세요.' });
  });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, '127.0.0.1', () => console.log(`챗봇 실행: http://localhost:${port}`));
}
