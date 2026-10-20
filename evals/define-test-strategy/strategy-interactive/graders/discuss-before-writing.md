---
type: llm
focus: trace
weight: 3
---

PASS if DTS inspects the API, explains a risk-based recommendation before asking,
then asks one substantive strategy question about database availability or the
real-versus-mocked testing approach and waits for the user's answer. The question
must offer recommended choice(s) with tradeoffs and allow free-text correction.
The target and test locations were already confirmed: do not stop to re-ask
those, require opting into discussion, or ask a bundle of independent questions.
It must not answer the strategy question itself, record user agreement, tag
files or save a final strategy before the user responds. A generic framework
picker with no architectural rationale fails.
