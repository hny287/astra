'use client';

import ProfileSettingsClient from './ProfileSettingsClient';

export default function ProfileSettingsPage() {
  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="ibm-headline" style={{ color: 'var(--ibm-ink)', marginBottom: 32 }}>Profile</h1>
      <ProfileSettingsClient />
    </div>
  );
}