import {
  SET_EMAIL_COMPOSER_DATA,
  DELETE_EMAIL_COMPOSER_DATA
} from '../actions/email-action-creators';

export function emailComposerData(state = null, action) {
  switch (action.type) {
    case SET_EMAIL_COMPOSER_DATA:
      return action.payload;

    case DELETE_EMAIL_COMPOSER_DATA:
      return null;

    default:
      return state;
  }
}
