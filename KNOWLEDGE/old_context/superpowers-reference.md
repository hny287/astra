# Superpowers 5.1.0 — Complete Skills Reference

## Overview

Superpowers is a complete software development methodology for coding agents, built on composable skills and initial instructions that ensure the agent uses them. The core workflow: the agent does not jump into writing code; it asks what you are really trying to do, teases out a spec, presents it for validation, writes an implementation plan emphasizing TDD/YAGNI/DRY, then executes via subagent-driven development with two-stage review per task. Skills trigger automatically; they are mandatory workflows, not suggestions.

**Philosophy:** Test-Driven Development, Systematic over ad-hoc, Complexity reduction, Evidence over claims.

**Basic Workflow Order:** brainstorming -> using-git-worktrees -> writing-plans -> subagent-driven-development or executing-plans -> test-driven-development -> requesting-code-review -> finishing-a-development-branch.

## Skill Inventory

| Skill Name | Type | Rigid/Flexible | When to Invoke |
|---|---|---|---|
| using-superpowers | Meta (governs skill invocation) | Rigid | At start of any conversation, before any response |
| brainstorming | Process (design refinement) | Rigid (HARD GATE) | Before ANY creative/implementation work |
| writing-plans | Process (plan creation) | Rigid (No Placeholders) | After approved spec, before touching code |
| executing-plans | Execution (plan execution) | Rigid | When executing a written plan inline |
| test-driven-development | Discipline (RED-GREEN-REFACTOR) | Rigid (Iron Law) | When implementing ANY feature or bugfix |
| systematic-debugging | Discipline (4-phase process) | Rigid (Iron Law) | When encountering ANY bug or unexpected behavior |
| finishing-a-development-branch | Process (completion workflow) | Rigid | When implementation is complete and tests pass |
| dispatching-parallel-agents | Execution (parallel subagents) | Flexible | When 2+ independent tasks can run concurrently |
| subagent-driven-development | Execution (two-stage review) | Rigid | When executing plans with subagents (preferred) |
| requesting-code-review | Collaboration (review dispatch) | Flexible | After tasks/features, before merge to main |
| receiving-code-review | Collaboration (feedback handling) | Rigid | When receiving code review feedback |
| verification-before-completion | Discipline (evidence before claims) | Rigid (Iron Law) | Before claiming any work is complete |
| writing-skills | Meta (skill creation via TDD) | Rigid on process | When creating or editing skills |
| using-git-worktrees | Infrastructure (workspace isolation) | Rigid on detection | Before executing implementation plans |

---

## 1. using-superpowers

**What it does:** The meta-skill that governs how all other skills are discovered and invoked. Mandates checking for applicable skills before any response or action, even if there is only a 1% chance a skill might apply.

**Key rules:**
- If there is even a 1% chance a skill applies, invoke the Skill tool to check it
- Process skills (brainstorming, debugging) take priority over implementation skills
- User instructions (CLAUDE.md, GEMINI.md, AGENTS.md) always override Superpowers skills, which override the default system prompt
- After invoking a skill, announce "Using [skill] to [purpose]"
- If the skill has a checklist, create a TodoWrite task for each checklist item
- Subagents dispatched for a specific task should skip this skill (SUBAGENT-STOP directive)
- Red flags table lists 12 rationalization patterns to watch for (e.g., "This is just a simple question", "Let me explore the codebase first", "The skill is overkill")

---

## 2. brainstorming

**What it does:** Refines rough ideas into fully formed designs and specs through collaborative Socratic dialogue. Asks questions one at a time, proposes 2-3 approaches with trade-offs, presents design in sections for incremental validation, then writes a design document.

**Key rules:**
- HARD GATE: No code, scaffolding, or implementation action until the user has approved the design
- Checklist: (1) Explore project context, (2) Offer visual companion if visual questions ahead (must be its own message), (3) Ask clarifying questions one at a time, (4) Propose 2-3 approaches with recommendation, (5) Present design in sections scaled to complexity, (6) Write design doc to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, (7) Spec self-review (placeholder scan, internal consistency, scope check, ambiguity check), (8) User reviews written spec, (9) Transition by invoking writing-plans skill ONLY
- For overly large projects, decompose into sub-projects first
- Prefer multiple choice questions; only one question per message
- YAGNI ruthlessly — remove unnecessary features from all designs
- Design for isolation and clarity: each unit should have one clear purpose, well-defined interfaces, independently understandable and testable
- Visual companion: offered once as its own standalone message, then used per-question based on whether the user would understand better by seeing vs. reading

