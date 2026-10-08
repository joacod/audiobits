"use client";

import { useState } from "react";
import { Button } from "@base-ui/react/button";
import type { AudioEngine, AudioState } from "audiobits";
import { OutputScope } from "./output-scope";

export function AudioMonitor({
  engine,
  active,
  current,
  state,
  muted,
  volume,
  ready,
  error,
  onMute,
  onStop,
  onVolume,
}: {
  engine: AudioEngine | null;
  active: boolean;
  current: string;
  state: AudioState;
  muted: boolean;
  volume: number;
  ready: boolean;
  error: string;
  onMute(): void;
  onStop(): void;
  onVolume(value: number): void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <aside
      className="audio-monitor gallery-mixer"
      aria-label="Audio monitor"
      data-expanded={expanded}
    >
      <div className="monitor-heading">
        <h2>Audio monitor</h2>
        <span>{current || "Choose a sound"}</span>
      </div>
      <OutputScope engine={engine} active={active} />
      <div className="audio-controls">
        <Button disabled={!ready} aria-pressed={muted} onClick={onMute}>
          Mute
        </Button>
        <Button disabled={!ready} onClick={onStop}>
          Stop all
        </Button>
        <Button
          className="monitor-expand"
          aria-expanded={expanded}
          aria-controls="monitor-volume"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Less" : "Levels"}
        </Button>
      </div>
      <label id="monitor-volume">
        Effects volume: {volume} dB
        <input
          aria-label="Effects volume"
          disabled={!ready}
          type="range"
          min="-60"
          max="0"
          step="1"
          value={volume}
          onChange={(event) => onVolume(Number(event.target.value))}
        />
      </label>
      <p role="status">Audio: {state}</p>
      {error && <p role="alert">{error}</p>}
    </aside>
  );
}
