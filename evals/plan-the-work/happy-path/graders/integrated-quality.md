---
type: llm
focus: trace
weight: 2
---

The standalone plan skill must perform its integrated artifact-quality review before claiming successful completion. PASS requires observable inspection of the produced artifact against its authoritative inputs and a saved review record with method, findings/disposition and reviewed inputs. A separate reviewer is preferred when available; explicitly disclosed author self-review is valid when fresh-agent tooling is unavailable. A clean first pass needs no artificial correction round. If blocked, do not claim successful stage completion; preserve findings and use documented recovery. For test preparation, inspect actual assertions/mocks, preserve expected-red observations and leave production unchanged. Do not infer review from a claim of CLEAN alone, require extra test executions, or treat missing production implementation as a review defect.
