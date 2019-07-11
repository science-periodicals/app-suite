import { getId, arrayify } from '@scipe/jsonld';
import {
  SEARCH_RFAS,
  SEARCH_RFAS_SUCCESS,
  SEARCH_RFAS_ERROR,
  FETCH_RFA,
  FETCH_RFA_SUCCESS,
  FETCH_RFA_ERROR
} from '../actions/rfa-action-creators';

export function rfasSearchResults(
  state = {
    isActive: false,
    error: null,
    rfaIds: [],
    xhr: null,
    loadingFacets: {},
    nextUrl: null
  },
  action
) {
  switch (action.type) {
    case SEARCH_RFAS: {
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
              rfaIds: [],
              loadingFacets: {},
              nextUrl: null
            }
          : undefined
      );
    }

    case SEARCH_RFAS_SUCCESS: {
      const { append } = action.meta;

      const mainEntity = action.payload.mainEntity || action.payload;
      const lastItemListElement =
        mainEntity.itemListElement[mainEntity.itemListElement.length - 1];
      const nextRfaIds = mainEntity.itemListElement.map(itemListElement =>
        getId(itemListElement.item)
      );
      return {
        isActive: false,
        error: null,
        xhr: null,
        loadingFacets: {},
        rfaIds: append
          ? state.rfaIds.concat(
              nextRfaIds.filter(id => !state.rfaIds.includes(id))
            )
          : nextRfaIds,
        numberOfItems: mainEntity.numberOfItems,
        nextUrl: (lastItemListElement && lastItemListElement.nextItem) || null
      };
    }

    case SEARCH_RFAS_ERROR:
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

export function rfasFacetMap(state = {}, action) {
  switch (action.type) {
    case SEARCH_RFAS_SUCCESS: {
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

export function fetchRfaStatus(
  state = {
    isActive: false,
    xhr: null,
    error: null
  },
  action
) {
  switch (action.type) {
    case FETCH_RFA:
      return {
        isActive: true,
        xhr: action.payload,
        error: null
      };
    case FETCH_RFA_SUCCESS:
      return {
        isActive: false,
        xhr: null,
        error: null
      };
    case FETCH_RFA_ERROR:
      return {
        isActive: false,
        xhr: null,
        error: action.error
      };
    default:
      return state;
  }
}
