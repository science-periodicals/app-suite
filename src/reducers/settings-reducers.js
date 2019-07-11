import { getId, arrayify } from '@scipe/jsonld';
import {
  FETCH_SETTINGS_JOURNAL_LIST,
  FETCH_SETTINGS_JOURNAL_LIST_SUCCESS,
  FETCH_SETTINGS_JOURNAL_LIST_ERROR,
  FETCH_SETTINGS_ORGANIZATION_LIST,
  FETCH_SETTINGS_ORGANIZATION_LIST_SUCCESS,
  FETCH_SETTINGS_ORGANIZATION_LIST_ERROR,
  SEARCH_SETTINGS_ARTICLE_LIST,
  SEARCH_SETTINGS_ARTICLE_LIST_SUCCESS,
  SEARCH_SETTINGS_ARTICLE_LIST_ERROR,
  SEARCH_SETTINGS_ISSUE_LIST,
  SEARCH_SETTINGS_ISSUE_LIST_SUCCESS,
  SEARCH_SETTINGS_ISSUE_LIST_ERROR,
  SEARCH_SETTINGS_RFA_LIST,
  SEARCH_SETTINGS_RFA_LIST_SUCCESS,
  SEARCH_SETTINGS_RFA_LIST_ERROR
} from '../actions/settings-action-creators';

import {
  CREATE_ISSUE_SUCCESS,
  DELETE_ISSUE,
  DELETE_ISSUE_SUCCESS
} from '../actions/issue-action-creators';
import {
  CREATE_RFA_SUCCESS,
  DELETE_RFA,
  DELETE_RFA_SUCCESS
} from '../actions/rfa-action-creators';

export function settingsJournalList(
  state = { status: 'active', xhr: null, error: null, journalIds: [] },
  action
) {
  switch (action.type) {
    case FETCH_SETTINGS_JOURNAL_LIST:
      return Object.assign({}, state, {
        status: 'active',
        error: null,
        xhr: action.payload
      });

    case FETCH_SETTINGS_JOURNAL_LIST_SUCCESS: {
      const mainEntity = action.payload.mainEntity || action.payload;
      return {
        status: 'success',
        error: null,
        xhr: null,
        journalIds: arrayify(mainEntity.itemListElement).map(itemListElement =>
          getId(itemListElement.item)
        )
      };
    }

    case FETCH_SETTINGS_JOURNAL_LIST_ERROR:
      return Object.assign({}, state, {
        status: 'error',
        error: action.error,
        xhr: null
      });

    default:
      return state;
  }
}

export function settingsOrganizationList(
  state = { status: 'active', xhr: null, error: null, organizationIds: [] },
  action
) {
  switch (action.type) {
    case FETCH_SETTINGS_ORGANIZATION_LIST:
      return Object.assign({}, state, {
        status: 'active',
        error: null,
        xhr: action.payload
      });

    case FETCH_SETTINGS_ORGANIZATION_LIST_SUCCESS: {
      const mainEntity = action.payload.mainEntity || action.payload;
      return {
        status: 'success',
        error: null,
        xhr: null,
        organizationIds: arrayify(mainEntity.itemListElement).map(
          itemListElement => getId(itemListElement.item)
        )
      };
    }

    case FETCH_SETTINGS_ORGANIZATION_LIST_ERROR:
      return Object.assign({}, state, {
        status: 'error',
        error: action.error,
        xhr: null
      });

    default:
      return state;
  }
}

export function settingsArticleList(
  state = {
    active: false,
    graphIds: [],
    error: null,
    xhr: null,
    nextUrl: null,
    numberOfItems: 0
  },
  action
) {
  switch (action.type) {
    case SEARCH_SETTINGS_ARTICLE_LIST:
      return {
        active: true,
        graphIds: action.meta.reset ? [] : state.graphIds,
        error: null,
        xhr: action.payload,
        nextUrl: null,
        numberOfItems: action.meta.reset ? 0 : state.numberOfItems
      };

    case SEARCH_SETTINGS_ARTICLE_LIST_SUCCESS: {
      const mainEntity = action.payload.mainEntity || action.payload;
      const lastItemListElement =
        mainEntity.itemListElement[mainEntity.itemListElement.length - 1];

      const newGraphIds = mainEntity.itemListElement
        .map(listItem => getId(listItem.item))
        .filter(Boolean);

      const nextGraphIds = action.meta.append
        ? state.graphIds.concat(
            newGraphIds.filter(id => !state.graphIds.includes(id))
          )
        : newGraphIds;

      const nextItem = lastItemListElement && lastItemListElement.nextItem;
      const nextUrl =
        nextItem && nextGraphIds.length < mainEntity.numberOfItems
          ? nextItem
          : null;

      return {
        active: false,
        graphIds: action.meta.append
          ? state.graphIds.concat(
              nextGraphIds.filter(id => !state.graphIds.includes(id))
            )
          : nextGraphIds,
        error: null,
        xhr: null,
        nextUrl,
        numberOfItems: mainEntity.numberOfItems
      };
    }

    case SEARCH_SETTINGS_ARTICLE_LIST_ERROR:
      return {
        active: false,
        error: action.error,
        xhr: null,
        nextUrl: null,
        numberOfItems: state.numberOfItems
      };

    default:
      return state;
  }
}

