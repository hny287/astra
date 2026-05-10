export async function getGithubRepos(accessToken: string): Promise<{ id: number; name: string; full_name: string; description: string | null; private: boolean; default_branch: string }[]> {
  const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&type=owner', {
    headers: { Authorization: `token ${accessToken}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) throw new Error('Failed to fetch repos');
  return res.json();
}

export async function getGithubBranches(accessToken: string, owner: string, repo: string): Promise<{ name: string; default: boolean }[]> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, {
    headers: { Authorization: `token ${accessToken}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) throw new Error('Failed to fetch branches');
  return res.json();
}