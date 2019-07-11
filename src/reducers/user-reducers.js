import { arrayify } from '@scipe/jsonld';
import {
  LOGIN,
  LOGIN_SUCCESS,
  LOGIN_ERROR,
  PROXY_LOGIN,
  PROXY_LOGIN_SUCCESS,
  PROXY_LOGIN_ERROR,
  CLEAR_LOGIN_ERROR,
  UPDATE_PROFILE,
  UPDATE_PROFILE_SUCCESS,
  UPDATE_PROFILE_ERROR,
  FETCH_PROFILE,
  FETCH_PROFILE_SUCCESS,
  FETCH_PROFILE_ERROR,
  UPDATE_USER_CONTACT_POINT,
  UPDATE_USER_CONTACT_POINT_SUCCESS,
  UPDATE_USER_CONTACT_POINT_ERROR
} from '../actions/user-action-creators';

export function updateUserContactPointStatusMap(
  state = { isActive: false, error: null },
  action
) {
  switch (action.type) {
    case UPDATE_USER_CONTACT_POINT: {
      const {
        meta: { contactPointId }
      } = action;

      return Object.assign({}, state, {
        [contactPointId]: {
          isActive: true,
          error: null
        }
      });
    }
    case UPDATE_USER_CONTACT_POINT_SUCCESS: {
      const {
        meta: { contactPointId }
      } = action;

      return Object.assign({}, state, {
        [contactPointId]: {
          isActive: false,
          error: null
        }
      });
    }
    case UPDATE_USER_CONTACT_POINT_ERROR: {
      const {
        meta: { contactPointId }
      } = action;

      return Object.assign({}, state, {
        [contactPointId]: {
          isActive: false,
          error: action.error
        }
      });
    }
    default:
      return state;
  }
}

export function updateProfileStatus(
  state = { active: false, error: null },
  action
) {
  switch (action.type) {
    case UPDATE_PROFILE:
      return {
        active: true,
        error: null
      };
    case UPDATE_PROFILE_SUCCESS:
      return {
        active: false,
        error: null
      };
    case UPDATE_PROFILE_ERROR:
      return {
        active: false,
        error: action.error
      };
    default:
      return state;
  }
}

export function loginStatus(state = { active: false, error: null }, action) {
  switch (action.type) {
    case PROXY_LOGIN:
    case LOGIN:
      return {
        active: true,
        error: null
      };

    case PROXY_LOGIN_SUCCESS:
    case LOGIN_SUCCESS:
      return {
        active: false,
        error: null
      };

    case PROXY_LOGIN_ERROR:
    case LOGIN_ERROR:
      return {
        active: false,
        error: action.error
      };

    case CLEAR_LOGIN_ERROR: {
      return {
        active: false,
        error: null
      };
    }

    default:
      return state;
  }
}

export function fetchProfileStatus(
  state = { isActive: false, error: null, xhr: null },
  action
) {
  switch (action.type) {
    case FETCH_PROFILE:
      return Object.assign({}, state, {
        isActive: true,
        error: null,
        xhr: action.payload
      });

    case FETCH_PROFILE_SUCCESS: {
      return Object.assign({}, state, {
        isActive: false,
        error: null,
        xhr: null
      });
    }

    case FETCH_PROFILE_ERROR:
      return Object.assign({}, state, {
        isActive: false,
        error: action.error,
        xhr: null
      });

    default:
      return state;
  }
}

export function user(state = { roles: [], activeRoles: [] }, action) {
  switch (action.type) {
    case LOGIN_SUCCESS:
      return action.payload;

    case FETCH_PROFILE_SUCCESS: {
      if (!action.meta.includeActiveRoles) {
        return state;
      }
      return Object.assign({}, state, {
        activeRoles: arrayify(action.payload.hasActiveRole)
      });
    }

    default:
      return state;
  }
}
