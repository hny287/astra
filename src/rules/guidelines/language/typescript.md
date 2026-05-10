# TypeScript Security Guide

- All of JavaScript's security guidelines apply
- Use strict tsconfig: strict: true, noImplicitAny: true
- Avoid as any type assertions — they bypass type safety
- Type all API request/response schemas with Zod or io-ts
- Use branded types for sensitive data (Token, UserId, etc.)
- Never expose internal types in public API boundaries
- Validate runtime types even when TypeScript compiles
- Use unknown over any for truly unknown values
- Enable noUncheckedIndexedAccess for array/object access
- Avoid non-null assertions (!) — use proper null checks