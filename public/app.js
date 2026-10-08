const form = document.querySelector('#chat-form');
const input = document.querySelector('#input');
const messages = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
const send = document.querySelector('#send');
const reset = document.querySelector('#reset');
const status = document.querySelector('#status');
let history = [];
let busy = false;

function addMessage(role, content, pending = false) {
  const item = document.createElement('div');
  item.className = `message ${role}${pending ? ' pending' : ''}`;
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = role === 'user' ? '나' : '담담';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = content;
  item.append(label, bubble);
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
  return item;
}

function resizeInput() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const content = input.value.trim();
  if (busy || !content) return;
  busy = true;
  send.disabled = reset.disabled = input.disabled = true;
  status.textContent = '';
  welcome.hidden = true;
  const userMessage = addMessage('user', content);
  const pending = addMessage('assistant', '답변을 생각하고 있어요…', true);
  input.value = '';
  resizeInput();
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...history.slice(-40), { role: 'user', content }] }),
      signal: AbortSignal.timeout(70000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '답변을 받지 못했습니다.');
    if (typeof data.reply !== 'string') throw new Error('응답 형식이 올바르지 않습니다.');
    pending.classList.remove('pending');
    pending.querySelector('.bubble').textContent = data.reply;
    history = [...history, { role: 'user', content }, { role: 'assistant', content: data.reply }].slice(-40);
    messages.scrollTop = messages.scrollHeight;
  } catch (error) {
    pending.remove();
    userMessage.remove();
    input.value = content;
    resizeInput();
    welcome.hidden = history.length > 0;
    status.textContent = error.name === 'TimeoutError' ? '응답 시간이 초과되었습니다. 다시 보내 주세요.' : error.message === 'Failed to fetch' ? '서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.' : error.message;
  } finally {
    busy = false;
    send.disabled = reset.disabled = input.disabled = false;
    input.focus();
  }
});

input.addEventListener('input', resizeInput);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    form.requestSubmit();
  }
});
reset.addEventListener('click', () => {
  if (busy) return;
  history = [];
  messages.querySelectorAll('.message').forEach((item) => item.remove());
  welcome.hidden = false;
  status.textContent = '';
  input.value = '';
  resizeInput();
  input.focus();
});
document.querySelectorAll('.suggestions button').forEach((button) => {
  button.addEventListener('click', () => {
    input.value = button.textContent;
    form.requestSubmit();
  });
});
