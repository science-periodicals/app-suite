import { getId, arrayify } from '@scipe/jsonld';
import {
  FETCH_ACTIVE_INVITES,
  FETCH_ACTIVE_INVITES_SUCCESS,
  FETCH_ACTIVE_INVITES_ERROR,
  POST_INVITE_ACTION,
  POST_INVITE_ACTION_SUCCESS,
  POST_INVITE_ACTION_ERROR,
  DELETE_INVITE_ACTION_SUCCESS
} from '../actions/invite-action-creators';
import {
  REMOTE_DATA_UPSERTED,
  REMOTE_DATA_DELETED
} from '../actions/pouch-action-creators';
import { POST_WORKFLOW_ACTION_SUCCESS } from '../actions/workflow-action-creators';

export function activeInvites(
  state = { data: [], nextUrl: null, numberOfItems: undefined, ifMatch: null },
  action
) {
  switch (action.type) {
    case FETCH_ACTIVE_INVITES: {
      if (action.meta.reset) {
        return {
          data: [],
          nextUrl: null,
          numberOfItems: undefined,
          ifMatch: action.meta.ifMatch
        };
      } else if (action.meta.ifMatch) {
        return Object.assign(state, {
          ifMatch: action.meta.ifMatch
        });
      }

      return state;
    }

    case FETCH_ACTIVE_INVITES_SUCCESS: {
      const {
        meta: { append }
      } = action;

      const mainEntity = action.payload.mainEntity || action.payload;
      const lastItemListElement =
        mainEntity.itemListElement[mainEntity.itemListElement.length - 1];
      const nextData = mainEntity.itemListElement.map(
        itemListElement => itemListElement.item
      );

      return Object.assign({}, state, {
        numberOfItems: mainEntity.numberOfItems,
        nextUrl: (lastItemListElement && lastItemListElement.nextItem) || null,
        data: append
          ? state.data.concat(
              nextData.filter(
                data => !state.data.some(_data => _data['@id'] === data['@id'])
              )
            )
          : nextData
      });
    }

    case REMOTE_DATA_DELETED:
    case REMOTE_DATA_UPSERTED: {
      const doc = action.payload.master;
      if (
        doc['@type'] === 'InviteAction' &&
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

    case POST_WORKFLOW_ACTION_SUCCESS: {
      const doc = action.payload;
      if (
        (doc['@type'] === 'AcceptAction' || doc['@type'] === 'RejectAction') &&
        doc.actionStatus === 'CompletedActionStatus' &&
        doc.result &&
        doc.result['@type'] === 'InviteAction'
      ) {
        const invite = doc.result;

        return Object.assign({}, state, {
          numberOfItems: state.numberOfItems - 1,
          data: state.data.map(item => {
            if (getId(item) === getId(invite)) {
              return invite;
            }
            return item;
          })
        });
      }

      return state;
    }

    case POST_INVITE_ACTION_SUCCESS: {
      const doc = action.payload;
      if (state.data.some(item => getId(item) === getId(doc))) {
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
      } else if (action.meta.ifMatch === state.ifMatch) {
        return Object.assign({}, state, {
          data: [doc, ...state.data],
          numberOfItems: state.numberOfItems + 1
        });
      } else {
        return state;
      }
    }

    case DELETE_INVITE_ACTION_SUCCESS: {
      const itemList = action.payload;
      const doc = arrayify(itemList.itemListElement)
        .map(itemListElement => itemListElement.item)
        .find(doc => doc['@type'] === 'InviteAction');

      if (doc && state.data.some(item => getId(item) === getId(doc))) {
        return Object.assign({}, state, {
          numberOfItems: state.numberOfItems - 1,
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

export function fetchActiveInvitesStatus(
  state = {
    xhr: null,
    isActive: false,
    error: null
  },
  action
) {
  switch (action.type) {
    case FETCH_ACTIVE_INVITES:
      return { xhr: action.payload, isActive: true, error: null };

    case FETCH_ACTIVE_INVITES_SUCCESS:
      return { xhr: null, isActive: false, error: null };

    case FETCH_ACTIVE_INVITES_ERROR:
      return { xhr: null, isActive: false, error: action.error };

    default:
      return state;
  }
}

export function postInviteActionStatusMap(state = {}, action) {
  switch (action.type) {
    case POST_INVITE_ACTION:
      return Object.assign({}, state, {
        [getId(action.payload)]: {
          status: 'active',
          error: null
        }
      });

    case POST_INVITE_ACTION_SUCCESS:
      return Object.assign({}, state, {
        [getId(action.payload)]: {
          status: 'success',
          error: null
        }
      });

    case POST_INVITE_ACTION_ERROR:
      return Object.assign({}, state, {
        [getId(action.payload)]: {
          status: 'error',
          error: action.error
        }
      });

    default:
      return state;
  }
}
