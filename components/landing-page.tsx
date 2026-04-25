"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Rule = "panic" | "backspace" | "silence" | "keyrepeat";

type Caption = {
  rule: Rule;
  ko: string;
  en: string;
};

const captionBank: Record<Rule, Caption[]> = {
  panic: [
    {
      rule: "panic",
      ko: "손은 급해졌습니다. 머리는 아직 합류하지 못했습니다.",
      en: "속도는 목적처럼 보일 수 있습니다. 아주 잠깐은요."
    },
    {
      rule: "panic",
      ko: "지금은 생산성이 아니라 속도만 존재합니다.",
      en: "빠르게 치는 건 혼란이 입는 가장 오래된 코스튬입니다."
    }
  ],
  backspace: [
    {
      rule: "backspace",
      ko: "백스페이스가 오늘 가장 성실한 팀원입니다.",
      en: "당신은 수정 중이 아닙니다. 리듬감 있게 후퇴 중입니다."
    },
    {
      rule: "backspace",
      ko: "입력보다 철회가 더 많군요.",
      en: "후회가 전용 키를 찾았습니다."
    }
  ],
  silence: [
    {
      rule: "silence",
      ko: "조용하군요. 좋은 신호는 아닙니다.",
      en: "확신이 방을 나가는 장면은 늘 이렇게 조용합니다."
    },
    {
      rule: "silence",
      ko: "지금은 생각 중이라기보다 응시 중입니다.",
      en: "움직임 없음. 익숙한 패배의 모양입니다."
    }
  ],
  keyrepeat: [
    {
      rule: "keyrepeat",
      ko: "당신은 지금 문제에 반응하고 있습니다.",
      en: "진짜 문제를 피하려고 더 작은 문제를 찾았습니다."
    },
    {
      rule: "keyrepeat",
      ko: "Enter가 해결책이었다면 이미 끝났겠죠.",
      en: "다시 누른다고 더 사실이 되지는 않습니다."
    }
  ]
};

const ruleMeta: Record<Rule, { label: string; file: string; color: string; joke: string; metric: string }> = {
  panic: {
    label: "패닉 타이핑",
    file: "패닉.ts",
    color: "#f85149",
    joke: "손가락이 먼저 배포하고, 뇌는 아직 데일리 스탠드업에 안 들어온 상태.",
    metric: "1초에 22타 이상"
  },
  backspace: {
    label: "백스페이스 회오리",
    file: "후회.ts",
    color: "#d29922",
    joke: "오늘의 최우수 팀원은 작성자가 아니라 삭제 키입니다.",
    metric: "백스페이스 5회/초"
  },
  silence: {
    label: "얼어붙은 침묵",
    file: "침묵.ts",
    color: "#58a6ff",
    joke: "7초 동안 아무 일도 안 일어나면, 앱이 모두가 생각한 말을 대신합니다.",
    metric: "무입력 7초"
  },
  keyrepeat: {
    label: "키 반복 의식",
    file: "탈출.ts",
    color: "#bc8cff",
    joke: "Esc, Enter, Space. 문제를 해결하지 않는 성스러운 삼위일체.",
    metric: "Esc/Enter/Space 반복"
  }
};

const sampleCode = `function 진짜_배포_아님() {
  const 계획 = maybe();

  if (계획.된다) {
    shipIt(); // 제발
  } else {
    이름만_다시_바꾸기();
  }
}

// 빠르게 치거나, 지우거나, 7초 동안 멈춰보세요.`;

const introCaption: Caption = {
  rule: "silence",
  ko: "코드를 치세요. 앱이 조용히 상처 줍니다.",
  en: "그게 전부입니다. 놀랍게도 충분합니다."
};

function pickCaption(rule: Rule, previous?: Caption | null) {
  const pool = captionBank[rule];
  const available = pool.filter((caption) => caption.en !== previous?.en);
  return available[Math.floor(Math.random() * available.length)] ?? pool[0];
}

