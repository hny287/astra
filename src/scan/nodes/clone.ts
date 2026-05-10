import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { ScanState } from '../state';
import { log } from '../log';
import { prisma } from '../../lib/db';
import { decrypt } from '../../lib/encryption';
import { TEMP_DIR_PREFIX } from '../../lib/branding';

const execAsync = promisify(exec);

// Inject a PAT into a GitHub HTTPS URL: https://github.com/x/y → https://<token>@github.com/x/y
function injectToken(url: string, token: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = token;
    parsed.password = 'x-oauth-basic';
    return parsed.toString();
  } catch {
    return url;
  }
}

async function resolveCloneUrl(repoUrl: string, userId?: string): Promise<string> {
  if (!userId) return repoUrl;
  const isGitHub = /github\.com/i.test(repoUrl);
  if (!isGitHub) return repoUrl;

  const profile = await prisma.githubProfile.findUnique({ where: { userId } });
  if (!profile?.accessToken) return repoUrl;

  const token = decrypt(profile.accessToken);
  return injectToken(repoUrl, token);
}

export async function cloneNode(state: ScanState): Promise<Partial<ScanState>> {
  const { repoUrl, branch, userId } = state;
  await log(state.scanId, 'info', 'clone', `Cloning ${repoUrl} (branch: ${branch})`);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), TEMP_DIR_PREFIX));

  try {
    const cloneUrl = await resolveCloneUrl(repoUrl, userId);
    const branchFlag = branch && branch !== 'main' ? ` --branch ${branch}` : '';
    await execAsync(`git clone --depth 1${branchFlag} ${cloneUrl} ${tmpDir}`, {
      timeout: 120000,
    });

    const { stdout } = await execAsync('git rev-parse HEAD', {
      cwd: tmpDir,
    });
    const commitSha = stdout.trim();

    await log(state.scanId, 'success', 'clone', `Cloned to ${tmpDir} (commit: ${commitSha.slice(0, 8)})`);

    return {
      localDir: tmpDir,
      commitSha,
      status: 'RUNNING',
    };
  } catch (err) {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}

    const message = err instanceof Error ? err.message : String(err);
    await log(state.scanId, 'error', 'clone', `Clone failed: ${message}`);
    return {
      localDir: '',
      commitSha: '',
      errors: [`Clone failed: ${message}`],
      status: 'FAILED',
    };
  }
}