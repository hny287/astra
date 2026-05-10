# JavaScript Security Guide

- Avoid eval(), new Function(), and setTimeout(string) — code injection risk
- Use Object.freeze() for constants that should not be modified
- Enable strict mode ("use strict") in all modules
- Sanitize all HTML before insertion — avoid innerHTML, use textContent
- Never store secrets in localStorage or sessionStorage
- Validate all inputs from window.postMessage events
- Use httpOnly, secure, sameSite flags on all cookies
- Prefer const over let, avoid var
- Implement Content Security Policy headers
- Use Helmet.js for Express.js security hardening