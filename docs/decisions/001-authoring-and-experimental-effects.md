# Recipe authoring and bus scope for 0.1

Inline `defineSound()` authoring preserves recipe structure, literal parameter
names and play/live modes through `audio.sound()`, `sound.play()` and
`voice.set()`. Play accepts declared parameters; set accepts live parameters
only. Broad `Recipe` values and unknown JSON retain runtime validation and
dynamic controls. Runtime validation remains authoritative for exact schema
validity, including unknown fields and semantic constraints. The authoring
overload runs the same validator and returns a frozen snapshot. No schema or
serialization change is required.

Before the initial release, shared delay and its public settings type were
removed. Gain, mute, parenting and routing are fundamental bus operations;
an effect-specific setter would encourage an unearned family of methods.
The unused delay graph, tail clocks and reconstruction logic were removed with
it. A generalized effects API waits for multiple real sound requirements.
Native interop covers output/analyser taps; arbitrary graph ownership is outside
this contract. The package was private and unreleased when these APIs were removed, with no
persisted consumer compatibility requirement.
