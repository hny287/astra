# Create a Config Preset

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to save scan configurations as reusable presets.

---

## What Are Presets?

Presets are named configurations you can apply to new scans:

- Save AI provider settings
- Store severity filters
- Configure ignore patterns
- Reuse across multiple scans

---

## Step 1: Configure a Scan

1. Click **New Scan**
2. Configure all settings:
   - Severity filters
   - Ignore patterns
   - AI providers per node
   - Temperature, thinking depth, etc.

---

## Step 2: Save as Preset

1. Click **Save as Preset** (near the Start Scan button)
2. Enter preset details:
   - **Name:** Short identifier (e.g., "Production Scan")
   - **Description:** Optional details
   - **Visibility:** Built-in (all users) or Custom (your scans only)
3. Click **Save**

---

## Step 3: Apply Preset to New Scan

1. Click **New Scan**
2. Click **Load Preset**
3. Select a preset from the list
4. Configuration is applied automatically
5. Start the scan

---

## Preset Types

### Built-in Presets

Created by admins, available to all users:

| Preset | Description |
|--------|-------------|
| **Quick Scan** | Fast scan with minimal AI usage |
| **Standard Scan** | Balanced cost/accuracy (default) |
| **Deep Scan** | Maximum accuracy, higher cost |
| **Compliance Scan** | Focused on regulatory requirements |

### Custom Presets

Created by any user, visible only to creator:

- Team-specific configurations
- Project-tailored settings
- Personal preferences

---

## Edit Preset

To modify a preset:

1. Navigate to **Settings** → **Presets**
2. Click on the preset
3. Edit configuration
4. Click **Save**

---

## Delete Preset

To remove a preset:

1. Navigate to **Settings** → **Presets**
2. Click on the preset
3. Click **Delete**
4. Confirm

**Note:** Deleting a preset doesn't affect scans that already used it.

---

## Example Preset Configurations

### Quick Scan

```json
{
  "name": "Quick Scan",
  "description": "Fast scan for development iterations",
  "config": {
    "severity": ["CRITICAL", "HIGH"],
    "ignore": ["*.test.ts", "node_modules/**"],
    "nodes": {
      "discover": {
        "provider": "cloud-ollama",
        "model": "llama-3.1-70b",
        "thinkingDepth": "none"
      },
      "deepScan": {
        "provider": "cloud-ollama",
        "model": "llama-3.1-70b",
        "thinkingDepth": "low",
        "concurrency": 10
      },
      "crossFile": {
        "provider": "cloud-ollama",
        "model": "llama-3.1-70b",
        "thinkingDepth": "none"
      }
    }
  }
}
```

### Deep Security Audit

```json
{
  "name": "Deep Security Audit",
  "description": "Comprehensive analysis for production releases",
  "config": {
    "severity": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
    "ignore": ["node_modules/**"],
    "nodes": {
      "discover": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "thinkingDepth": "medium"
      },
      "deepScan": {
        "provider": "anthropic",
        "model": "claude-4-opus",
        "thinkingDepth": "high",
        "concurrency": 3
      },
      "crossFile": {
        "provider": "anthropic",
        "model": "claude-4-opus",
        "thinkingDepth": "max"
      }
    }
  }
}
```

### Compliance Focused

```json
{
  "name": "Compliance Scan",
  "description": "SOC2 / PCI-DSS focused scanning",
  "config": {
    "severity": ["CRITICAL", "HIGH", "MEDIUM"],
    "ignore": [],
    "nodes": {
      "discover": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "thinkingDepth": "low"
      },
      "deepScan": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "thinkingDepth": "medium",
        "focus": ["secrets", "encryption", "access_control"]
      },
      "crossFile": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "thinkingDepth": "high"
      }
    }
  }
}
```

---

## Share Presets

### Export Preset

1. Navigate to **Settings** → **Presets**
2. Click **Export** on the preset
3. Download JSON file
4. Share with team members

### Import Preset

1. Navigate to **Settings** → **Presets**
2. Click **Import Preset**
3. Upload JSON file
4. Review and save

---

## Troubleshooting

### Preset Not Appearing

**Cause:** Preset is custom (not built-in) and created by another user

**Solution:**
1. Only built-in presets are shared
2. Ask admin to make it built-in
3. Or import the preset JSON

### Cannot Create Preset (Permission Denied)

**Cause:** VIEWER role cannot create presets

**Solution:**
1. Request ANALYST or ADMIN role
2. Ask someone with permissions to create it

### Preset Application Fails

**Cause:** Preset references unavailable provider or model

**Solution:**
1. Check provider configuration
2. Verify API keys are valid
3. Update preset with available models

---

## See Also

- [Scan Configuration Reference](../reference/config/scan.md)
- [Configure AI Providers Tutorial](../tutorials/05-provider-config.md)
- [Node Configuration Reference](../reference/config/nodes.md)
