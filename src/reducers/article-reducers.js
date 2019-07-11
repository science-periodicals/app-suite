import { getId, arrayify } from '@scipe/jsonld';
import {
  SEARCH_ARTICLES,
  SEARCH_ARTICLES_SUCCESS,
  SEARCH_ARTICLES_ERROR
} from '../actions/article-action-creators';

export function articlesSearchResults(
  state = {
    isActive: false,
    error: null,
    articleIds: [],
    xhr: null,
    loadingFacets: {},
    nextUrl: null
  },
  action
) {
  switch (action.type) {
    case SEARCH_ARTICLES: {
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
              articleIds: [],
              loadingFacets: {},
              nextUrl: null
            }
          : undefined
      );
    }

    case SEARCH_ARTICLES_SUCCESS: {
      const { append } = action.meta;

      const mainEntity = action.payload.mainEntity || action.payload;
      const lastItemListElement =
        mainEntity.itemListElement[mainEntity.itemListElement.length - 1];
      const nextArticleIds = mainEntity.itemListElement.map(itemListElement =>
        getId(itemListElement.item)
      );
      return {
        isActive: false,
        error: null,
        xhr: null,
        loadingFacets: {},
        articleIds: append
          ? state.articleIds.concat(
              nextArticleIds.filter(id => !state.articleIds.includes(id))
            )
          : nextArticleIds,
        numberOfItems: mainEntity.numberOfItems,
        nextUrl: (lastItemListElement && lastItemListElement.nextItem) || null
      };
    }

    case SEARCH_ARTICLES_ERROR:
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

export function articlesFacetMap(state = {}, action) {
  switch (action.type) {
    case SEARCH_ARTICLES_SUCCESS: {
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
