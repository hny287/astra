import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DOCS_ROOT = path.join(process.cwd(), 'docs');
const TODO_PATH = path.join(process.cwd(), 'TODO.md');
const SPECS_DIR = path.join(process.cwd(), 'docs/superpowers/specs');
const PLANS_DIR = path.join(process.cwd(), 'docs/superpowers/plans');
const HOW_TO_DIR = path.join(process.cwd(), 'docs/how-to');

interface DocEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DocEntry[];
}

async function scanDir(dir: string, prefix = ''): Promise<DocEntry[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const result: DocEntry[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      const children = await scanDir(fullPath, relPath);
      if (children.length > 0) {
        result.push({ name: entry.name, path: relPath, type: 'directory', children });
      }
    } else if (entry.name.endsWith('.md')) {
      result.push({ name: entry.name.replace(/\.md$/, ''), path: relPath, type: 'file' });
    }
  }
  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section');
  const filePath = searchParams.get('path');

  // Map section to its filesystem root for path resolution
  const sectionRoots: Record<string, string> = {
    docs: DOCS_ROOT,
    specs: SPECS_DIR,
    plans: PLANS_DIR,
    'how-to': HOW_TO_DIR,
  };

  // Serve a specific file's content
  if (filePath) {
    const root = (section && sectionRoots[section]) || DOCS_ROOT;
    const resolved = path.join(root, filePath);
    // Prevent path traversal
    if (!resolved.startsWith(process.cwd())) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    try {
      const content = await fs.readFile(resolved, 'utf-8');
      return NextResponse.json({ content, path: filePath });
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  }

  switch (section) {
    case 'roadmap': {
      try {
        const content = await fs.readFile(TODO_PATH, 'utf-8');
        return NextResponse.json({ content, format: 'markdown' });
      } catch {
        return NextResponse.json({ content: '# Roadmap\n\nNot found.', format: 'markdown' });
      }
    }
    case 'docs': {
      const tree = await scanDir(DOCS_ROOT);
      return NextResponse.json({ tree });
    }
    case 'specs': {
      const files = await scanDir(SPECS_DIR);
      return NextResponse.json({ tree: files });
    }
    case 'plans': {
      const files = await scanDir(PLANS_DIR);
      return NextResponse.json({ tree: files });
    }
    case 'how-to': {
      const files = await scanDir(HOW_TO_DIR);
      return NextResponse.json({ tree: files });
    }
    default:
      return NextResponse.json({ error: 'Unknown section. Use: roadmap, docs, specs, plans, how-to' }, { status: 400 });
  }
}