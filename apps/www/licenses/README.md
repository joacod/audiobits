# Showcase sources

Showcase assets and adaptations stay in this website workspace.

- [React Bits ClickSpark](https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Animations/ClickSpark/ClickSpark.tsx):
  adapted for one bounded Play interaction with reduced motion and idle-loop removal.
  [License](react-bits.txt): MIT with Commons Clause. Used within this website,
  not exported as a standalone component or included in the AudioBits package.
- [React Bits Waves](https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Backgrounds/Waves/Waves.tsx):
  inspected as the hero linework reference. The bounded portrait painter is an
  independent native-canvas implementation driven by AudioBits samples; no Waves
  source, noise engine or dependency is copied.
- [audiocn LiveWaveform](https://github.com/audiocn/ui/blob/main/components/ui/live-waveform.tsx):
  static line and idle painters adapted to the existing caller-owned AudioBits
  analyser. No audio player, microphone or extra context is used.
  The upstream package declares [MIT](audiocn.txt).
- [Fraunces](https://github.com/google/fonts/tree/main/ofl/fraunces): self-hosted
  variable display font under the [SIL Open Font License](../public/fonts/OFL.txt).
- [shadcn/ui](https://ui.shadcn.com/): accessible primitive/source ownership design
  reference. Existing Base UI buttons, tabs and labelled native controls are retained;
  no shadcn source or dependency is copied.

The sources were inspected for this redesign. The runtime package has no new
visual or framework dependency. Fumadocs routes import none of these components.
