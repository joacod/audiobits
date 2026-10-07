# Ten-experience recipe study

Status: the first three fixtures are implemented and have automated signal
evidence. Confirmation passed Step 02 maintainer listening; Step 03 manual
verification for all three was confirmed by the maintainer. The remaining seven are authoring sketches,
not rendered or accepted sounds. Values are starting points, not quality claims. The [recipe model](recipe-model.md) defines their proposed semantics.

## First three implementation fixtures

### Refined confirmation

Two soft sine layers with a short upward movement. Avoid harsh onsets and an
overly bright arcade character. The example uses a 180 ms gate plus release,
not a 180 ms total duration.

```json
{
  "schemaVersion": 1,
  "kind": "one-shot",
  "duration": 0.18,
  "layers": [
    {
      "id": "body",
      "source": { "type": "oscillator", "waveform": "sine", "frequency": { "points": [[0, 520], [0.05, 660]], "curve": "exponential" } },
      "gainDb": -14,
      "envelope": { "attack": 0.004, "decay": 0.12, "sustain": 0.08, "release": 0.04 }
    },
    {
      "id": "air",
      "source": { "type": "oscillator", "waveform": "sine", "frequency": 1320 },
      "gainDb": -26,
      "envelope": { "attack": 0.008, "decay": 0.1, "sustain": 0.03, "release": 0.05 }
    }
  ],
  "effects": [{ "type": "filter", "filter": "lowpass", "frequency": 3200, "q": 0.7 }]
}
```

Acceptance: audible and restrained at default volume, no abrupt onset/ending,
and pleasant repeated triggering. Test the tail against the declared envelope.

### Impact with intensity

Combine a descending triangle body with a filtered noise transient. Intensity
changes gain, pitch movement, and transient brightness together; it is sampled
at play time. Seed controls noise variation.

```json
{
  "schemaVersion": 1,
  "kind": "one-shot",
  "duration": 0.22,
  "parameters": { "intensity": { "min": 0, "max": 1, "default": 0.5, "mode": "play" } },
  "layers": [
    {
      "id": "body",
      "source": { "type": "oscillator", "waveform": "triangle", "frequency": { "points": [[0, { "control": "intensity", "range": [100, 220], "scale": "linear" }], [0.12, 48]], "curve": "exponential" } },
      "gainDb": { "control": "intensity", "range": [-22, -12], "scale": "linear" },
      "envelope": { "attack": 0.003, "decay": 0.16, "sustain": 0.02, "release": 0.05 }
    },
    {
      "id": "transient",
      "source": { "type": "noise", "color": "white" },
      "gainDb": -24,
      "envelope": { "attack": 0.002, "decay": 0.04, "sustain": 0, "release": 0.01 },
      "effects": [{ "type": "filter", "filter": "lowpass", "frequency": { "control": "intensity", "range": [900, 4200], "scale": "exponential" }, "q": 0.7 }]
    }
  ]
}
```

Acceptance: the control changes perceived force rather than merely loudness;
default playback retains headroom, repeated hits vary coherently, and extreme
values remain usable. A future material control is not implied by this fixture.

### Thruster with live throttle

A low triangle tone and filtered noise track throttle continuously. Start once,
update one voice, then stop with release. Do not retrigger the entire sound on
every slider event.

```json
{
  "schemaVersion": 1,
  "kind": "sustained",
  "parameters": { "throttle": { "min": 0, "max": 1, "default": 0.2, "mode": "live", "smoothing": 0.04 } },
  "layers": [
    {
      "id": "motor",
      "source": { "type": "oscillator", "waveform": "triangle", "frequency": { "control": "throttle", "range": [45, 130], "scale": "exponential" } },
      "gainDb": { "control": "throttle", "range": [-30, -18], "scale": "linear" },
      "envelope": { "attack": 0.08, "decay": 0.1, "sustain": 0.8, "release": 0.15 }
    },
    {
      "id": "exhaust",
      "source": { "type": "noise", "color": "white" },
      "gainDb": { "control": "throttle", "range": [-34, -22], "scale": "linear" },
      "envelope": { "attack": 0.1, "decay": 0.1, "sustain": 0.9, "release": 0.2 },
      "effects": [{ "type": "filter", "filter": "lowpass", "frequency": { "control": "throttle", "range": [250, 2400], "scale": "exponential" }, "q": 0.7 }]
    }
  ]
}
```

Acceptance: continuous motion sounds smooth, sustained noise has no obvious loop
seam, rapid retargeting does not create clicks, and stop/navigation/hide leave no
active voice. Implement bounded seam treatment in the noise generator; do not
claim that looping an arbitrary random buffer is automatically seamless.

## Remaining seven sketches

These designs test the representation before implementation. They are not seven
additional required core features.

| Experience | Recipe sketch | Control and lifecycle | Scope decision |
| --- | --- | --- | --- |
| Tactile click | 25 ms gate; triangle body at 180 Hz; filtered noise transient; 5 ms release | Play-only intensity; low amplitude; repeated triggers | Existing core primitives |
| Gentle rejection | 180 ms gate; two sine layers descending 420→300 and 630→450 Hz; restrained lowpass | No live controls; short release | Existing core primitives |
| Glass notification | 350 ms gate; sine layers near 880, 1424, and 2024 Hz; differing decay rates | Play-only brightness; seed applies small bounded tuning variation | Existing core primitives; layering approximates resonance |
| Transition whoosh | 300 ms gate; white noise; bandpass frequency automation 400→3500→700 Hz | Play-only size maps automation endpoints; fixed timing initially | Existing core primitives; no duration expression language |
| Pickup/power-up | 220 ms gate; triangle/sine layers; rising three-point pitch contour | Play-only intensity; deterministic optional variation | Existing core primitives; no sequencer required |
| Spatial beacon | Repeated short sine recipe; runtime voice position supplied by caller | Stereo pan first; later 3D listener/distance API; caller schedules repeats | 3D spatialization deferred; pan is not equivalent to 3D |
| Procedural ambience | Sustained filtered noise bed plus sparse finite event recipes | Density controls host scheduling; each event is a normal voice | Static bed uses core; event scheduler and continuous stochastic modulation deferred |

## Findings and pressure on the model

The first eight experiences fit a small layer/value/envelope model on paper.
This does not establish sound quality. The first three must be auditioned before
expanding the collection, and the remaining recipes need compiled fixtures and
individual listening evidence before inclusion in the gallery.

Spatialization is a runtime placement concern, while ambience may compose
multiple recipes over time. Forcing both into the one-sound schema would add
routing and scheduling concepts prematurely. A future scene/sequence model can
compose recipes without turning every recipe into an arbitrary graph.

Recipe duration stays fixed initially. Pitch transposition, adjustable envelope
times, material modeling, resonators, and continuous modulation are extension
pressures to evaluate, not hidden v1 requirements. Add an operation only when a
specific sound cannot meet its quality target with the current primitives.
