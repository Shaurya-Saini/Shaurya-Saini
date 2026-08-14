/** GraphQL documents. Kept separate from the client so they are easy to review. */

/**
 * User-level counts + the contribution calendar. One request.
 * `pullRequests`/`issues` totalCount are all-time authored totals; the
 * contribution numbers are for the trailing year.
 *
 * NOTE: `contributionsCollection` is intentionally called with NO from/to.
 * The default window is the trailing 365 days — exactly what the GitHub profile
 * graph shows. Passing an explicit range that crosses a calendar-year boundary
 * makes GitHub truncate the calendar to a single year (e.g. only 2026), which
 * silently undercounts. Omitting the range avoids that entirely.
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
