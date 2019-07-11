import isClient from 'is-client';
import querystring from 'querystring';
import { xhr } from '@scipe/librarian';
import { getArticlesQuery, getLoadingFacets } from '../utils/search';
import { EXPLORER_ARTICLES_FACETS } from '../constants';

export const SEARCH_ARTICLES = 'SEARCH_ARTICLES';
export const SEARCH_ARTICLES_SUCCESS = 'SEARCH_ARTICLES_SUCCESS';
export const SEARCH_ARTICLES_ERROR = 'SEARCH_ARTICLES_ERROR';

export function searchArticles({
  history,
  nextUrl,
  query = {},
  nextQuery,
  cookie,
  baseUrl,
  reset,
  cache = true
} = {}) {
  return (dispatch, getState) => {
    const { user, articlesFacetMap, articlesSearchResults } = getState();

    // cancel previous xhr (if any)
    if (articlesSearchResults && articlesSearchResults.xhr) {
      articlesSearchResults.xhr.abort();
    }

    const facets = EXPLORER_ARTICLES_FACETS;

    let url;
    if (nextUrl) {
      url = nextUrl;
    } else {
      const q = getArticlesQuery(
        user,
        nextQuery || query,
        articlesFacetMap,
        facets
      );

      const qs = {
        sort: JSON.stringify('-dateCreated'),
        counts: JSON.stringify(facets),
        includeDocs: true,
        query: q,
        hydrate: JSON.stringify([
          'additionalType', // publication types
          'creator',
          'author',
          'reviewer',
          'contributor',
          'editor',
          'producer',
          'isPartOf', // journal, issue
          'resultOf', // instance of the editorial workflow
          'workflow' // template of the editorial workflow
        ]),
        limit: 10,
        cache
      };

      url = `/graph?${querystring.stringify(qs)}`;
    }

    // compute loadingFacets and transition route if needed
    let loadingFacets;
    if (nextQuery) {
      loadingFacets = getLoadingFacets(facets, query, nextQuery);
      history.push({
        path: '/',
        search: `?${querystring.stringify(nextQuery)}`
      });
    } else {
      loadingFacets = {};
    }

    const r = xhr({
      url: isClient() ? url : `${baseUrl}${url}`,
      headers: isClient()
        ? undefined
        : cookie
        ? {
            Cookie: cookie
          }
        : undefined,
      method: 'GET',
      json: true
    });

    dispatch({
      type: SEARCH_ARTICLES,
      payload: r.xhr,
      meta: { loadingFacets, reset }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: SEARCH_ARTICLES_SUCCESS,
          payload: body,
          meta: { append: !!nextUrl, loadingFacets }
        });
      })
      .catch(err => {
        dispatch({
          type: SEARCH_ARTICLES_ERROR,
          error: err,
          meta: { loadingFacets }
        });
        throw err;
      });
  };
}
