---
"audiobits": minor
---

Add `voice.stop({ at })` to schedule the existing release envelope at an absolute audio-context time. Pending releases preserve live controls, earlier stops override them, and one-shot gates, tails and explicit cleanup retain their bounds.
