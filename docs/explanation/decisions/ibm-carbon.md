# Why IBM Carbon?

**Last updated:** 2026-05-15 | **Version:** v2.23.0

Rationale for choosing IBM Carbon Design System for the UI.

---

## Requirements

When selecting a design system, Astra needed:

1. **Enterprise Look:** Professional, trustworthy appearance
2. **Accessibility:** WCAG 2.1 AA compliance
3. **Component Library:** Rich set of pre-built components
4. **Dark Mode:** Essential for security operations
5. **TypeScript Support:** Type-safe component APIs
6. **Active Maintenance:** Regular updates, bug fixes
7. **Documentation:** Clear usage examples

---

## Evaluation

Considered design systems:

| System | Enterprise | Accessible | Components | Dark Mode | TypeScript |
|--------|------------|------------|------------|-----------|------------|
| **IBM Carbon** | ✅ | ✅ | ✅ (100+) | ✅ | ✅ |
| Material UI | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| Ant Design | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Chakra UI | ⚠️ | ✅ | ⚠️ | ✅ | ✅ |
| Tailwind UI | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ |
| Fluent UI | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Decision: IBM Carbon

Selected for:

### 1. Enterprise Aesthetic

Carbon's design language conveys:
- Professionalism
- Trustworthiness
- Security-focused

Perfect for a security platform.

### 2. Accessibility

Built-in WCAG 2.1 AA compliance:
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Focus indicators

### 3. Component Coverage

100+ components including:
- DataTable (for findings)
- Forms (for config)
- Modals (for dialogs)
- Toasts (for notifications)
- Tabs (for navigation)
- Trees (for file explorer)

### 4. Dark Mode

Native dark theme support:
- `g10` (light)
- `g90` (dark)
- `g100` (darker)

Security teams prefer dark interfaces.

### 5. IBM Plex Typography

Proprietary font family:
- Clean, modern appearance
- Excellent readability
- Monospace for code

---

## Implementation

### Theme Setup

```typescript
// src/app/globals.css
@import '@carbon/themes/scss/themes';

:root {
  --cds-interactive-1: #0070d1;  // Astra Blue
  --cds-font-family: 'IBM Plex Sans', sans-serif;
}

[data-theme='dark'] {
  --cds-background: #161616;
  --cds-text-primary: #f4f4f4;
}
```

### Component Usage

```typescript
import { Button, DataTable, Modal } from '@carbon/react';

function FindingsTable({ findings }: { findings: Finding[] }) {
  return (
    <DataTable
      rows={findings}
      headers={[
        { key: 'title', header: 'Title' },
        { key: 'severity', header: 'Severity' },
        { key: 'status', header: 'Status' }
      ]}
    />
  );
}
```

---

## Customization

### Branding

Astra customizes Carbon with:

```scss
// Astra Blue instead of IBM Blue
$cds-interactive-1: #0070d1;
$cds-interactive-2: #0064b7;  // Pressed
$cds-interactive-3: #004d8d;  // Active
```

### Radius

Carbon uses 0px radius by default. Astra adds:

```scss
// 8px for cards, 9999px for pills
$cds-radius-01: 8px;
$cds-radius-02: 9999px;
```

---

## Benefits Realized

### 1. Development Speed

Pre-built components accelerated development:

```
DataTable: 2 days (vs 2 weeks from scratch)
Forms: 1 day (vs 1 week)
Navigation: 1 day (vs 3 days)
```

### 2. Consistency

All components follow same design language:
- Spacing
- Typography
- Colors
- Interactions

### 3. Accessibility Compliance

Out-of-box WCAG compliance:
- No manual ARIA attributes needed
- Keyboard navigation works
- Screen readers supported

### 4. Professional Appearance

Users perceive platform as:
- Enterprise-grade
- Secure
- Trustworthy

---

## Trade-offs

### Bundle Size

**Challenge:** Carbon adds ~200KB to bundle

**Mitigation:**
- Tree-shaking removes unused components
- Code-splitting by route
- Lazy loading for heavy components

### Learning Curve

**Challenge:** Team needed to learn Carbon APIs

**Mitigation:**
- Carbon documentation is excellent
- TypeScript provides inline docs
- Examples in Carbon Storybook

### Customization Limits

**Challenge:** Some designs hard to achieve

**Mitigation:**
- Use Carbon as base
- Custom CSS for special cases
- Contribute improvements back to Carbon

---

## Component Usage

### Most Used

| Component | Usage |
|-----------|-------|
| `DataTable` | Findings, Tasks, Scans lists |
| `Form` | Config, Settings, New Scan |
| `Modal` | Dialogs, Confirmations |
| `Toast` | Notifications |
| `Tabs` | Navigation within pages |
| `Breadcrumb` | Page hierarchy |
| `Search` | Filtering |
| `Filter` | Faceted search |

### Least Used

| Component | Reason |
|-----------|--------|
| `DatePicker` | No date-based features |
| `Slider` | Not needed for security UI |
| `TimePicker` | No time-based features |
| `NumberInput` | Rarely needed |

---

## See Also

- [Frontend Architecture](../architecture/frontend.md)
- [Component Reference](../../reference/components/README.md)
- [IBM Carbon Documentation](https://carbondesignsystem.com/)
