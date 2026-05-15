# Add Comments to Findings

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to add comments to findings for documentation and collaboration.

---

## Why Comment on Findings

Comments help you:

- Document analysis and triage decisions
- Track remediation progress
- Communicate with team members
- Create an audit trail for compliance
- Tag colleagues for input

---

## Step 1: Open Finding Detail

1. Navigate to **Findings** in the sidebar
2. Click on the finding you want to comment on

---

## Step 2: Scroll to Comments Section

Find the **Comments** section at the bottom of the finding detail page.

---

## Step 3: Add Comment

1. Click in the **Add a comment...** text box
2. Type your comment
3. Use `@username` to tag team members
4. Click **Post Comment**

---

## Comment Formatting

### Markdown Support

Comments support basic Markdown:

```markdown
**Bold text**
*Italic text*
- Bullet points
1. Numbered lists
`inline code`
```

### Code Blocks

Use triple backticks for code:

\`\`\`typescript
const query = `SELECT * FROM users WHERE id = ${id}`;
\`\`\`

### Mentions

Tag team members with `@`:

```
@john.doe Can you review this authentication bypass?
```

The tagged user receives a notification.

---

## Comment Use Cases

### Triage Decision

```
After reviewing the code flow, this is a true positive.
The input validation is client-side only; the server doesn't
sanitize the parameter before using it in the SQL query.

Marking as CONFIRMED and assigning to @backend-team.
```

### Remediation Progress

```
PR created: #342
Fix implements parameterized queries using prepared statements.
Awaiting code review before merge.
```

### Verification

```
Verified the fix in staging. Rescan shows the finding is resolved.
Closing as REMEDIATED.
```

### False Positive Explanation

```
This is a false positive. The `sanitizeInput()` function at line 38
properly escapes all SQL special characters. The AI analysis missed
this because the validation happens in a separate utility module.

Closing as FALSE_POSITIVE.
```

### Risk Acceptance

```
This legacy endpoint is scheduled for deprecation in Q3 2026.
The cost of remediation exceeds the risk given:
- Low traffic (10 requests/day)
- Internal-only access
- Compensating controls (WAF rules)

Approved by security team 2026-05-10.
```

---

## View Comment History

All comments are displayed chronologically:

- Avatar shows who posted
- Timestamp shows when
- Edit indicator if modified

---

## Edit Comments

To edit your own comment:

1. Click the **Edit** (pencil) icon on your comment
2. Modify the text
3. Click **Save**

Edited comments show an "edited" indicator.

---

## Delete Comments

To delete your own comment:

1. Click the **Delete** (trash) icon
2. Confirm deletion

Deleted comments are permanently removed.

---

## Comment Notifications

When you're mentioned (`@username`):

- In-app notification appears
- Email notification (if configured)
- Click notification to navigate to the finding

---

## Comment Best Practices

### Be Specific

**Poor:** "This looks wrong"

**Better:** "The validation at line 25 only checks for empty strings, not SQL injection patterns. An attacker could bypass with: `' OR '1'='1`"

### Link to Related Work

```
Related PR: #342
Jira ticket: SEC-1234
Slack thread: [link]
```

### Use for Handoffs

```
@jane.doe I've confirmed this vulnerability. The fix requires
changes to the auth middleware. Over to you for implementation.
```

### Document Decisions

Every finding should have at least one comment explaining:
- Why it's a true positive (or false positive)
- What action is being taken
- Who is responsible

---

## Troubleshooting

### Cannot Post Comment

**Cause:** Network error or session expired

**Solution:**
1. Refresh the page
2. Sign in again if needed
3. Retry posting

### Mention Not Working

**Cause:** Username typo or user doesn't exist

**Solution:**
1. Check the username spelling
2. Use the autocomplete dropdown
3. Verify user has an Astra account

### Comments Not Loading

**Cause:** Network issue or API error

**Solution:**
1. Refresh the page
2. Check network connectivity
3. Contact admin if persists

---

## See Also

- [Triaging Findings Tutorial](../tutorials/03-triaging-findings.md)
- [Create Task from Finding](./create-task-from-finding.md)
- [View Finding History](./view-finding-history.md)