---

## 3. writing-plans

**What it does:** Creates comprehensive implementation plans with bite-sized tasks (2-5 minutes each), assuming the implementing engineer has zero codebase context and questionable taste. Every step contains exact file paths, complete code, and verification commands.

**Key rules:**
- Plan header must include: "REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans."
- Each task uses checkbox syntax `- [ ]` for tracking
- Task granularity: "Write the failing test" is one step; "Run it to make sure it fails" is another; "Implement minimal code" is another
- No placeholders: no "TBD", "TODO", "implement later", "add appropriate error handling", "similar to Task N"
- Before defining tasks, map out file structure with clear boundaries and well-defined interfaces
- Files that change together should live together; split by responsibility, not by technical layer
- Self-review: (1) Spec coverage check, (2) Placeholder scan, (3) Type consistency check across tasks
- Save plans to `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- After saving, offer execution choice: Subagent-Driven (recommended) or Inline Execution
- Principles: DRY, YAGNI, TDD, frequent commits, exact file paths always, complete code in every step

---

## 4. executing-plans

**What it does:** Loads a written implementation plan, reviews it critically, executes all tasks following the plan's bite-sized steps exactly, and reports when complete.

**Key rules:**
- Load and review the plan critically; raise concerns before starting
- Execute tasks: mark in_progress, follow each step exactly, run verifications, mark completed
- After all tasks, invoke `superpowers:finishing-a-development-branch`
- STOP immediately when: hit a blocker, plan has critical gaps, instruction unclear, verification fails repeatedly
- Never start implementation on main/master branch without explicit user consent
- Note: subagent-driven-development is strongly recommended over this when subagents are available

---

## 5. test-driven-development

**What it does:** Enforces the RED-GREEN-REFACTOR cycle: write a failing test first, watch it fail, write minimal code to pass, watch it pass, refactor, commit.

**Key rules:**
- Iron Law: "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST"
- Write code before the test? Delete it. Start over. No keeping as "reference", no "adapting", no looking at it
- RED: Write one minimal test showing desired behavior. Clear name, real code (mocks only if unavoidable), one behavior per test
- Verify RED (mandatory): Run test, confirm it fails for the right reason
- GREEN: Write simplest code to pass the test. No extra features, no refactoring
- Verify GREEN (mandatory): Run test, confirm it passes, confirm all other tests still pass
- REFACTOR: Only after green. Remove duplication, improve names, extract helpers. Don't add behavior
- Exceptions (ask human partner): throwaway prototypes, generated code, configuration files
- Debugging integration: bugs found -> write failing test reproducing it -> follow TDD cycle

---

## 6. systematic-debugging

**What it does:** 4-phase root cause investigation process for any bug, test failure, or unexpected behavior. Mandates finding root cause before attempting any fixes.

**Key rules:**
- Iron Law: "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST"
- Phase 1 (Root Cause Investigation): Read error messages carefully, reproduce consistently, check recent changes, gather evidence in multi-component systems, trace data flow backward
- Phase 2 (Pattern Analysis): Find working examples, compare against references completely, identify every difference, understand dependencies
- Phase 3 (Hypothesis and Testing): Form single clear hypothesis, test with smallest possible change (one variable at a time), verify before continuing. If it doesn't work, form a NEW hypothesis
- Phase 4 (Implementation): Create failing test case first (use TDD skill), implement single fix addressing root cause, verify
- If 3+ fixes have failed, STOP and question the architecture

---

## 7. finishing-a-development-branch

**What it does:** Guides completion of development work by verifying tests, detecting workspace environment, presenting structured options, executing the chosen option, and cleaning up.

**Key rules:**
- Verify tests pass before presenting any options
- Detect environment: normal repo, linked worktree (named branch), or detached HEAD
- Normal repo / named-branch worktree: 4 options (merge locally, push+PR, keep as-is, discard)
- Detached HEAD: 3 options (push as new branch+PR, keep, discard)
- Execute chosen option with proper cleanup
- Never: proceed with failing tests, merge without verifying, delete without confirmation, force-push

---

## 8. dispatching-parallel-agents

**What it does:** Dispatches one specialized subagent per independent problem domain to work concurrently.

**Key rules:**
- Identify independent domains: group failures by what's broken; each domain should be independent
- Create focused agent tasks: specific scope, clear goal, constraints, expected output format
- Dispatch in parallel
- Review and integrate: verify fixes don't conflict, run full test suite
- Don't use when: failures are related, need full system state, agents would interfere, shared state

---

## 9. subagent-driven-development

**What it does:** Executes implementation plans by dispatching a fresh subagent per task with a two-stage review after each: spec compliance review first, then code quality review.

**Key rules:**
- Read plan once, extract all tasks with full text
- Per task: dispatch implementer -> spec reviewer -> code quality reviewer
- Model selection: cheapest for mechanical, standard for integration/judgment, most capable for architecture/design/review
- Handle implementer status: DONE (proceed), DONE_WITH_CONCERNS (read concerns), NEEDS_CONTEXT (provide and re-dispatch), BLOCKED (assess and address)
- Continuous execution: do not pause between tasks. Only stop for BLOCKED or all tasks complete
- After all tasks: dispatch final code reviewer, then invoke finishing-a-development-branch
- Never: skip reviews, dispatch multiple implementation subagents in parallel, make subagent read plan file, skip review loops

---

## 10. requesting-code-review

**What it does:** Dispatches a code reviewer subagent to catch issues before they cascade.

**Key rules:**
- Get git SHAs: BASE_SHA (starting commit) and HEAD_SHA (ending commit)
- Dispatch code reviewer subagent using template at `code-reviewer.md`
- Act on feedback: fix Critical immediately, fix Important before proceeding, note Minor for later
- Never: skip review because "it's simple", ignore Critical issues, proceed with unfixed Important issues

---

## 11. receiving-code-review

**What it does:** Governs how to handle code review feedback with technical rigor and verification, not performative agreement or blind implementation.

**Key rules:**
- Response pattern: READ -> UNDERSTAND -> VERIFY -> EVALUATE -> RESPOND -> IMPLEMENT
- Forbidden responses: "You're absolutely right!", "Great point!", "Excellent feedback!", "Let me implement that now" (before verification)
- If any item is unclear, STOP and ask for clarification on ALL unclear items before implementing any
- YAGNI check: if reviewer suggests "implementing properly", grep codebase for actual usage first
- Push back when: suggestion breaks functionality, reviewer lacks context, violates YAGNI, technically incorrect

---

## 12. verification-before-completion

**What it does:** Requires running verification commands and confirming output before making any success claims.

**Key rules:**
- Iron Law: "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE"
- Gate function: IDENTIFY command -> RUN full command -> READ full output -> VERIFY output confirms claim -> ONLY THEN make the claim
- Common failures: "Tests pass" requires test command output with 0 failures; "Build succeeds" requires build command exit 0; "Bug fixed" requires testing the original symptom
- Red flags: using "should/probably/seems to", expressing satisfaction before verification, trusting agent success reports

---

## 13. writing-skills

**What it does:** Guides creation and testing of new Superpowers skills using TDD applied to process documentation.

**Key rules:**
- Iron Law: "NO SKILL WITHOUT A FAILING TEST FIRST"
- RED phase: Run pressure scenarios WITHOUT the skill. Document exact behavior and rationalizations
- GREEN phase: Write minimal skill addressing those specific violations. Run same scenarios WITH skill
- REFACTOR phase: Find new rationalizations, add explicit counters, re-test until bulletproof
- Skill types: Technique (concrete method), Pattern (way of thinking), Reference (API docs)
- SKILL.md structure: YAML frontmatter (name + description, max 1024 chars total), Overview, When to Use, Core Pattern, Quick Reference, Implementation, Common Mistakes
- Claude Search Optimization (CSO): Description must say ONLY when to use ("Use when..."), NOT what it does
- Token efficiency: getting-started skills <150 words, frequently-loaded <200 words, other skills <500 words
- Must STOP and complete the deployment process for EACH skill before moving to the next

---

## 14. using-git-worktrees

**What it does:** Ensures an isolated workspace exists for feature work by detecting existing isolation, preferring native worktree tools, falling back to manual git worktrees.

**Key rules:**
- Step 0: Detect existing isolation. Compare GIT_DIR and GIT_COMMON. If different, already in a worktree — skip creation
- Step 1a (preferred): Use native worktree tools (EnterWorktree, WorktreeCreate) if available
- Step 1b (fallback): Manual git worktree with directory priority: user preference -> .worktrees/ -> worktrees/ -> ~/.config/superpowers/worktrees/
- Step 3: Auto-detect and run project setup (npm install, cargo build, etc.)
- Step 4: Run tests to verify clean baseline
- Never: create a worktree when already isolated, use git worktree when native tool available, skip baseline tests