import { getId, arrayify } from '@scipe/jsonld';
import {
  CREATE_JOURNAL,
  CREATE_JOURNAL_SUCCESS,
  CREATE_JOURNAL_ERROR,
  RESET_CREATE_JOURNAL_STATUS,
  UPDATE_JOURNAL,
  UPDATE_JOURNAL_SUCCESS,
  UPDATE_JOURNAL_ERROR,
  FETCH_JOURNAL,
  FETCH_JOURNAL_SUCCESS,
  FETCH_JOURNAL_ERROR,
  JOURNAL_STAFF_ACTION,
  JOURNAL_STAFF_ACTION_SUCCESS,
  JOURNAL_STAFF_ACTION_ERROR,
  UPDATE_JOURNAL_ACCESS,
  UPDATE_JOURNAL_ACCESS_SUCCESS,
  UPDATE_JOURNAL_ACCESS_ERROR,
  UPDATE_JOURNAL_LOGO,
  UPDATE_JOURNAL_LOGO_SUCCESS,
  UPDATE_JOURNAL_LOGO_ERROR,
  SEARCH_JOURNALS,
  SEARCH_JOURNALS_SUCCESS,
  SEARCH_JOURNALS_ERROR
} from '../actions/journal-action-creators';

// Note: journals are stored in `droplets` (see droplets reducer)

export function createJournalStatus(state = {}, action) {
  switch (action.type) {
    case CREATE_JOURNAL:
      return {
        status: 'active',
        createPeriodicalAction: action.payload,
        error: null
      };

    case CREATE_JOURNAL_SUCCESS:
      return {
        status: 'success',
        createPeriodicalAction: action.payload,
        error: null
      };

    case CREATE_JOURNAL_ERROR:
      return {
        status: 'error',
        createPeriodicalAction: action.payload,
        error: action.error
      };

    case RESET_CREATE_JOURNAL_STATUS:
      return {};

    default:
      return state;
  }
}

export function updateJournalStatusMap(state = {}, action) {
  switch (action.type) {
    case UPDATE_JOURNAL: {
      const { periodicalId } = action.meta;
      return Object.assign({}, state, {
        [periodicalId]: {
          status: 'active',
          error: null
        }
      });
    }
    case UPDATE_JOURNAL_SUCCESS: {
      const { periodicalId } = action.meta;
      return Object.assign({}, state, {
        [periodicalId]: {
          status: 'success',
          error: null
        }
      });
    }
    case UPDATE_JOURNAL_ERROR: {
      const { periodicalId } = action.meta;
      return Object.assign({}, state, {
        [periodicalId]: {
          status: 'error',
          error: action.error
        }
      });
    }

    default:
      return state;
  }
}

export function updateJournalAccessStatusMap(state = {}, action) {
  switch (action.type) {
    case UPDATE_JOURNAL_ACCESS: {
      const { periodicalId } = action.meta;
      return Object.assign({}, state, {
        [periodicalId]: {
          status: 'active',
          error: null
        }
      });
    }
    case UPDATE_JOURNAL_ACCESS_SUCCESS: {
      const { periodicalId } = action.meta;
      return Object.assign({}, state, {
        [periodicalId]: {
          status: 'success',
          error: null
        }
      });
    }
    case UPDATE_JOURNAL_ACCESS_ERROR: {
      const { periodicalId } = action.meta;
      return Object.assign({}, state, {
        [periodicalId]: {
          status: 'error',
          error: action.error
        }
      });
    }
    default:
      return state;
  }
}

export function updateJournalStaffStatusMap(state = {}, action) {
  switch (action.type) {
    case JOURNAL_STAFF_ACTION: {
      const { periodicalId, agentId } = action.meta;
      return Object.assign({}, state, {
        [periodicalId]: Object.assign({}, state[periodicalId], {
          [agentId]: {
            status: 'active',
            error: null
          }
        })
      });
    }
    case JOURNAL_STAFF_ACTION_SUCCESS: {
      const { periodicalId, agentId } = action.meta;
      return Object.assign({}, state, {
        [periodicalId]: Object.assign({}, state[periodicalId], {
          [agentId]: {
            status: 'success',
            error: null
          }
        })
      });
    }
    case JOURNAL_STAFF_ACTION_ERROR: {
      const { periodicalId, agentId } = action.meta;
      return Object.assign({}, state, {
        [periodicalId]: Object.assign({}, state[periodicalId], {
          [agentId]: {
            status: 'error',
            error: action.error
          }
        })
      });
    }

    default:
      return state;
  }
}

