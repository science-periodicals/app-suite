import { getId } from '@scipe/jsonld';
import {
  FETCH_ACTIVE_COMMENT_ACTIONS,
  FETCH_ACTIVE_COMMENT_ACTIONS_SUCCESS,
  FETCH_ACTIVE_COMMENT_ACTIONS_ERROR
} from '../actions/comment-action-creators';

import {
  REMOTE_DATA_UPSERTED,
  REMOTE_DATA_DELETED
} from '../actions/pouch-action-creators';

export function activeCommentActionSearchResults(
  state = {
    data: [],
    nextUrl: null,
    numberOfItems: undefined
  },
  action
) {
  switch (action.type) {
    case FETCH_ACTIVE_COMMENT_ACTIONS_SUCCESS: {
      const mainEntity = action.payload.mainEntity || action.payload;
      const lastItemListElement =
        mainEntity.itemListElement[mainEntity.itemListElement.length - 1];
      const nextData = mainEntity.itemListElement.map(
        itemListElement => itemListElement.item
      );

      return Object.assign({}, state, {
        numberOfItems: mainEntity.numberOfItems,
        nextUrl: (lastItemListElement && lastItemListElement.nextItem) || null,
        data:
          action.meta && action.meta.append
            ? state.data.concat(
                nextData.filter(
                  data =>
                    !state.data.some(_data => _data['@id'] === data['@id'])
                )
              )
            : nextData
      });
    }

    case REMOTE_DATA_DELETED:
    case REMOTE_DATA_UPSERTED: {
      const doc = action.payload.master;
      if (
        doc['@type'] === 'CommentAction' &&
        state.data.some(item => getId(item) === getId(doc))
      ) {
        const nextNumberOfItems =
          doc.actionStatus === 'ActiveActionStatus' && !doc._deleted
            ? state.numberOfItems
            : state.numberOfItems - 1;

        return Object.assign({}, state, {
          numberOfItems: nextNumberOfItems,
          data: state.data.map(item => {
            if (getId(item) === getId(doc)) {
              return doc;
            }
            return item;
          })
        });
      }

      return state;
    }

    default:
      return state;
  }
}

export function fetchActiveCommentActionsStatus(
  state = {
    xhr: null,
    isActive: false,
    error: null
  },
  action
) {
  switch (action.type) {
    case FETCH_ACTIVE_COMMENT_ACTIONS:
      return { xhr: action.payload, isActive: true, error: null };

    case FETCH_ACTIVE_COMMENT_ACTIONS_SUCCESS:
      return { xhr: null, isActive: false, error: null };

    case FETCH_ACTIVE_COMMENT_ACTIONS_ERROR:
      return { xhr: null, isActive: false, error: action.error };

    default:
      return state;
  }
}
