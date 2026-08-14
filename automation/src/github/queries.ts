/** GraphQL documents. Kept separate from the client so they are easy to review. */

/**
 * User-level counts. One request.
 * `pullRequests`/`issues` totalCount are all-time authored totals; the
 * `contributionsCollection` commit/review counts are the trailing-year signals
 * feeding the rank grade only.
 *
 * NOTE: the contribution *total* and per-day calendar are deliberately NOT taken
 * from here — the GraphQL API only exposes PUBLIC contributions day-by-day, which
 * undercounts anyone with private/org activity. Those come from the profile
 * fragment instead; see github/contributions.ts. `contributionsCollection` is
 * called with no from/to so its commit count uses the default trailing-year window.
 */
export const USER_COUNTS_QUERY = /* GraphQL */ `
  query UserCounts($login: String!) {
    user(login: $login) {
      name
      login
      followers { totalCount }
      pullRequests { totalCount }
      issues { totalCount }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestReviewContributions
      }
    }
  }
`;

/**
 * Owned repositories, paginated. Includes fork/archived flags so the caller can
 * filter per config, plus per-repo language byte sizes for the languages card.
 */
export const REPOSITORIES_QUERY = /* GraphQL */ `
  query Repositories($login: String!, $cursor: String) {
    user(login: $login) {
      repositories(
        ownerAffiliations: OWNER
        first: 100
        after: $cursor
        orderBy: { field: STARGAZERS, direction: DESC }
      ) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          isFork
          isArchived
          stargazerCount
          forkCount
          languages(first: 15, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }
    }
  }
`;
