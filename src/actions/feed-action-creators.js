import isClient from 'is-client';
import querystring from 'querystring';
import { escapeLucene, xhr } from '@scipe/librarian';
import { FEED_ITEM_TYPES } from '../constants';

export const FETCH_FEED_ITEMS = 'FETCH_FEED_ITEMS';
export const FETCH_FEED_ITEMS_SUCCESS = 'FETCH_FEED_ITEMS_SUCCESS';
export const FETCH_FEED_ITEMS_ERROR = 'FETCH_FEED_ITEMS_ERROR';

export function fetchFeedItems({
  nextUrl,
  baseUrl,
  cookie,
  cache = true
} = {}) {
  return (dispatch, getState) => {
    const { user, feedItems } = getState();

    if (feedItems.xhr) {
      feedItems.xhr.abort();
    }

    let url, append;
    if (nextUrl) {
      url = nextUrl;
      append = true;
    } else {
      append = false;

      const escUser = escapeLucene(user['@id']);
      const types = FEED_ITEM_TYPES.map(type => `@type:${type}`).join(' OR ');

      const scope = [
        `agentId:"${escUser}"`,
        `recipientId:"${escUser}"`,
        `participantId:"${escUser}"`
      ].join(' OR ');

      const qs = {
        sort: JSON.stringify('-endTime'),
        query: `(${types}) AND (${scope}) AND actionStatus:CompletedActionStatus`,
        addActiveRoleIds: true, 
        hydrate: JSON.stringify([
          'object',
          'result',
          'instrument',
          'orderedItem',
          'acceptedOffer',
          'itemOffered',
          'isPartOf',
          'mainEntity',
          'scope'
        ]),
        potentialActions: 'bare',
        includeDocs: true,
        limit: 8,
        cache
      };
      url = `/action?${querystring.stringify(qs)}`;
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
      type: FETCH_FEED_ITEMS,
      payload: r.xhr
    });
    return r
      .then(({ body }) => {
        dispatch({
          type: FETCH_FEED_ITEMS_SUCCESS,
          payload: body,
          meta: { append }
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_FEED_ITEMS_ERROR,
          error: err
        });
      });
  };
}
