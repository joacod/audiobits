# Recipe authoring and experimental bus effects

Inline `defineSound()` authoring preserves parameter names and modes through
`audio.sound()`, `sound.play()`, and `voice.set()`. Play accepts all declared
parameters; set accepts live parameters only. Broad `Recipe` values and unknown
JSON retain runtime validation and dynamic controls. Typed authoring rejects
unknown input at compile time; external data uses `validateRecipe()` or the
validated `audio.sound(unknown)` boundary. The authoring overload still
runs the same validator and returns a frozen snapshot; types never establish
semantic validity. No schema or serialization change is required.

Shared delay remains useful for existing demos and ownership tests, but
`Bus.setDelay()` and `DelayOptions` are experimental and may change before 0.1.
Gain, mute, and routing remain fundamental bus operations. A generalized effects
API waits for multiple real sound requirements. Native interop currently covers
output/analyser taps; arbitrary graph ownership is outside this contract.
