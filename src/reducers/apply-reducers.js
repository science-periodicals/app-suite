import { getId } from '@scipe/jsonld';
import {
  FETCH_ACTIVE_APPLICATIONS,
  FETCH_ACTIVE_APPLICATIONS_SUCCESS,
  FETCH_ACTIVE_APPLICATIONS_ERROR
} from '../actions/apply-action-creators';
import {
  REMOTE_DATA_UPSERTED,
  REMOTE_DATA_DELETED
} from '../actions/pouch-action-creators';

export function activeApplications(
  state = {
    data: [],
    nextUrl: null,
    numberOfItems: undefined
  },
  action
) {
  switch (action.type) {
    case FETCH_ACTIVE_APPLICATIONS: {
      if (action.meta.reset) {
        return {
          data: [],
          nextUrl: null,
          numberOfItems: undefined
        };
      }

      return state;
    }

    case FETCH_ACTIVE_APPLICATIONS_SUCCESS: {
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
        doc['@type'] === 'ApplyAction' &&
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

export function fetchActiveApplicationsStatus(
  state = {
    xhr: null,
    isActive: false,
    error: null
  },
  action
) {
  switch (action.type) {
    case FETCH_ACTIVE_APPLICATIONS:
      return { xhr: action.payload, isActive: true, error: null };

    case FETCH_ACTIVE_APPLICATIONS_SUCCESS:
      return { xhr: null, isActive: false, error: null };

    case FETCH_ACTIVE_APPLICATIONS_ERROR:
      return { xhr: null, isActive: false, error: action.error };

    default:
      return state;
  }
}
