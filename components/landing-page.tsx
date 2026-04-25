"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

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
      ko: "속도는 방향이 아닙니다.",
      en: "Speed went to the gym, direction stayed in bed."
    },
    {
      rule: "panic",
      ko: "키보드만 확신에 차 있습니다.",
      en: "Keyboard confidence is wearing a fake mustache."
    }
  ],
  backspace: [
    {
      rule: "backspace",
      ko: "백스페이스가 오늘 가장 부지런합니다.",
      en: "Backspace clocked in early and fired the sentence."
    },
    {
      rule: "backspace",
      ko: "쓰고 있는 게 아니라 사과하고 있습니다.",
      en: "The apology key is wearing a tiny hard hat."
    }
  ],
  silence: [
    {
      rule: "silence",
      ko: "생각하는 게 아니라 응시하고 있습니다.",
      en: "Staring soup is boiling with zero ingredients."
    },
    {
      rule: "silence",
      ko: "커서도 조금 피곤해 보입니다.",
      en: "The cursor requested a chair and emotional insurance."
    }
  ],
  keyrepeat: [
    {
      rule: "keyrepeat",
      ko: "반응하는 것과 푸는 것은 다릅니다.",
      en: "Reaction is solving wearing a cardboard crown."
    },
    {
      rule: "keyrepeat",
      ko: "이건 디버깅이 아니라 기도 같군요.",
      en: "The keyboard chapel is open, but no gods subscribed."
    }
  ]
};

const ruleMeta: Record<Rule, { label: string; file: string; color: string; joke: string; metric: string }> = {
  panic: {
    label: "Panic Typing",
    file: "trigger-config.ts",
    color: "#f85149",
    joke: "1초에 22타를 넘기면 손이 먼저 출발했다고 판단합니다. 생각은 다음 정류장에 있습니다.",
    metric: "최근 1초 22자 이상"
  },
  backspace: {
    label: "Backspace Spiral",
    file: "typing-detector.ts",
    color: "#d29922",
    joke: "Backspace 5회 연타나 2초 꾹 누름을 잡습니다. 작성보다 철회가 선명한 순간입니다.",
    metric: "5회/초 또는 2초 홀드"
  },
  silence: {
    label: "Frozen Silence",
    file: "subtitle-scheduler.ts",
    color: "#58a6ff",
    joke: "직전에 입력이 있었는데 30초 동안 멈추면, 해결 중인지 응시 중인지 자막이 물어봅니다.",
    metric: "입력 후 30초 침묵"
  },
  keyrepeat: {
    label: "Key Repeat",
    file: "caption-bank.ts",
    color: "#bc8cff",
    joke: "Esc, Enter, Space를 반복하면 문제를 푸는 게 아니라 문제에 반응하는 중이라고 봅니다.",
    metric: "Esc/Enter/Space 반복"
  }
};

const mockTriggers: { rule: Rule; label: string }[] = [
  { rule: "panic", label: "22t/s" },
  { rule: "backspace", label: "Backspace 5x" },
  { rule: "silence", label: "Silence 30s" },
  { rule: "keyrepeat", label: "Esc / Enter / Space" }
];

const sampleCode = `export default function Page() {
  return (
    <main className="grid place-items-center h-screen">
      <h1 className="text-4xl font-bold">
        Hello, world.
      </h1>
    </main>
  );
}

// 빠르게 치거나, 지우거나, 멈추거나, Esc/Enter/Space를 반복해보세요.`;

const introCaption: Caption = {
  rule: "silence",
  ko: "Monaco에 타이핑하면 하단 자막이 반응합니다.",
  en: "Monaco has ears now, which is illegal in three keyboards."
};

function pickCaption(rule: Rule, previous?: Caption | null) {
  const pool = captionBank[rule];
  const available = pool.filter((caption) => caption.en !== previous?.en);
  return available[Math.floor(Math.random() * available.length)] ?? pool[0];
}

