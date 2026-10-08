# 담담 — AI 챗봇

HTML, CSS, JavaScript와 Node.js / Express로 만든 간단한 한국어 챗봇입니다. OpenAI Chat Completions API의 `gpt-4o-mini` 모델을 사용합니다.

## 실행

1. Node.js 22 이상을 설치합니다.
2. 프로젝트 폴더에서 `npm install`을 실행합니다.
3. `.env.example`을 복사하여 `.env`를 만들고 `OPENAI_API_KEY`에 자신의 OpenAI API 키를 입력합니다.
4. `npm start`를 실행한 뒤 http://localhost:3000 에 접속합니다.

```sh
npm install
cp .env.example .env
# .env 파일을 편집하여 API 키 입력
npm start
```

개발 중 파일 변경 시 자동 재시작하려면 `npm run dev`를 사용합니다. `PORT`로 포트를 변경할 수 있습니다. 서버는 로컬 컴퓨터에서만 접속하도록 설정되어 있습니다.

`npm test`로 대화 기록 전달, 입력 검증, 키 누락 및 API 오류 처리를 확인할 수 있습니다. 테스트는 모의 응답을 사용하므로 실제 API 키나 요금이 필요하지 않습니다.

## 대화 기록

- 데이터베이스, 파일, localStorage를 사용하지 않고 브라우저의 JavaScript 메모리에 기록을 보관합니다.
- 요청마다 최근 20회 대화(사용자/AI 메시지 40개)와 새 질문을 서버로 보내 문맥을 반영합니다. 그보다 오래된 대화는 모델에 전달되지 않습니다.
- 탭마다 기록이 분리되며, 새로고침이나 ‘새 대화’로 초기화됩니다.
- API 키는 서버 환경변수에서만 읽으며 브라우저로 전달하지 않습니다. `.env`는 Git에서 제외합니다.
- 답변은 일반 텍스트로 안전하게 표시합니다. 전송 중 중복 요청 방지, 한글 입력 처리, 오류 안내와 실패한 입력 복원을 지원합니다.
- 한 메시지는 최대 8,000자입니다. OpenAI API 이용에는 API 계정의 사용량에 따른 요금이 발생합니다.

## 파일

`server.js`: 정적 파일 제공, 입력 검증, OpenAI 요청 및 오류 처리.

`public/index.html`, `public/style.css`, `public/app.js`: 반응형 화면과 대화 처리.

공식 API 문서: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
