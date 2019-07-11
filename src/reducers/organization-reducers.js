import {
  RESET_CREATE_ORGANIZATION_STATUS,
  CREATE_ORGANIZATION,
  CREATE_ORGANIZATION_SUCCESS,
  CREATE_ORGANIZATION_ERROR,
  FETCH_ORGANIZATION,
  FETCH_ORGANIZATION_SUCCESS,
  FETCH_ORGANIZATION_ERROR,
  UPDATE_ORGANIZATION,
  UPDATE_ORGANIZATION_SUCCESS,
  UPDATE_ORGANIZATION_ERROR,
  UPDATE_ORGANIZATION_CONTACT_POINT,
  UPDATE_ORGANIZATION_CONTACT_POINT_SUCCESS,
  UPDATE_ORGANIZATION_CONTACT_POINT_ERROR
} from '../actions/organization-action-creators';

// Note: organizations are stored in `droplets` (see droplets reducer)

export function updateOrganizationContactPointStatusMap(
  state = { isActive: false, error: null },
  action
) {
  switch (action.type) {
    case UPDATE_ORGANIZATION_CONTACT_POINT: {
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
    case UPDATE_ORGANIZATION_CONTACT_POINT_SUCCESS: {
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
    case UPDATE_ORGANIZATION_CONTACT_POINT_ERROR: {
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

export function createOrganizationStatus(state = {}, action) {
  switch (action.type) {
    case RESET_CREATE_ORGANIZATION_STATUS:
      return {};

    case CREATE_ORGANIZATION:
      return {
        status: 'active',
        createOrganizationAction: action.payload,
        error: null
      };

    case CREATE_ORGANIZATION_SUCCESS:
      return {
        status: 'success',
        createOrganizationAction: action.payload,
        error: null
      };

    case CREATE_ORGANIZATION_ERROR:
      return {
        status: 'error',
        createOrganizationAction: action.payload,
        error: action.error
      };

    default:
      return state;
  }
}

export function fetchOrganizationStatus(
  state = { status: null, xhr: null },
  action
) {
  switch (action.type) {
    case FETCH_ORGANIZATION:
      return Object.assign({}, state, {
        status: 'active',
        error: null,
        xhr: action.payload
      });

    case FETCH_ORGANIZATION_SUCCESS: {
      return Object.assign({}, state, {
        status: 'success',
        error: null,
        xhr: null
      });
    }

    case FETCH_ORGANIZATION_ERROR:
      return Object.assign({}, state, {
        status: 'error',
        error: action.error,
        xhr: null
      });

    default:
      return state;
  }
}

export function updateOrganizationStatusMap(state = {}, action) {
  switch (action.type) {
    case UPDATE_ORGANIZATION: {
      const { organizationId } = action.meta;
      return Object.assign({}, state, {
        [organizationId]: {
          status: 'active',
          error: null
        }
      });
    }
    case UPDATE_ORGANIZATION_SUCCESS: {
      const { organizationId } = action.meta;
      return Object.assign({}, state, {
        [organizationId]: {
          status: 'success',
          error: null
        }
      });
    }
    case UPDATE_ORGANIZATION_ERROR: {
      const { organizationId } = action.meta;
      return Object.assign({}, state, {
        [organizationId]: {
          status: 'error',
          error: action.error
        }
      });
    }

    default:
      return state;
  }
}