function pickEnglishMaleVoice(voices: SpeechSynthesisVoice[]) {
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en") || voice.name.toLowerCase().includes("english"));
  const maleVoiceHints = ["male", "man", "david", "mark", "alex", "daniel", "fred", "george", "tom", "aaron"];

  return (
    englishVoices.find((voice) => maleVoiceHints.some((hint) => voice.name.toLowerCase().includes(hint))) ??
    englishVoices.find((voice) => voice.lang.toLowerCase() === "en-us") ??
    englishVoices[0] ??
    null
  );
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
    "Backspace",
    "Delete",
    "Escape",
    "Enter",
    "Home",
    "End",
    "PageUp",
    "PageDown",
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
  const [activeMetric, setActiveMetric] = useState("subtitle engine: idle");

  const keyTimesRef = useRef<number[]>([]);
  const backspaceTimesRef = useRef<number[]>([]);
  const repeatTimesRef = useRef<Record<string, number[]>>({ Escape: [], Enter: [], " ": [] });
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimersRef = useRef<Partial<Record<string, ReturnType<typeof setTimeout>>>>({});
  const previousCaptionRef = useRef<Caption | null>(introCaption);
  const speechVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const speakEnglishCaption = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;

    const synth = window.speechSynthesis;
    speechVoiceRef.current = speechVoiceRef.current ?? pickEnglishMaleVoice(synth.getVoices());

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechVoiceRef.current?.lang ?? "en-US";
    utterance.voice = speechVoiceRef.current;
    utterance.rate = 0.92;
    utterance.pitch = 0.82;

    synth.cancel();
    synth.speak(utterance);
  }, []);

  const fireCaption = useCallback((rule: Rule) => {
    const next = pickCaption(rule, previousCaptionRef.current);
    previousCaptionRef.current = next;
    setCaption(next);
    setActiveMetric(`${ruleMeta[rule].label}: 감지됨`);
    setVisible(true);
    speakEnglishCaption(next.en);

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 4200);
  }, [speakEnglishCaption]);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      fireCaption("silence");
    }, 30000);
  }, [fireCaption]);

  const clearHoldTimer = useCallback((key: string) => {
    const timer = holdTimersRef.current[key];
    if (timer) clearTimeout(timer);
    delete holdTimersRef.current[key];
  }, []);

  const clearAllHoldTimers = useCallback(() => {
    Object.values(holdTimersRef.current).forEach((timer) => {
      if (timer) clearTimeout(timer);
    });
    holdTimersRef.current = {};
  }, []);

  const trackWindow = (bucket: number[], now: number, windowMs = 1000) => {
    bucket.push(now);
    while (bucket.length && now - bucket[0] > windowMs) bucket.shift();
    return bucket.length;
  };

  const onDemoKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      const now = performance.now();
      resetSilenceTimer();

      const repeatedRule: Rule | null =
        event.key === "Backspace"
          ? "backspace"
          : event.key === "Escape" || event.key === "Enter" || event.key === " "
            ? "keyrepeat"
            : null;

      if (repeatedRule && !event.repeat) {
        clearHoldTimer(event.key);
        holdTimersRef.current[event.key] = setTimeout(() => {
          if (repeatedRule === "backspace") backspaceTimesRef.current = [];
          if (repeatedRule === "keyrepeat") repeatTimesRef.current[event.key] = [];
          fireCaption(repeatedRule);
          clearHoldTimer(event.key);
        }, 2000);
      }

      if (repeatedRule && event.repeat) return;

      // TODO(IME): 현재는 한글 조합 입력도 영문과 동일하게 카운트한다.
      // 빠른 한글 입력에서 패닉 자막이 과민하게 뜨면 compositionstart/end로 제외 여부를 검토한다.
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
          return;
        }
      }

      if (!isCountableKey(event)) return;

      const keyCount = trackWindow(keyTimesRef.current, now);
      if (keyCount >= 22) {
        keyTimesRef.current = [];
        fireCaption("panic");
      }
    },
    [clearHoldTimer, fireCaption, resetSilenceTimer]
  );

  const onDemoKeyUp = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      clearHoldTimer(event.key);
    },
    [clearHoldTimer]
  );

  useEffect(() => {
    const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    const refreshVoice = () => {
      speechVoiceRef.current = synth ? pickEnglishMaleVoice(synth.getVoices()) : null;
    };

    if (synth) {
      refreshVoice();
      synth.addEventListener("voiceschanged", refreshVoice);
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearAllHoldTimers();
      if (synth) {
        synth.removeEventListener("voiceschanged", refreshVoice);
        synth.cancel();
      }
    };
  }, [clearAllHoldTimers]);

  return (
    <main className="page-shell">
      <div className="noise-layer" />
      <nav className="nav">
        <a className="brand" href="#top" aria-label="Typing Over It 홈">
          <span className="brand-mark">⌘</span>
          <span>Typing Over It</span>
        </a>
        <div className="nav-links">
          <a href="https://typing-over-it.vercel.app/" target="_blank" rel="noopener noreferrer">
            실시간 에디터
          </a>
          <a href="#failures">감지룰</a>
          <a href="#faq">FAQ</a>
        </div>
      </nav>

      <section id="top" className="hero section-grid">
        <div className="hero-copy">
          <div className="eyebrow">Getting Over It식 자막 오버레이</div>
          <h1>
            타이핑에
            <br />
            훈수를.
          </h1>
          <p className="hero-lede">
            VS Code처럼 생긴 웹 IDE에서 파일을 열고 타이핑하면, 패닉 입력·백스페이스 루프·긴 침묵·Esc/Enter/Space 반복을 감지합니다.
            감지된 순간에는 하단에 한국어 자막과 말도 안 되는 해석본이 같이 뜹니다.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="https://typing-over-it.vercel.app/" target="_blank" rel="noopener noreferrer">
              에디터에서 쳐보기
            </a>
            <a className="button button-ghost" href="#failures">
              감지 규칙 보기
            </a>
          </div>
          <div className="command-strip" role="note">
            <span>&gt;</span> Typing Over It <strong>typing pattern detected → subtitle overlay queued</strong>
          </div>
        </div>
        <div className="hero-card" aria-label="Typing Over It 미리보기">
          <div className="hero-window-top">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
            <strong>ide-demo — Visual Studio Code</strong>
          </div>
          <div className="hero-window-body">
            <div className="hero-side">
              <span>EXPLORER</span>
              <b>page.tsx</b>
              <b>Button.tsx</b>
              <b>package.json</b>
            </div>
            <div className="hero-code">
              <code>export default function Page() &#123;</code>
              <code>&nbsp;&nbsp;return &lt;main&gt;</code>
              <code>&nbsp;&nbsp;&nbsp;&nbsp;&lt;h1&gt;Hello, world.&lt;/h1&gt;</code>
              <code>&nbsp;&nbsp;&lt;/main&gt;;</code>
              <code>&#125;</code>
            </div>
          </div>
          <div className="comment-stack" aria-label="감지 규칙 뱃지">
            <span>panic: 22 keys/s</span>
            <span>backspace: 5 taps/s</span>
            <span>silence: 30s</span>
          </div>
          <div className="hero-stamp">EN?</div>
          <div className="hero-caption">
            <p>속도는 방향이 아닙니다.</p>
            <span>Speed went to the gym, direction stayed in bed.</span>
          </div>
          <div className="hero-art-badge">KO + 이상한 EN</div>
        </div>
      </section>

      <section id="demo" className="demo-section">
        <div className="section-heading">
          <span className="eyebrow">제품 미리보기</span>
          <h2>저주받은 에디터에 타이핑하세요.</h2>
          <p>아래 미니 에디터는 실제 제품의 프리뷰입니다. 빠르게 입력하거나, Backspace를 반복하거나, Esc/Enter/Space를 두드리면 하단 자막이 올라옵니다.</p>
        </div>
        <div className="mock-buttons" aria-label="자막 mock 트리거">
          {mockTriggers.map(({ rule, label }) => (
            <button key={rule} type="button" onClick={() => fireCaption(rule)}>
              {label}
            </button>
          ))}
        </div>

        <div className="ide-frame">
          <div className="traffic-lights" aria-hidden="true">
            <span className="red" />
            <span className="yellow" />
            <span className="green" />
          </div>
          <div className="ide-tabs">
            <span className="active-tab">page.tsx</span>
            <span>layout.tsx</span>
            <span>Button.tsx</span>
          </div>
          <div className="ide-body">
            <aside className="activity-bar" aria-hidden="true">
              <span>▣</span>
              <span>⌕</span>
              <span>⑂</span>
              <span>⚠</span>
            </aside>
            <aside className="explorer">
              <p>EXPLORER</p>
              <span>▾ src</span>
              <span className="dirty">src/app/page.tsx 변경됨</span>
              <span>src/app/layout.tsx</span>
              <span>src/components/Button.tsx</span>
              <span>README.md</span>
              <div className="mini-metric">
                <strong>{activeMetric}</strong>
                <small>자막은 에디터 하단 중앙에 페이드인/아웃됩니다.</small>
              </div>
            </aside>
            <div className="editor-pane">
              <div className="editor-toolbar">
                <span>src / app / page.tsx</span>
                <span className="panic-meter">subtitle scheduler ▂▃▄▆▇</span>
              </div>
              <textarea
                aria-label="Typing Over It 제품 미리보기 에디터"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={onDemoKeyDown}
                onKeyUp={onDemoKeyUp}
                onBlur={clearAllHoldTimers}
                spellCheck={false}
              />
              {caption && (
                <div className={`caption-overlay ${visible ? "is-visible" : ""}`} aria-live="polite">
                  <div className="caption-wave">⌁</div>
                  <div>
                    <p className="caption-ko">{caption.ko}</p>
                    <p className="caption-en">
                      {caption.en}
                    </p>
                  </div>
                  <span className="caption-rule">{ruleMeta[caption.rule].label}</span>
                </div>
              )}
            </div>
          </div>
          <div className="problems-bar">
            <span>STATUS</span>
            <span>KO/EN subtitle overlay</span>
            <span>Monaco-style editor preview</span>
          </div>
        </div>
      </section>

      <section id="failures" className="section-grid failures-section">
        <div className="section-heading sticky-heading">
          <span className="eyebrow">기계를 실망시키는 네 가지 방법</span>
          <h2>타이핑의 모양만 봐도 대충 압니다.</h2>
          <p>도와주지는 않습니다. 그냥 지켜봅니다. 그래도 어떤 회의보다는 피드백이 빠릅니다.</p>
          <p>실제 제품은 window 키 이벤트를 한 채널로 모으고, 규칙에 맞는 순간에 자막 스케줄러로 넘깁니다. Monaco 내부 키 핸들러와 중복 발화하지 않게 설계되어 있습니다.</p>
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
            </article>
          ))}
        </div>
      </section>

      <section className="settings-section section-grid">
        <div className="settings-card">
          <div className="settings-title">
            <span>lib / trigger-config.ts</span>
            <strong>자막은 감정이 아니라 타이밍으로 뜹니다.</strong>
          </div>
          {[
            ["Panic Typing", "최근 1초 22자 이상 (ssh의 포트 번호는?)"],
            ["Backspace Spiral", "5회/초 또는 2초 홀드"],
            ["Frozen Silence", "이전 입력 후 30초 정지"],
            ["Key Repeat", "Esc / Enter / Space 반복"],
            ["Subtitle timing", "0.2초 등장 · 4초 유지 · 1.5초 퇴장"],
            ["Overlay", "에디터 하단 중앙 KO + EN 2줄"]
          ].map(([key, value]) => (
            <div className="setting-row" key={key}>
              <code>{key}</code>
              <span>{value}</span>
            </div>
          ))}
        </div>
        {/* <div className="problems-image-card">
          <div className="mobile-problems-panel">
            <strong>제품 화면 구성</strong>
            <span>VS Code / Activity Bar / Explorer</span>
            <span>Monaco 에디터 + 탭 + 저장 상태</span>
            <span>파일/폴더 생성과 sessionStorage 기반 변경 보존</span>
            <span>하단 자막 오버레이와 fade-out 잔상</span>
          </div>
        </div> */}
      </section>

      <section className="quote-wall">
        <span className="eyebrow">자막 샘플: 한국어는 차분하고 영어는 이상한 철학</span>
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
            <h3>진짜 IDE인가요?</h3>
            <p>아니요. VS Code처럼 보이는 웹 IDE 데모입니다. Monaco, 파일 트리, 탭, 저장 흐름까지는 그럴듯하게 움직입니다.</p>
          </div>
          <div>
            <h3>무엇을 감지하나요?</h3>
            <p>빠른 입력, Backspace 루프, 입력 후 긴 침묵, Esc/Enter/Space 반복을 감지합니다. 마이크 소리 감지는 제품 화면에서 다루지 않습니다.</p>
          </div>
          <div>
            <h3>자막은 어디에 뜨나요?</h3>
            <p>에디터 영역 하단 중앙에 뜹니다. 한국어 한 줄, 영문 한 줄이 같이 나오고 자연스럽게 사라집니다.</p>
          </div>
          <div>
            <h3>영문은 왜 저래요?</h3>
            <p>정상 번역이 아닙니다. 일부러 이상한 해석본입니다. 영어가 맞는지보다 웃긴게 더 우선입니다.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>Typing Over It</span>
        <span>Fake IDE. Real typing patterns. Weird subtitles.</span>
      </footer>
    </main>
  );
}
