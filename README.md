# Typing Over It 랜딩

**Typing Over It**은 코딩하다 망가지는 순간을 한국어 자막으로 놀리는 장난스러운 웹 랜딩 페이지입니다. VS Code 다크 테마 느낌을 유지하되, 전체 카피와 인터랙션은 모바일에서 세로로 보기 좋게 구성했습니다.

## 현재 구성

- Next.js 기반 Vercel 배포용 프로젝트
- 한국어 중심 랜딩 카피
- 모바일 우선 세로 레이아웃
- 가짜 코드 에디터 체험
- 패닉 타이핑, 백스페이스 연타, 침묵, 키 반복 감지
- Gemini / TTS / 마이크 감지는 제외

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## Vercel 배포

```bash
npm install
npm run build
npx vercel
```

또는 Vercel 대시보드에서 이 폴더를 프로젝트로 가져오면 됩니다. `vercel.json`은 기본 Next.js 빌드를 사용합니다.

## 데모 상호작용

가짜 에디터 안에서:

- 아주 빠르게 입력 → 패닉 타이핑 자막
- Backspace 반복 → 백스페이스 회오리 자막
- 7초 동안 멈춤 → 얼어붙은 침묵 자막
- Esc / Enter / Space 반복 → 키 반복 자막
- 발표 상황에서는 수동 버튼으로 안전하게 발동 가능

## 에셋

이미지 에셋은 `public/assets/` 아래에 보존되어 있습니다. 현재 페이지는 한글화를 위해 주요 설명 UI를 CSS 기반으로 렌더링합니다.

- `hero-ide.png`
- `mascot-hmm.png`
- `problems-panel.png`
