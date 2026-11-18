---
type: regex
target: { source: file, path: "make-it-work/DEMO-READY/*plan-tests-*.json" }
pattern: '(?=[\s\S]*"status":\s*"ready")(?=[\s\S]*"result":\s*"expected-red")(?=[\s\S]*"plan_hash":\s*"[a-f0-9]{64}")'
weight: 3
---
