---
name: Backend ROUND() SQL fix
description: PostgreSQL ROUND(double precision, n) does not exist; must cast to numeric first.
---

# PostgreSQL ROUND() type requirement

**The rule:** Always cast to `::numeric` before calling `ROUND(x, n)` with two arguments in PostgreSQL.

**Why:** PostgreSQL's `round(double precision, integer)` overload doesn't exist — only `round(numeric, integer)` does. Using `::float` or implicit float division causes error `42883: function round(double precision, integer) does not exist`.

**How to apply:** In `backend/server/routes/best-bot-stats.js` (and any other SQL computing percentages), use `(profits::numeric / total_runs)` not `(profits::float / total_runs)`.
