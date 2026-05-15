export async function getGithubRepos(accessToken: string): Promise<{ id: number; name: string; full_name: string; description: string | null; private: boolean; default_branch: string }[]> {
  const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&type=owner', {
    headers: { Authorization: `token ${accessToken}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) throw new Error('Failed to fetch repos');
  return res.json();
}

async function fetchAllPages<T>(url: string, headers: HeadersInit, perPage = 100): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const separator = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${separator}per_page=${perPage}&page=${page}`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch page ${page}: ${res.status}`);
    const data: T[] = await res.json();
    all.push(...data);
    // GitHub uses Link header for pagination; if no Link rel="next", we're done
    const link = res.headers.get('link');
    hasMore = !!(link && link.includes('rel="next"'));
    page++;
    // Safety limit: don't fetch more than 500 pages (50,000 branches)
    if (page > 500) break;
  }

  return all;
}

export async function getGithubBranches(accessToken: string, owner: string, repo: string): Promise<{ name: string; default: boolean }[]> {
  const headers: HeadersInit = { Authorization: `token ${accessToken}`, Accept: 'application/vnd.github.v3+json' };

  // Get the default branch name from the repo info
  let defaultBranch = 'main';
  try {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (repoRes.ok) {
      const repoData = await repoRes.json();
      defaultBranch = repoData.default_branch || 'main';
    }
  } catch { /* non-critical */ }

  const branches = await fetchAllPages<{ name: string; commit: { sha: string }; protected: boolean }>(
    `https://api.github.com/repos/${owner}/${repo}/branches`,
    headers,
    100,
  );

  return branches.map(b => ({
    name: b.name,
    default: b.name === defaultBranch,
  }));
}