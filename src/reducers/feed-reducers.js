import {
  FETCH_FEED_ITEMS,
  FETCH_FEED_ITEMS_SUCCESS,
  FETCH_FEED_ITEMS_ERROR
} from '../actions/feed-action-creators';

export function feedItems(
  state = {
    status: 'active',
    data: [],
    nextUrl: null,
    error: null,
    numberOfItems: undefined,
    xhr: undefined
  },
  action
) {
  switch (action.type) {
    case FETCH_FEED_ITEMS:
      return Object.assign({}, state, {
        status: 'active',
        xhr: action.payload,
        error: null,
        nextUrl: null
      });

    case FETCH_FEED_ITEMS_SUCCESS: {
      const mainEntity = action.payload.mainEntity || action.payload;
      const lastItemListElement =
        mainEntity.itemListElement[mainEntity.itemListElement.length - 1];
      const nextData = mainEntity.itemListElement.map(
        itemListElement => itemListElement.item
      ); // TODO reuse from state...

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
            : nextData,
        xhr: null,
        status: 'success'
      });
    }

    case FETCH_FEED_ITEMS_ERROR:
      return Object.assign({}, state, {
        nextUrl: null,
        xhr: null,
        status: 'error',
        error: action.error
      });

    default:
      return state;
  }
}
