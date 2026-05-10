# Business Logic Vulnerability Patterns

- Missing authorization checks on business-critical operations
- Privilege escalation via parameter manipulation
- Bypassing multi-step workflows (e.g., skipping payment)
- Race conditions in financial transactions
- Insecure direct object references (IDOR)
- Missing rate limiting on sensitive operations
- Business rule enforcement only on client side
- Data validation only on frontend, not backend
- Time-of-check to time-of-use (TOCTOU) race conditions
- Improper handling of concurrent resource access