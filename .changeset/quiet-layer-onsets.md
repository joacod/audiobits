---
"audiobits": minor
---

Add optional fixed `startOffset` seconds to recipe layers for staggered sources,
envelopes and layer frequency automation within one voice. One-shot layers retain
the shared duration gate; sustained onset automation remains bounded to 60 seconds
from voice start. Pending layers support cancellation, scheduled release, live
control smoothing and existing resource ownership. Export schema and capability
metadata for the additive recipe field.
