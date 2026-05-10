# Python Security Guide

- Use parameterized queries with ORMs or cursor.execute() with placeholders
- Never use pickle.loads() on untrusted data — use json or msgpack
- Avoid subprocess with shell=True — use list form instead
- Use secrets module for tokens, not random
- Validate all Flask/Django request inputs with schemas
- Enable CSRF protection in all form submissions
- Use python-dotenv for environment variables, never hardcode
- Keep DEBUG=False in production Django settings
- Use pip-audit or safety to check dependencies
- Apply bandit for static security analysis