export function updateJournalLogoStatusMap(state = {}, action) {
  switch (action.type) {
    case UPDATE_JOURNAL_LOGO: {
      const { periodicalId } = action.meta;
      return Object.assign({}, state, {
        [periodicalId]: {
          status: 'active',
          error: null
        }
      });
    }
    case UPDATE_JOURNAL_LOGO_SUCCESS: {
      const { periodicalId } = action.meta;
      return Object.assign({}, state, {
        [periodicalId]: {
          status: 'success',
          error: null
        }
      });
    }
    case UPDATE_JOURNAL_LOGO_ERROR: {
      const { periodicalId } = action.meta;
      return Object.assign({}, state, {
        [periodicalId]: {
          status: 'error',
          error: action.error
        }
      });
    }

    default:
      return state;
  }
}

export function fetchJournalStatus(
  state = { isActive: false, error: null, xhr: null },
  action
) {
  switch (action.type) {
    case FETCH_JOURNAL:
      return Object.assign({}, state, {
        isActive: true,
        error: null,
        xhr: action.payload
      });

    case FETCH_JOURNAL_SUCCESS: {
      return Object.assign({}, state, {
        isActive: false,
        error: null,
        xhr: null
      });
    }

    case FETCH_JOURNAL_ERROR:
      return Object.assign({}, state, {
        isActive: false,
        error: action.error,
        xhr: null
      });

    default:
      return state;
  }
}

// TODO delete (use droplets instead)
export function homepage(state = {}, action) {
  switch (action.type) {
    case FETCH_JOURNAL_SUCCESS: {
      if (!action.meta.homepage) {
        return state;
      }
      const mainEntity = action.payload.mainEntity || action.payload;
      const periodical =
        mainEntity.itemListElement[0] && mainEntity.itemListElement[0].item;
      return periodical || state;
    }

    default:
      return state;
  }
}

export function journalsSearchResults(
  state = {
    isActive: false,
    error: null,
    journalIds: [],
    xhr: null,
    loadingFacets: {},
    nextUrl: null
  },
  action
) {
  switch (action.type) {
    case SEARCH_JOURNALS: {
      const {
        meta: { reset, loadingFacets }
      } = action;

      return Object.assign(
        {},
        state,
        {
          isActive: true,
          error: null,
          xhr: action.payload,
          loadingFacets
        },
        reset
          ? {
              journalIds: [],
              loadingFacets: {},
              nextUrl: null
            }
          : undefined
      );
    }

    case SEARCH_JOURNALS_SUCCESS: {
      const { append } = action.meta;

      const mainEntity = action.payload.mainEntity || action.payload;
      const lastItemListElement =
        mainEntity.itemListElement[mainEntity.itemListElement.length - 1];
      const nextJournalIds = mainEntity.itemListElement.map(itemListElement =>
        getId(itemListElement.item)
      );
      return {
        isActive: false,
        error: null,
        xhr: null,
        loadingFacets: {},
        journalIds: append
          ? state.journalIds.concat(
              nextJournalIds.filter(id => !state.journalIds.includes(id))
            )
          : nextJournalIds,
        numberOfItems: mainEntity.numberOfItems,
        nextUrl: (lastItemListElement && lastItemListElement.nextItem) || null
      };
    }

    case SEARCH_JOURNALS_ERROR:
      return Object.assign({}, state, {
        isActive: false,
        error: action.error,
        xhr: null,
        loadingFacets: {},
        nextUrl: null
      });

    default:
      return state;
  }
}

export function journalsFacetMap(state = {}, action) {
  switch (action.type) {
    case SEARCH_JOURNALS_SUCCESS: {
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
