'use client';

import { useState, useEffect } from 'react';
import TaskDataTable from '@/components/TaskDataTable';

export default function TasksPage() {
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    fetch('/api/v1/tasks?status=OPEN&limit=1')
      .then(r => r.json())
      .then(data => setOpenCount(data.total ?? 0))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.25, color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Sans', sans-serif", margin: 0 }}>
            Tasks
          </h1>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', marginTop: 4 }}>
            {openCount} open task{openCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <TaskDataTable />
    </div>
  );
}