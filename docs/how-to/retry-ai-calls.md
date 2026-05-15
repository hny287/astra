# Retry Failed AI Calls

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to re-execute failed AI calls from the Observability UI.

---

## When to Retry AI Calls

Common scenarios:

- Provider API returned a transient error
- Network timeout during AI request
- Rate limit temporarily exceeded
- Provider had a brief outage

---

## Step 1: Navigate to AI Calls

1. Click **Observability** in the sidebar
2. Click **AI Calls**

---

## Step 2: Filter for Failed Calls

1. Click the **Status** filter
2. Select **ERROR**, **TIMEOUT**, or **RATE_LIMITED**
3. Optionally filter by scan, provider, or date range

---

## Step 3: Review Failed Call

Click on a failed call to see details:

- **Request:** Full prompt sent to AI
- **Response:** Error message from provider
- **Error:** Specific failure reason
- **Latency:** How long before it failed
- **Tokens:** Token budget that was attempted

---

## Step 4: Retry the Call

Click the **Retry** button.

The AI call is re-executed with:
- Same provider and model
- Same prompt and parameters
- Fresh API request

---

## What Happens Next

### If Retry Succeeds

- Status updates to **SUCCESS**
- Response is saved
- Downstream stages continue
- Token usage is recorded

### If Retry Fails

- Status remains **ERROR**
- Retry count increments
- You can retry again or investigate
- After 3 failures, manual intervention may be needed

---

## Retry Best Practices

### Check Error Type First

**Transient errors** (retry immediately):
- Network timeout
- 503 Service Unavailable
- 429 Rate Limited (with backoff)

**Persistent errors** (investigate first):
- 401 Unauthorized (check API key)
- 404 Not Found (check model name)
- 400 Bad Request (check prompt format)

### Apply Backoff for Rate Limits

If rate limited:
1. Wait 30–60 seconds
2. Retry
3. If still rate limited, wait longer
4. Consider switching providers

### Monitor Token Usage

Each retry consumes tokens:
- Failed calls may still be billed
- Multiple retries add up
- Set token budgets appropriately

---

## Bulk Retry

To retry multiple failed calls:

1. Select multiple calls (checkboxes)
2. Click **Bulk Retry**
3. Confirm the action

All selected calls are retried in parallel.

---

## Retry from Scan View

You can also retry AI calls from the scan detail:

1. Navigate to **Scans** → Select scan
2. Click the **Pipeline** tab
3. Find the stage with failed AI calls
4. Click **View AI Calls**
5. Retry from there

---

## Retry from Node Re-run

Re-running a node automatically retries all its AI calls:

1. Navigate to the scan
2. Click **Pipeline** tab
3. Click **Re-run Node** for the affected stage
4. All AI calls in that stage are re-executed

---

## Preventing Future Failures

### Configure Retries

Set automatic retries in node configuration:

```json
{
  "deepScan": {
    "maxRetries": 3,
    "retryBackoffMs": 2000
  }
}
```

### Use Multiple Providers

Configure fallback providers:
- Primary: Anthropic
- Fallback: OpenAI
- Emergency: Cloud Ollama

### Adjust Timeouts

Increase timeout for slow providers:

```json
{
  "crossFile": {
    "timeoutMs": 300000
  }
}
```

---

## Troubleshooting

### Retry Button Disabled

**Cause:** Call is not in a failed state

**Solution:**
1. Check the status (only ERROR, TIMEOUT, RATE_LIMITED can retry)
2. SUCCESS calls cannot be retried (use re-run node instead)

### Retry Fails Immediately

**Cause:** Persistent error (not transient)

**Solution:**
1. Review the error message
2. Check API key validity
3. Verify model name is correct
4. Contact provider support if needed

### Retry Hangs Indefinitely

**Cause:** Provider not responding

**Solution:**
1. Cancel the retry (if possible)
2. Switch to a different provider
3. Check provider status page

---

## See Also

- [AI Chat Tutorial](../tutorials/04-ai-chat.md)
- [Configure Provider per Node](./configure-provider-per-node.md)
- [AI Call Statistics](../reference/api/ai-calls.md)
