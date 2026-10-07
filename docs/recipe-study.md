# Sound-driven recipe studies

Test an abstraction against radically different concrete sounds before adding it.
Curated executable definitions live in `packages/audiobits/src/recipes/`; do not
maintain duplicate JSON fixtures in contributor docs.

## Method

A short study or PR paragraph answers: which actual sounds need the feature,
can existing nodes express them cleanly, does it belong in recipe or runtime,
and what does it do to portability, ownership and serialization? Add a primitive
only when quality requirements cannot be met by existing composition.

## Current design pressure

| Sound              | What it proves             | Existing vocabulary                                       |
| ------------------ | -------------------------- | --------------------------------------------------------- |
| Confirmation       | Layered upward one-shot    | Sine layers, frequency contours, envelopes                |
| Impact             | Force sampled at playback  | Triangle body, filtered noise, intensity                  |
| Thruster           | Continuous mutation        | Sustained sources, direct live mappings and smoothing     |
| Tactile click      | Restrained rapid feedback  | Short triangle body, filtered transient, slight variation |
| Gentle rejection   | Descending tonal movement  | Two sine layers and soft lowpass                          |
| Glass notification | Rich partials and decay    | Inharmonic sine layers, brightness control                |
| Whoosh             | Unpitched movement         | Filtered noise, bandpass automation, size control         |
| Power-up           | Expressive rising movement | Layered pitch contours, intensity, variation              |

These design targets do not prove pleasantness. Check envelopes, extrema, finite
output, repeated triggering and headroom, then listen at defaults and extrema.
Tuning is product work; eight convincing sounds matter more than preset count.

Spatial placement belongs to runtime, and ambience can compose multiple normal
sounds in the host. UI and visualization belong to presentation/runtime output.
Do not force them into `Recipe`. Resonators, saturation, adjustable envelopes and
continuous stochastic modulation remain requirements to earn, not hidden v1 features.
