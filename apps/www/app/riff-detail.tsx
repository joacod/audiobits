"use client";

import { useEffect, useRef, useState } from "react";
import { mountRiffStage } from "./riff-stage";
import { takeExperienceAudio } from "../lib/experience-audio";
import { riffSongs } from "../lib/riff-songs";
import "./riff.css";

export function RiffReactorDetail() {
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<ReturnType<typeof mountRiffStage> | null>(null);
  const [songId, setSongId] = useState(riffSongs[0].id);
  const selected = riffSongs.find((entry) => entry.id === songId)!;
  const [error, setError] = useState("");
  const [hint, setHint] = useState("Tap the stage or press Enter to play.");
  useEffect(() => {
    if (!surface.current || !canvas.current) return;
    const prepared = takeExperienceAudio("riff-reactor", surface.current);
    const mounted = mountRiffStage(
      surface.current,
      canvas.current,
      {
        hint: setHint,
        error(cause) {
          setError(
            `${cause instanceof Error ? cause.message : String(cause)}. Press again to retry.`,
          );
        },
        clearError() {
          setError("");
        },
      },
      prepared,
    );
    stage.current = mounted;
    return () => {
      stage.current = null;
      void mounted.dispose().catch(console.error);
    };
  }, []);
  return (
    <>
      <div className="riff-song-picker">
        <label htmlFor="riff-song">Track</label>
        <span className="riff-song-control">
          <select
            id="riff-song"
            value={songId}
            onChange={(event) => {
              const entry = riffSongs.find(
                (song) => song.id === event.target.value,
              )!;
              stage.current?.select(entry);
              setSongId(entry.id);
            }}
          >
            {riffSongs.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.song.title}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            className="riff-song-chevron"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
      <div
        ref={surface}
        className="riff-stage catalog-gesture-stage audio-gesture-surface"
        role="group"
        aria-label="Riff Reactor stage"
        aria-describedby="riff-help"
        tabIndex={0}
      >
        <canvas ref={canvas} className="riff-highway" aria-hidden="true" />
        <div className="riff-caption" aria-hidden="true">
          <span>{hint}</span>
          <span>Procedural audio · No samples</span>
        </div>
      </div>
      <div className="riff-help">
        <p id="riff-help">
          {selected.description} Hit each note as it crosses the line to play
          the lead: tap the left, middle or right third of the stage, or press
          A, S, D (also J, K, L or the arrow keys). A missed note leaves a gap
          in the melody while the band plays on. Streaks lift the band to
          harmony and then the full arrangement on the next bar; a miss drops it
          back. Enter plays, Escape stops.
        </p>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </>
  );
}
