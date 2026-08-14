/** GraphQL documents. Kept separate from the client so they are easy to review. */

/**
 * User-level counts + the contribution calendar (last 365 days). One request.
 * `pullRequests`/`issues` totalCount are all-time authored totals; the
 * contribution numbers are for the trailing year window.
 */
export const USER_COUNTS_QUERY = /* GraphQL */ `
  query UserCounts($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      name
      login
      followers { totalCount }
      pullRequests { totalCount }
      issues { totalCount }
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalIssueContributions
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
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
