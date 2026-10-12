# Showcase sources

Showcase assets and adaptations stay in this website workspace.

- [React Bits ClickSpark](https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Animations/ClickSpark/ClickSpark.tsx):
  adapted for one bounded Play interaction with reduced motion and idle-loop removal.
  [License](react-bits.txt): MIT with Commons Clause. Used within this website,
  not exported as a standalone component or included in the AudioBits package.
- [React Bits Magic Rings](https://reactbits.dev/animations/magic-rings)
  ([registry source](https://reactbits.dev/r/MagicRings-TS-CSS.json)): free
  component, adapted in `app/charge-rings.tsx` so ring count, radius, color,
  rotation and thickness follow Energy Charge progress and measured output.
  The original clock cycle, pointer parallax, click burst, noise and three.js
  renderer are not included. Same [license](react-bits.txt): MIT with Commons
  Clause, copyright 2026 David Haz. Website-only. Not shipped in the package.
- [React Bits Ribbons](https://reactbits.dev/animations/ribbons): free
  component, adapted in `app/thruster-ribbons.tsx` so the trail follows the
  thruster play-surface point, throttle, and measured output. The published
  window listeners, independent cursor chase, and continuous demo loop are not
  included. Same [license](react-bits.txt): MIT with Commons Clause, copyright
  2026 David Haz. Website-only. Not shipped in the package or the independent
  catalog.
- [React Bits Waves](https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Backgrounds/Waves/Waves.tsx):
  inspected as the hero linework reference. The bounded portrait painter is an
  independent native-canvas implementation driven by AudioBits samples; no Waves
  source, noise engine or dependency is copied.
- [audiocn LiveWaveform](https://github.com/audiocn/ui/blob/main/components/ui/live-waveform.tsx):
  static line and idle painters adapted to the existing caller-owned AudioBits
  analyser. No audio player, microphone or extra context is used.
  The upstream package declares [MIT](audiocn.txt).
- [Big Shoulders Display](https://github.com/xotypeco/big_shoulders): headline
  face, weights 800 and 900, self-hosted with `next/font/local` from the
  `@fontsource/big-shoulders-display` package under the
  [SIL Open Font License 1.1](big-shoulders-display.txt).
- [Geist Mono](https://github.com/vercel/geist-font): UI, label, code and
  instrument body face, weights 400 and 500, self-hosted with `next/font/local`
  from the `@fontsource/geist-mono` package under the
  [SIL Open Font License 1.1](geist-mono.txt).
- [shadcn/ui](https://ui.shadcn.com/): accessible primitive/source ownership design
  reference. Existing Base UI buttons, tabs and labelled native controls are retained;
  no shadcn source or dependency is copied.

The sources were inspected for this redesign. The runtime package has no new
visual or framework dependency. Fumadocs routes import none of these components.
