/**
 * Minimal repository reference.
 *
 * This is intentionally small and serializable. It represents only the identity of a repository,
 * not its URL, branch, or host.
 */
export interface RepoRef {
    /**
     * Repository owner, organization, or namespace.
     */
    user: string;

    /**
     * Repository name.
     */
    repo: string;
}
