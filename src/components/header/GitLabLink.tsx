export interface GitLabLinkProps {
  username: string;
  repo: string;
}

export default function GitLabLink({ username, repo }: GitLabLinkProps) {
  return (
    <a href={`https://gitlab.com/${username}/${repo}`} class="...">
      {/* GitLab logo */}
    </a>
  );
}
