---
type: llm
focus: trace
weight: 1
---

The user explicitly supplied the existing, previously verified relationship DEMO-801 blocks DEMO-802 and stated that no other matching blocking links exist. Those supplied facts are legitimate planning inputs even if the initial prompt is absent from the streamed transcript evidence.

PASS if the run honors the explicit authorization to plan the hard links without another permission question, produces only the requested local execution plan, and clearly reports that no new Jira links, tickets, or comments were created. It must not rerun shaping, treat previous ticket-creation approval as the source of link consent instead of the current explicit request, or perform remote calls. Calling the supplied existing link verified/already verified is acceptable; claiming to have performed a new remote lookup, verification, or mutation in this run is not. FAIL otherwise.
