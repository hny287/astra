# Go Security Guide

- Use database/sql with parameterized queries — never fmt.Sprintf for SQL
- Avoid exec.Command with user-controlled arguments unsanitized
- Use crypto/rand for secure random generation, not math/rand
- Validate all HTTP inputs with proper parsing
- Set proper CORS headers, avoid * origins in production
- Use context for timeouts on all external calls
- Implement proper TLS configuration — set MinVersion: tls.VersionTLS12
- Never ignore errors — always handle err return values
- Use html/template not text/template for HTML output
- Sanitize all user input before logging