function isCountableKey(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  const ignored = new Set([
    "Shift",
    "Control",
    "Alt",
    "Meta",
    "CapsLock",
    "Tab",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown"
  ]);
  return !ignored.has(event.key);
}

export function LandingPage() {
  const [code, setCode] = useState(sampleCode);
  const [caption, setCaption] = useState<Caption | null>(introCaption);
  const [visible, setVisible] = useState(true);
  const [activeMetric, setActiveMetric] = useState("감정 피해: 활성화");

  const keyTimesRef = useRef<number[]>([]);
  const backspaceTimesRef = useRef<number[]>([]);
  const repeatTimesRef = useRef<Record<string, number[]>>({ Escape: [], Enter: [], " ": [] });
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousCaptionRef = useRef<Caption | null>(introCaption);

  const fireCaption = useCallback((rule: Rule) => {
    const next = pickCaption(rule, previousCaptionRef.current);
    previousCaptionRef.current = next;
    setCaption(next);
    setActiveMetric(`${ruleMeta[rule].label}: 감지됨`);
    setVisible(true);

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 4200);
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      fireCaption("silence");
    }, 7000);
  }, [fireCaption]);

  const trackWindow = (bucket: number[], now: number, windowMs = 1000) => {
    bucket.push(now);
    while (bucket.length && now - bucket[0] > windowMs) bucket.shift();
    return bucket.length;
  };

  const onDemoKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      const now = performance.now();
      resetSilenceTimer();

      if (!isCountableKey(event)) return;

      // TODO(IME): 현재는 한글 조합 입력도 영문과 동일하게 카운트한다.
      // 빠른 한글 입력에서 패닉 자막이 과민하게 뜨면 compositionstart/end로 제외 여부를 검토한다.
      const keyCount = trackWindow(keyTimesRef.current, now);
      if (keyCount >= 22) {
        keyTimesRef.current = [];
        fireCaption("panic");
        return;
      }

      if (event.key === "Backspace") {
        const backspaceCount = trackWindow(backspaceTimesRef.current, now);
        if (backspaceCount >= 5) {
          backspaceTimesRef.current = [];
          fireCaption("backspace");
          return;
        }
      }

      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        const bucket = repeatTimesRef.current[event.key];
        const repeatCount = trackWindow(bucket, now);
        if (repeatCount >= 5) {
          repeatTimesRef.current[event.key] = [];
          fireCaption("keyrepeat");
        }
      }
    },
    [fireCaption, resetSilenceTimer]
  );

  const manualTriggers = useMemo(
    () => [
      ["panic", "패닉"],
      ["backspace", "백스페이스"],
      ["silence", "침묵"],
      ["keyrepeat", "키 반복"]
    ] as const,
    []
  );

  useEffect(() => {
    resetSilenceTimer();
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [resetSilenceTimer]);

  return (
    <main className="page-shell">
      <div className="noise-layer" />
      <nav className="nav">
        <a className="brand" href="#top" aria-label="Typing Over It 홈">
          <span className="brand-mark">⌘</span>
          <span>Typing Over It</span>
        </a>
        <div className="nav-links">
          <a href="#demo">체험</a>
          <a href="#failures">실패 유형</a>
          <a href="#faq">질문</a>
        </div>
      </nav>

      <section id="top" className="hero section-grid">
        <div className="hero-copy">
          <div className="eyebrow">VS Code 다크 테마 · 감정 피해 에디션</div>
          <h1>
            코드를 치세요.
            <br />
            앱이 놀립니다.
          </h1>
          <p className="hero-lede">
            가짜 코드 에디터에서 패닉 타이핑, 백스페이스 연타, 수상한 침묵이 감지되면 아주 차분한 자막이 당신의 개발 붕괴를 해설합니다.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#demo">
              가짜 IDE 열기
            </a>
            <a className="button button-ghost" href="#failures">
              감정 오류 보기
            </a>
          </div>
          <div className="command-strip" role="note">
            <span>&gt;</span> npm run 인생고치기 <strong>오류: 그런 스크립트는 없습니다</strong>
          </div>
        </div>
        <div className="hero-card" aria-label="Typing Over It 미리보기">
          <div className="hero-window-top">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
            <strong>망함-감지기.tsx</strong>
          </div>
          <div className="hero-window-body">
            <div className="hero-side">
              <span>파일</span>
              <b>진짜최종.tsx</b>
              <b>왜안됨.css</b>
              <b>희망.md</b>
            </div>
            <div className="hero-code">
              <code>if (나.확신) &#123;</code>
              <code>&nbsp;&nbsp;배포();</code>
              <code>&#125; else &#123;</code>
              <code>&nbsp;&nbsp;변수명_또_바꾸기();</code>
              <code>&#125;</code>
            </div>
          </div>
          <div className="hero-caption">
            <p>백스페이스가 오늘 가장 성실한 팀원입니다.</p>
            <span>입력보다 철회가 많은 아름다운 순간입니다.</span>
          </div>
          <div className="hero-art-badge">쓸모없음 • 정확함</div>
        </div>
      </section>

      <section id="demo" className="demo-section">
        <div className="section-heading">
          <span className="eyebrow">직접 체험</span>
          <h2>저주받은 에디터에 타이핑하세요.</h2>
          <p>빨리 치고, 지우고, Enter를 누르고, 아니면 7초 동안 아무것도 하지 마세요. 시니어처럼.</p>
        </div>

        <div className="ide-frame">
          <div className="traffic-lights" aria-hidden="true">
            <span className="red" />
            <span className="yellow" />
            <span className="green" />
          </div>
          <div className="ide-tabs">
            <span className="active-tab">진짜최종_리얼.tsx</span>
            <span>왜안됨.css</span>
            <span>희망.md</span>
          </div>
          <div className="ide-body">
            <aside className="activity-bar" aria-hidden="true">
              <span>▣</span>
              <span>⌕</span>
              <span>⑂</span>
              <span>⚠</span>
            </aside>
            <aside className="explorer">
              <p>탐색기</p>
              <span>▾ src</span>
              <span className="dirty">진짜최종_리얼.tsx 수정됨</span>
              <span>되돌리기.ts 신규</span>
              <span>묻지마.css ?</span>
              <span>README.md ...</span>
              <div className="mini-metric">
                <strong>{activeMetric}</strong>
                <small>확신 수치: 계속 흔들리는 중</small>
              </div>
            </aside>
            <div className="editor-pane">
              <div className="editor-toolbar">
                <span>src / 절대_프로덕션_아님.ts</span>
                <span className="panic-meter">패닉 지수 ▂▃▄▆▇</span>
              </div>
              <textarea
                aria-label="가짜 코드 에디터 체험"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={onDemoKeyDown}
                spellCheck={false}
              />
              {caption && (
                <div className={`caption-overlay ${visible ? "is-visible" : ""}`} aria-live="polite">
                  <div className="caption-wave">⌁</div>
                  <div>
                    <p className="caption-ko">{caption.ko}</p>
                    <p className="caption-en">{caption.en}</p>
                  </div>
                  <span className="caption-rule">{ruleMeta[caption.rule].label}</span>
                </div>
              )}
            </div>
          </div>
          <div className="problems-bar">
            <span>문제</span>
            <span>감정 진단 4개</span>
            <span>18줄, ?번째 칸</span>
          </div>
        </div>

        <div className="manual-panel">
          <p>무대 발표용 수동 버튼입니다. 브라우저가 소심할 때 누르세요.</p>
          <div className="trigger-buttons">
            {manualTriggers.map(([rule, label], index) => (
              <button key={rule} type="button" onClick={() => fireCaption(rule)}>
                <kbd>{index + 1}</kbd>
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setVisible(false);
                setActiveMetric("자막: 수동 제거됨");
              }}
            >
              <kbd>0</kbd>
              자막 지우기
            </button>
          </div>
        </div>
      </section>

      <section id="failures" className="section-grid failures-section">
        <div className="section-heading sticky-heading">
          <span className="eyebrow">기계를 실망시키는 네 가지 방법</span>
          <h2>이제 에디터도 감정이 있습니다.</h2>
          <p>도와주지는 않습니다. 그냥 지켜봅니다. 그래도 어떤 회의보다는 피드백이 빠릅니다.</p>
          <div className="mascot-card" aria-label="흠이라고 적힌 팻말을 든 로봇">
            <div className="robot-face">ಠ_ಠ</div>
            <div className="robot-sign">흠.</div>
          </div>
        </div>
        <div className="failure-list">
          {(Object.keys(ruleMeta) as Rule[]).map((rule) => (
            <article key={rule} className="failure-card" style={{ "--accent": ruleMeta[rule].color } as CSSProperties}>
              <div>
                <span className="file-pill">{ruleMeta[rule].file}</span>
                <h3>{ruleMeta[rule].label}</h3>
              </div>
              <p>{ruleMeta[rule].joke}</p>
              <small>{ruleMeta[rule].metric}</small>
              <button type="button" onClick={() => fireCaption(rule)}>
                이 실패 발동
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="settings-section section-grid">
        <div className="settings-card">
          <div className="settings-title">
            <span>설정 &gt; Typing Over It</span>
            <strong>절망을 세밀하게 조절하세요</strong>
          </div>
          {[
            ["패닉 기준", "1초 22타"],
            ["후회 기준", "백스페이스 5회/초"],
            ["침묵 기준", "7초"],
            ["자막 퇴장", "1.5초"],
            ["감정 피해", "켜짐"],
            ["실용성", "찾을 수 없음"]
          ].map(([key, value]) => (
            <div className="setting-row" key={key}>
              <code>{key}</code>
              <span>{value}</span>
            </div>
          ))}
        </div>
        <div className="problems-image-card">
          <div className="mobile-problems-panel">
            <strong>문제 4개</strong>
            <span>패닉 타이핑 감지됨</span>
            <span>백스페이스가 팀을 이끄는 중</span>
            <span>개발자가 조용해짐</span>
            <span>Esc 키가 정서적 지원을 요청함</span>
          </div>
        </div>
      </section>

      <section className="quote-wall">
        <span className="eyebrow">실제로 이런 말을 합니다</span>
        <div className="quote-grid">
          {Object.values(captionBank)
            .flat()
            .slice(0, 6)
            .map((item) => (
              <blockquote key={item.en}>
                <p>{item.ko}</p>
                <cite>{item.en}</cite>
              </blockquote>
            ))}
        </div>
      </section>

      <section id="faq" className="faq-section">
        <div className="section-heading">
          <span className="eyebrow">자주 묻는 척하는 질문</span>
          <h2>아무도 묻지 않았지만 답합니다.</h2>
        </div>
        <div className="faq-grid">
          <div>
            <h3>코딩을 도와주나요?</h3>
            <p>아니요. 그런 건 더 건강한 미션을 가진 다른 제품이 합니다.</p>
          </div>
          <div>
            <h3>진짜 키보드를 감시하나요?</h3>
            <p>아니요. 이 랜딩 데모는 이 페이지 안의 가짜 에디터만 봅니다.</p>
          </div>
          <div>
            <h3>Gemini가 필요한가요?</h3>
            <p>아니요. 제때 뜨는 템플릿 자막이 더 웃길 때가 많습니다.</p>
          </div>
          <div>
            <h3>왜 만들었나요?</h3>
            <p>개발자는 이미 고통받고 있습니다. 우리는 자막만 붙였습니다.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>Typing Over It</span>
        <span>완전히 불필요합니다. 수상하게 정확합니다.</span>
      </footer>
    </main>
  );
}
