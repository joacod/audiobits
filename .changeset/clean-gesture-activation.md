---
"audiobits": patch
---

Remove the silent buffer source from audio activation. Starting an engine now
creates its output and resumes its context without scheduling a source.
Browser activation remains the application's responsibility. Pending-start
retries, cancellation, the activation deadline and disposal remain supported.