export function settingsIssueList(
  state = {
    active: false,
    issueIds: [],
    error: null,
    xhr: null,
    nextUrl: null,
    numberOfItems: 0
  },
  action
) {
  switch (action.type) {
    case SEARCH_SETTINGS_ISSUE_LIST:
      return {
        active: true,
        issueIds: action.meta.reset ? [] : state.issueIds,
        error: null,
        xhr: action.payload,
        nextUrl: null,
        numberOfItems: action.meta.reset ? 0 : state.numberOfItems
      };

    case SEARCH_SETTINGS_ISSUE_LIST_SUCCESS: {
      const mainEntity = action.payload.mainEntity || action.payload;

      const lastItemListElement =
        mainEntity.itemListElement[mainEntity.itemListElement.length - 1];

      const newIssueIds = mainEntity.itemListElement
        .map(listItem => getId(listItem.item))
        .filter(Boolean);

      const nextIssueIds = action.meta.append
        ? state.issueIds.concat(
            newIssueIds.filter(id => !state.issueIds.includes(id))
          )
        : newIssueIds;

      const nextItem = lastItemListElement && lastItemListElement.nextItem;
      const nextUrl =
        nextItem && nextIssueIds.length < mainEntity.numberOfItems
          ? nextItem
          : null;

      return {
        active: false,
        issueIds: nextIssueIds,
        error: null,
        xhr: null,
        nextUrl,
        numberOfItems: mainEntity.numberOfItems
      };
    }

    case SEARCH_SETTINGS_ISSUE_LIST_ERROR:
      return {
        active: false,
        error: action.error,
        xhr: null,
        nextUrl: null,
        numberOfItems: state.numberOfItems
      };

    case CREATE_ISSUE_SUCCESS: {
      // kind of a hack so that the newly created items are first
      const {
        payload: { result: issue }
      } = action;
      return Object.assign({}, state, {
        issueIds: [getId(issue)].concat(state.issueIds)
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

export function settingsRfaList(
  state = {
    active: false,
    rfaIds: [],
    error: null,
    xhr: null,
    nextUrl: null,
    numberOfItems: 0
  },
  action
) {
  switch (action.type) {
    case SEARCH_SETTINGS_RFA_LIST:
      return {
        active: true,
        rfaIds: action.meta.reset ? [] : state.rfaIds,
        error: null,
        xhr: action.payload,
        nextUrl: null,
        numberOfItems: action.meta.reset ? 0 : state.numberOfItems
      };

    case SEARCH_SETTINGS_RFA_LIST_SUCCESS: {
      const mainEntity = action.payload.mainEntity || action.payload;

      const lastItemListElement =
        mainEntity.itemListElement[mainEntity.itemListElement.length - 1];

      const newRfaIds = mainEntity.itemListElement
        .map(listItem => getId(listItem.item))
        .filter(Boolean);

      const nextRfaIds = action.meta.append
        ? state.rfaIds.concat(
            newRfaIds.filter(id => !state.rfaIds.includes(id))
          )
        : newRfaIds;

      const nextItem = lastItemListElement && lastItemListElement.nextItem;
      const nextUrl =
        nextItem && nextRfaIds.length < mainEntity.numberOfItems
          ? nextItem
          : null;

      return {
        active: false,
        rfaIds: nextRfaIds,
        error: null,
        xhr: null,
        nextUrl,
        numberOfItems: mainEntity.numberOfItems
      };
    }

    case SEARCH_SETTINGS_RFA_LIST_ERROR:
      return {
        active: false,
        error: action.error,
        xhr: null,
        nextUrl: null,
        numberOfItems: state.numberOfItems
      };

    case CREATE_RFA_SUCCESS: {
      const { payload: rfa } = action;
      return Object.assign({}, state, {
        rfaIds: [getId(rfa)].concat(state.rfaIds),
        numberOfItems: state.numberOfItems + 1
      });
    }

    case DELETE_RFA:
    case DELETE_RFA_SUCCESS: {
      const {
        meta: { rfaId }
      } = action;

      if (arrayify(state.rfaIds).filter(_rfaId => _rfaId === rfaId)) {
        return Object.assign({}, state, {
          rfaIds: arrayify(state.rfaIds).filter(_rfaId => _rfaId !== rfaId),
          numberOfItems: state.numberOfItems - 1
        });
      }
      return state;
    }

    default:
      return state;
  }
}
