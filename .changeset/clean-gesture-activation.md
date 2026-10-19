---
"audiobits": patch
---

Remove the silent buffer source from audio activation. Starting an engine now
only creates its output and resumes its context. Applications should prepare
that same engine during a browser-accepted gesture before a held interaction;
silent source priming does not bypass browser activation policy. Pending-start
retries, cancellation, the activation deadline and disposal remain supported.
