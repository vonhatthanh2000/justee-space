---
title: Finding database bottlenecks
summary: Measure the slow path, narrow the cause, and optimize the constraint that the evidence actually reveals.
category: Technical
publishedAt: 2026-08-04
---

# Finding database bottlenecks

Performance work starts with a precise question. Which request is slow? Where is the time spent? What changed between a healthy trace and a failing one?

The database is often blamed because it sits near the end of the request path. The cause may instead be repeated queries, missing bounds, contention, or work that should never have reached storage.

## Follow the evidence

Capture a representative trace, examine query plans, and change one meaningful variable at a time. Optimization without measurement can make a system faster in theory and harder to understand in practice.

That preference for inspectable behavior also shapes [building useful AI systems](/blog/building-useful-ai-systems). Both are examples of [learning in public](/blog/learning-in-public).
