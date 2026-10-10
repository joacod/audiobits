"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { mountThruster } from "../../../../../catalog/reactive-thruster/host";
import { OutputScope } from "../../output-scope";

type Host = ReturnType<typeof mountThruster>;
const subscribeHydration = () => () => {};
export function ThrusterShowcase({
  sources,
}: {
  sources: { name: string; code: string }[];
}) {
  const pad = useRef<HTMLDivElement>(null);
  const craft = useRef<HTMLDivElement>(null);
  const meter = useRef<HTMLOutputElement>(null);
  const host = useRef<Host | null>(null);
  const readEngine = useCallback(() => host.current?.audio ?? null, []);
  const [state, setState] = useState("stopped");
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [throttle, setThrottle] = useState(0.2);
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [copyState, setCopyState] = useState("");
  useEffect(() => {
    const current = mountThruster(pad.current!, {
      state(value) {
        setState(value);
        if (value === "stopped") {
          if (meter.current) meter.current.textContent = "0%";
          craft.current?.style.setProperty("--thrust", "0");
        }
        if (value === "starting") setError("");
      },
      error(cause) {
        setError(`${String(cause)}. Try Start thruster or drag again.`);
      },
      output: setActive,
      throttle(value) {
        if (meter.current)
          meter.current.textContent = `${Math.round(value * 100)}%`;
        craft.current?.style.setProperty("--thrust", String(value));
      },
    });
    host.current = current;
    return () => {
      host.current = null;
      void current.dispose().catch(console.error);
    };
  }, []);
  async function copy(name: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState(`Copied ${name}`);
    } catch {
      setCopyState("Copy unavailable. Select and copy the source below.");
    }
  }
  return (
    <>
      <section
        className="flight-stage"
        aria-label="Reactive thruster interaction"
      >
        <div
          className="flight-pad"
          ref={pad}
          data-state={state}
          aria-label="Drag to fly"
          aria-describedby="flight-help"
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const x = Math.max(
              8,
              Math.min(
                92,
                ((event.clientX - bounds.left) / bounds.width) * 100,
              ),
            );
            const y = Math.max(
              12,
              Math.min(
                88,
                ((event.clientY - bounds.top) / bounds.height) * 100,
              ),
            );
            craft.current?.style.setProperty("left", `${x}%`);
            craft.current?.style.setProperty("top", `${y}%`);
          }}
        >
          <div className="flight-orbit" aria-hidden="true" />
          <div className="flight-craft" ref={craft} aria-hidden="true">
            <svg viewBox="0 0 100 150">
              <path className="exhaust" d="M36 87 Q50 145 64 87" />
              <path d="M50 10 76 79 50 67 24 79Z" />
              <circle cx="50" cy="47" r="7" />
            </svg>
          </div>
          <p className="flight-invitation">
            {state === "stopped"
              ? "Take hold. Make it move."
              : state === "starting"
                ? "Activating audio…"
                : "Your motion is the throttle."}
          </p>
          <span className="flight-readout">
            Live thrust <output ref={meter}>0%</output>
          </span>
        </div>
        <div className="flight-controls">
          <div>
            <h2>Reactive thruster</h2>
            <p id="flight-help">
              Drag anywhere in the flight area. Or use Start and the throttle
              below with your keyboard.
            </p>
          </div>
          <div className="audio-controls">
            <button
              className="play-action"
              disabled={!ready || state !== "stopped"}
              onClick={() => host.current?.start(throttle)}
            >
              Start thruster
            </button>
            <button disabled={!ready} onClick={() => host.current?.release()}>
              Release thruster
            </button>
            <button
              disabled={!ready}
              onClick={() => {
                setError("");
                void host.current?.impact();
              }}
            >
              Play impact
            </button>
          </div>
          <label>
            Keyboard throttle: {Math.round(throttle * 100)}%
            <input
              aria-label="Throttle"
              type="range"
              min="0"
              max="1"
              step="0.01"
              disabled={!ready}
              value={throttle}
              onChange={(event) => {
                const value = Number(event.target.value);
                setThrottle(value);
                host.current?.setThrottle(value);
              }}
            />
          </label>
          <p className="flight-state" role="status">
            Thruster: {state}
            {muted ? " · muted" : ""}
          </p>
          {error && <p role="alert">{error}</p>}
          <OutputScope
            engine={readEngine}
            active={active && !muted}
            family="flow"
          />
        </div>
      </section>
      <div className="flight-safety" aria-label="Audio controls">
        <span>Audio starts only when you interact.</span>
        <div className="audio-controls">
          <button
            disabled={!ready}
            aria-pressed={muted}
            onClick={() => {
              const next = !muted;
              host.current?.mute(next);
              setMuted(next);
            }}
          >
            Mute
          </button>
          <button disabled={!ready} onClick={() => host.current?.stop()}>
            Stop all
          </button>
        </div>
      </div>
      <section className="thruster-source" aria-labelledby="source-heading">
        <h2 id="source-heading">Take the sound. Own the interaction.</h2>
        <p>
          AudioBits is the npm runtime. This recipe and its integration are
          yours to copy and change. Reactive thruster is catalog source,
          separate from the bundled thruster preset.
        </p>
        <p>
          For just the sound, copy <code>recipe.ts</code> and use{" "}
          <code>audio.sound(reactiveThruster)</code>. For the complete
          interaction, copy all four files into a vanilla TypeScript project.
        </p>
        <pre>
          <code>
            npm install audiobits{"\n"}npm install --save-dev vite typescript
            {"\n"}npx vite
          </code>
        </pre>
        <p>
          Put the files beside each other and open the Vite URL. No React or
          Next.js required. The host starts from a gesture, shares one engine
          with impact, suspends on hide, and disposes on teardown. Call{" "}
          <code>host.dispose()</code> when removing a view in your own app.
        </p>
        <p>
          Velocity reaches full thrust at 1200 px/s. Throttle controls pitch,
          brightness and level, smoothed over 60 ms. Release preserves up to 280
          ms of tail; Stop all cuts it immediately.
        </p>
        <p role="status">{copyState}</p>
        {sources.map(({ name, code }) => (
          <details key={name}>
            <summary>{name}</summary>
            <button
              onClick={() => {
                void copy(name, code);
              }}
            >
              Copy {name}
            </button>
            <pre>
              <code>{code}</code>
            </pre>
          </details>
        ))}
      </section>
    </>
  );
}
