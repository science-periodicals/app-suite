import moment from 'moment';
import querystring from 'querystring';
import { getId, unprefix, arrayify } from '@scipe/jsonld';
import { xhr, getRootPartId, createId } from '@scipe/librarian';
import { upload } from './encoding-action-creators';
import { ISSUE_FACETS } from '../constants';
import { getIssueQuery, getLoadingFacets } from '../utils/search';

export const SEARCH_ISSUES = 'SEARCH_ISSUES';
export const SEARCH_ISSUES_SUCCESS = 'SEARCH_ISSUES_SUCCESS';
export const SEARCH_ISSUES_ERROR = 'SEARCH_ISSUES_ERROR';

export function searchIssues(
  journal,
  { nextUrl, reset, query = {}, nextQuery, history } = {}
) {
  return (dispatch, getState) => {
    const { issueSearchResults, issueFacetMap } = getState();

    // cancel previous xhr (if any)
    if (issueSearchResults && issueSearchResults.xhr) {
      issueSearchResults.xhr.abort();
    }

    let url;
    if (nextUrl) {
      url = nextUrl;
    } else {
      // facets
      const counts = JSON.stringify(['@type']);

      // every year since the creation of the journal
      // or, if journal is less that 1 year old every month since creation
      let ranges;

      const startYear = moment(journal.dateCreated).year();
      const endYear = moment().year();
      if (endYear !== startYear) {
        const years = Array.from(
          { length: endYear - startYear + 1 },
          (_, i) => {
            return startYear + i;
          }
        );

        ranges = JSON.stringify({
          datePublished: years.reduce((obj, year) => {
            obj[year.toString()] = `[${new Date(
              `${year.toString()}-01-01`
            ).getTime()} TO ${new Date(
              `${(year + 1).toString()}-01-01`
            ).getTime()}}`; // Note: inclusive start (`[`) and exclusive end (`}`)

            return obj;
          }, {})
        });
      } else {
        // journal is less that 1 year old
        const startMonth = moment(journal.dateCreated).month();
        const now = moment();
        const dates = Array.from({ length: 12 }, (_, i) => {
          return moment(journal.dateCreated)
            .month(startMonth + i)
            .startOf('month');
        }).filter(date => date.isSameOrBefore(now));

        ranges = JSON.stringify({
          datePublished: dates.reduce((obj, date) => {
            obj[
              date.format('MMMM Y')
            ] = `[${date.toDate().getTime()} TO ${moment(date)
              .month(moment(date).month() + 1)
              .toDate()
              .getTime()}]`;

            return obj;
          }, {})
        });
      }

      const qs = {
        sort: JSON.stringify('-dateCreated'),
        includeDocs: true,
        hydrate: JSON.stringify(['hasPart']),
        nodes: true,
        counts,
        ranges,
        potentialActions: false,
        query: getIssueQuery(
          journal,
          nextQuery || query,
          issueFacetMap,
          ISSUE_FACETS
        ),
        limit: 10
      };

      url = `/issue?${querystring.stringify(qs)}`;
    }

    // compute loadingFacets and transition route if needed
    let loadingFacets;
    if (nextQuery) {
      loadingFacets = getLoadingFacets(ISSUE_FACETS, query, nextQuery);

      history.push({
        path: '/',
        search: `?${querystring.stringify(nextQuery)}`
      });
    } else {
      loadingFacets = {};
    }

    const r = xhr({
      url,
      method: 'GET',
      json: true
    });

    dispatch({
      type: SEARCH_ISSUES,
      payload: r.xhr,
      meta: { periodicalId: getId(journal), reset, loadingFacets }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: SEARCH_ISSUES_SUCCESS,
          payload: body,
          meta: {
            periodicalId: getId(journal),
            append: !!nextUrl,
            loadingFacets
          }
        });
      })
      .catch(err => {
        dispatch({
          type: SEARCH_ISSUES_ERROR,
          error: err,
          meta: { periodicalId: getId(journal), loadingFacets }
        });
        throw err;
      });
  };
}

export const CREATE_ISSUE = 'CREATE_ISSUE';
export const CREATE_ISSUE_SUCCESS = 'CREATE_ISSUE_SUCCESS';
export const CREATE_ISSUE_ERROR = 'CREATE_ISSUE_ERROR';

