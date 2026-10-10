"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { mountEnergyCharge } from "../../../../../catalog/energy-charge/host";
import { OutputScope } from "../../output-scope";

const subscribeHydration = () => () => {};
export function EnergyShowcase({
  sources,
}: {
  sources: { name: string; code: string }[];
}) {
  const host = useRef<ReturnType<typeof mountEnergyCharge> | null>(null);
  const frame = useRef(0);
  const holding = useRef(false);
  const pointer = useRef<number | null>(null);
  const pad = useRef<HTMLButtonElement>(null);
  const progress = useRef(0);
  const [charge, setCharge] = useState(0);
  const [state, setState] = useState("stopped");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState("");
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const readEngine = useCallback(() => host.current?.audio ?? null, []);
  const endHold = useCallback(() => {
    holding.current = false;
    cancelAnimationFrame(frame.current);
    const id = pointer.current;
    pointer.current = null;
    if (id !== null && pad.current?.hasPointerCapture(id))
      pad.current.releasePointerCapture(id);
  }, []);
  useEffect(() => {
    const current = mountEnergyCharge({
      state(value) {
        setState(value);
        if (value === "starting") setError("");
        if (value === "stopped") endHold();
      },
      error(cause) {
        setError(`${String(cause)}. Try Start charge again.`);
      },
    });
    host.current = current;
    return () => {
      endHold();
      host.current = null;
      void current.dispose().catch(console.error);
    };
  }, [endHold]);
  function update(value: number) {
    progress.current = value;
    setCharge(value);
    host.current?.setCharge(value);
  }
  function beginHold() {
    if (holding.current) return;
    holding.current = true;
    update(0);
    host.current?.start(0);
    // Use animation timestamps throughout: a queued first frame may predate the gesture.
    let previous: number | undefined;
    function tick(time: number) {
      if (!holding.current) return;
      const elapsed = previous === undefined ? 0 : Math.max(0, time - previous);
      update(Math.min(1, progress.current + elapsed / 3000));
      previous = time;
      if (progress.current < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
  }
  function release() {
    endHold();
    host.current?.release();
  }
  function stop() {
    endHold();
    host.current?.stop();
  }
  return (
    <>
      <section className="energy-stage" aria-label="Energy charge interaction">
        <button
          ref={pad}
          className="energy-pad"
          disabled={!ready}
          aria-label="Hold to charge"
          aria-describedby="charge-help"
          data-state={state}
          data-full={charge === 1}
          style={{ "--charge": charge } as React.CSSProperties}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0 || holding.current)
              return;
            pointer.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            beginHold();
          }}
          onPointerUp={(event) => {
            if (pointer.current === event.pointerId) release();
          }}
          onPointerCancel={(event) => {
            if (pointer.current === event.pointerId) stop();
          }}
          onLostPointerCapture={(event) => {
            if (pointer.current === event.pointerId) stop();
          }}
          onKeyDown={(event) => {
            if ((event.key === " " || event.key === "Enter") && !event.repeat) {
              event.preventDefault();
              beginHold();
            }
          }}
          onKeyUp={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              release();
            }
          }}
          onBlur={stop}
        >
          <span className="energy-core" aria-hidden="true">
            <span />
          </span>
          <span className="energy-readout">
            {Math.round(charge * 100)}%
            <small>
              {state === "running" && charge === 1
                ? "Full charge · holding"
                : "Hold to charge"}
            </small>
          </span>
        </button>
        <div className="energy-controls">
          <h2>Contain the energy.</h2>
          <p id="charge-help">
            Hold with a pointer, touch, Space or Enter. Three seconds to full
            charge. Release for a clean tail.
          </p>
          <div className="audio-controls">
            <button
              disabled={!ready}
              className="play-action"
              onClick={() => {
                endHold();
                host.current?.start(charge);
              }}
            >
              Start charge
            </button>
            <button disabled={!ready} onClick={release}>
              Release charge
            </button>
          </div>
          <label>
            Charge: {Math.round(charge * 100)}%
            <input
              aria-label="Charge"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={charge}
              disabled={!ready}
              onChange={(event) => {
                endHold();
                update(Number(event.target.value));
              }}
            />
          </label>
          <p role="status" className="energy-state">
            Charge: {state}
            {muted ? " · muted" : ""}
          </p>
          {error && <p role="alert">{error}</p>}
          <OutputScope
            engine={readEngine}
            active={state === "running" && !muted}
            family="harmonic"
          />
        </div>
      </section>
      <div className="energy-safety">
        <span>
          Audio starts only when you interact. Mute keeps progress running.
        </span>
        <div className="audio-controls">
          <button
            disabled={!ready}
            aria-pressed={muted}
            onClick={() => {
              host.current?.mute(!muted);
              setMuted(!muted);
            }}
          >
            Mute
          </button>
          <button disabled={!ready} onClick={stop}>
            Stop all
          </button>
        </div>
      </div>
      <section className="energy-source">
        <h2>Supply progress. Own the sound.</h2>
        <p>
          Copy recipe.ts for the sound alone: audio.sound(energyCharge),
          voice.set({"{ charge }"}) and voice.stop(). Copy progress.ts too for a
          controller with no DOM or timer. Your application owns progress,
          completion and cancellation.
        </p>
        <pre>
          <code>
            npm install audiobits{"\n"}npm install --save-dev vite typescript
            {"\n"}npx vite
          </code>
        </pre>
        <p>
          For a complete browser example, place all four files together. Start
          from a gesture, change progress, release with a 300 ms tail or Stop
          all to cut it. The host suspends on hide. Call host.dispose() when
          removing a view. No React or Next.js required.
        </p>
        <p role="status">{copyState}</p>
        {sources.map(({ name, code }) => (
          <details key={name}>
            <summary>{name}</summary>
            <button
              onClick={() => {
                void navigator.clipboard
                  .writeText(code)
                  .then(() => setCopyState(`Copied ${name}`))
                  .catch(() =>
                    setCopyState(
                      "Copy unavailable. Select and copy the source below.",
                    ),
                  );
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
