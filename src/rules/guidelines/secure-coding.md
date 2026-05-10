# Secure Coding Principles

- Never trust user input. Validate and sanitize all inputs at the point of entry.
- Use parameterized queries for all database operations. Never concatenate user input into SQL.
- Apply the principle of least privilege to all system components.
- Implement defense in depth — never rely on a single security control.
- Fail securely — default to denial, not to openness.
- Use strong, modern cryptographic primitives. Avoid MD5, SHA1, DES, RC4.
- Keep secrets out of source code. Use environment variables or secret managers.
- Log security events, but never log sensitive data (passwords, tokens, PII).
- Review all third-party dependencies for known vulnerabilities.
- Implement proper error handling — never expose stack traces or internal details to users.