export function createIssue(periodicalId, issue) {
  return (dispatch, getState) => {
    const { user } = getState();

    const action = {
      '@type': `Create${issue['@type']}Action`,
      agent: getId(user),
      actionStatus: 'CompletedActionStatus',
      object: periodicalId,
      result: issue
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: action
    });

    dispatch({
      type: CREATE_ISSUE,
      payload: action,
      meta: { periodicalId }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: CREATE_ISSUE_SUCCESS,
          payload: body,
          meta: { periodicalId }
        });
      })
      .catch(err => {
        dispatch({
          type: CREATE_ISSUE_ERROR,
          error: err,
          meta: { periodicalId }
        });
        throw err;
      });
  };
}

export const UPDATE_ISSUE = 'UPDATE_ISSUE';
export const UPDATE_ISSUE_SUCCESS = 'UPDATE_ISSUE_SUCCESS';
export const UPDATE_ISSUE_ERROR = 'UPDATE_ISSUE_ERROR';

export function updateIssue(issue, updatePayload) {
  const periodicalId = getRootPartId(issue);
  const issueId = getId(issue);

  return (dispatch, getState) => {
    const { user } = getState();

    const action = {
      '@type': 'UpdateAction',
      agent: getId(user),
      startTime: new Date().toISOString(),
      actionStatus: 'CompletedActionStatus',
      object: updatePayload,
      targetCollection: issueId
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: action
    });

    dispatch({
      type: UPDATE_ISSUE,
      payload: action,
      meta: { periodicalId, issueId }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: UPDATE_ISSUE_SUCCESS,
          payload: body,
          meta: { periodicalId, issueId }
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_ISSUE_ERROR,
          error: err,
          meta: { periodicalId, issueId }
        });
        throw err;
      });
  };
}

export const UPDATE_ISSUE_BANNER = 'UPDATE_ISSUE_BANNER';
export const UPDATE_ISSUE_BANNER_SUCCESS = 'UPDATE_ISSUE_BANNER_SUCCESS';
export const UPDATE_ISSUE_BANNER_ERROR = 'UPDATE_ISSUE_BANNER_ERROR';

/**
 * If a new style needs to be created, `style` will not have an @id
 */
export function updateIssueBanner(issue, style, file) {
  const issueId = getId(issue);
  const periodicalId = getRootPartId(issue);

  return (dispatch, getState) => {
    const { user } = getState();

    dispatch({
      type: UPDATE_ISSUE_BANNER,
      meta: { periodicalId, issueId }
    });

    style =
      arrayify(issue.style).find(_style => _style.name === style.name) || style;

    // Promise that resolve to the style to update (it takes care of creating that style if it doesn't exists yet)
    const pStyle = Promise.resolve().then(() => {
      if (getId(style)) {
        return style;
      }

      // no @id => we need to add the style to the journal before uploading the banner
      style = Object.assign({ '@type': 'CssVariable' }, style);

      return xhr({
        url: '/action',
        method: 'POST',
        json: true,
        body: {
          '@type': 'UpdateAction',
          agent: getId(user),
          actionStatus: 'CompletedActionStatus',
          object: {
            style: arrayify(issue.style).concat(style)
          },
          targetCollection: issueId
        }
      }).then(({ body: updateAction }) => {
        const updatedStyle = arrayify(updateAction.result.style).find(
          _style => _style.name === style.name
        );

        return updatedStyle;
      });
    });

    return pStyle
      .then(style => {
        // The changes feed will pickup the updated issue document when the
        // worker applies it.
        return dispatch(upload(file, issueId, getId(style), { update: true }));
      })
      .then(uploadAction => {
        dispatch({
          type: UPDATE_ISSUE_BANNER_SUCCESS,
          meta: { periodicalId, issueId },
          payload: uploadAction
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_ISSUE_BANNER_ERROR,
          error: err,
          meta: { periodicalId, issueId }
        });
      });
  };
}

export const DELETE_ISSUE = 'DELETE_ISSUE';
export const DELETE_ISSUE_SUCCESS = 'DELETE_ISSUE_SUCCESS';
export const DELETE_ISSUE_ERROR = 'DELETE_ISSUE_ERROR';

export function deleteIssue(periodicalId, issueId) {
  return (dispatch, getState) => {
    const r = xhr({
      url: `/issue/${unprefix(issueId)}`,
      method: 'DELETE',
      json: true
    });

    dispatch({
      type: DELETE_ISSUE,
      payload: issueId,
      meta: { periodicalId, issueId }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: DELETE_ISSUE_SUCCESS,
          payload: body,
          meta: { periodicalId, issueId }
        });
      })
      .catch(err => {
        dispatch({
          type: DELETE_ISSUE_ERROR,
          error: err,
          meta: { periodicalId, issueId }
        });
        throw err;
      });
  };
}
