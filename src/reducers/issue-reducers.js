import { getId, arrayify } from '@scipe/jsonld';
import {
  SEARCH_ISSUES,
  SEARCH_ISSUES_SUCCESS,
  SEARCH_ISSUES_ERROR,
  CREATE_ISSUE,
  CREATE_ISSUE_SUCCESS,
  CREATE_ISSUE_ERROR,
  UPDATE_ISSUE,
  UPDATE_ISSUE_SUCCESS,
  UPDATE_ISSUE_ERROR,
  DELETE_ISSUE,
  DELETE_ISSUE_SUCCESS,
  DELETE_ISSUE_ERROR
} from '../actions/issue-action-creators';

// Note: issues are stored in `droplets` (see droplets reducer)

export function issueSearchResults(
  state = {
    loadingFacets: {},
    issueIds: [],
    active: true,
    error: null,
    nextUrl: null,
    xhr: null
  },
  action
) {
  switch (action.type) {
    case SEARCH_ISSUES: {
      const { reset, loadingFacets } = action.meta;
      return Object.assign(
        {},
        state,
        {
          active: true,
          error: null,
          xhr: action.payload,
          loadingFacets
        },
        reset ? { issueIds: [] } : undefined
      );
    }

    case SEARCH_ISSUES_SUCCESS: {
      const {
        meta: { periodicalId, append }
      } = action;

      const mainEntity = action.payload.mainEntity || action.payload;
      const lastItemListElement =
        mainEntity.itemListElement[mainEntity.itemListElement.length - 1];
      const nextUrl = lastItemListElement ? lastItemListElement.nextItem : null;
      const nextIssueIds = mainEntity.itemListElement.map(itemListElement =>
        getId(itemListElement.item)
      );
      const issueIds = arrayify(state[periodicalId]).issueIds;

      return {
        loadingFacets: {},
        active: false,
        issueIds: append
          ? issueIds.concat(nextIssueIds.filter(id => !issueIds.includes(id)))
          : nextIssueIds,
        error: null,
        xhr: null,
        nextUrl
      };
    }

    case SEARCH_ISSUES_ERROR: {
      return Object.assign({}, state, {
        active: false,
        loadingFacets: {},
        error: action.error,
        xhr: null
      });
    }

    case CREATE_ISSUE_SUCCESS: {
      // kind of a hack so that the newly created items are first
      const {
        payload: { result: issue }
      } = action;
      return Object.assign({}, state, {
        issueIds: [getId(issue)].concat(arrayify(state.issueIds))
      });
    }

    case DELETE_ISSUE:
    case DELETE_ISSUE_SUCCESS: {
      // kind of a hack so that the deleted items are removed from list
      const {
        meta: { issueId }
      } = action;

      return Object.assign({}, state, {
        issueIds: arrayify(state.issueIds).filter(
          _issueId => _issueId !== issueId
        )
      });
    }

    default:
      return state;
  }
}

// Note: this could live in the settings reducer..
/**
 * only track `active` state at the periodicalId level
 * This is OK as we don't allow concurrency for the CRUD operations
 */
export function issueCrudStatusByPeriodicalId(state = {}, action) {
  switch (action.type) {
    case CREATE_ISSUE:
    case UPDATE_ISSUE:
    case DELETE_ISSUE: {
      const {
        meta: { periodicalId }
      } = action;
      return Object.assign(
        {},
        { [periodicalId]: { active: true, error: null } }
      );
    }

    case CREATE_ISSUE_SUCCESS:
    case UPDATE_ISSUE_SUCCESS:
    case DELETE_ISSUE_SUCCESS: {
      const {
        meta: { periodicalId }
      } = action;
      return Object.assign(
        {},
        { [periodicalId]: { active: false, error: null } }
      );
    }

    case CREATE_ISSUE_ERROR:
    case UPDATE_ISSUE_ERROR:
    case DELETE_ISSUE_ERROR: {
      const {
        meta: { periodicalId }
      } = action;
      return Object.assign(
        {},
        { [periodicalId]: { active: false, error: action.error } }
      );
    }

    default:
      return state;
  }
}

export function issueFacetMap(state = {}, action) {
  switch (action.type) {
    case SEARCH_ISSUES_SUCCESS: {
      const mainEntity = action.payload.mainEntity || action.payload;
      return arrayify(mainEntity.itemListFacet).reduce((state, facet) => {
        if (!(facet.name in state)) {
          state[facet.name] = {};
        }
        if (facet.count) {
          state[facet.name] = facet.count.reduce((state, count) => {
            if (count.propertyId !== 'tmp:null') {
              state[count.propertyId] = count;
            }
            return state;
          }, {});
        } else {
          state[facet.name] = {};
        }
        return state;
      }, {});
    }
    default:
      return state;
  }
}
