import omit from 'lodash/omit';
import { getNodeMap, getId } from '@scipe/jsonld';
import {
  FETCH_ORGANIZATION_SERVICES_SUCCESS,
  CREATE_SERVICE_SUCCESS,
  ACTIVATE_SERVICE_SUCCESS,
  DEACTIVATE_SERVICE_SUCCESS,
  UPDATE_SERVICE_SUCCESS,
  ARCHIVE_SERVICE_SUCCESS,
  BUY_SERVICE_OFFER,
  BUY_SERVICE_OFFER_SUCCESS,
  BUY_SERVICE_OFFER_ERROR
} from '../actions/service-action-creators';
import { CLEAR_ERROR_AND_STATUS_BY_KEY } from '../actions/ui-action-creators';

/**
 * service by organizationId
 */
export function serviceMapByOrganizationId(state = {}, action) {
  switch (action.type) {
    case FETCH_ORGANIZATION_SERVICES_SUCCESS: {
      const { organizationId } = action.meta;
      const mainEntity = action.payload.mainEntity || action.payload;

      const services = mainEntity.itemListElement.map(itemListElement => {
        return itemListElement.item;
      });

      return Object.assign({}, state, {
        [organizationId]: getNodeMap(services)
      });
    }

    case CREATE_SERVICE_SUCCESS:
    case ACTIVATE_SERVICE_SUCCESS:
    case DEACTIVATE_SERVICE_SUCCESS:
    case UPDATE_SERVICE_SUCCESS:
    case ARCHIVE_SERVICE_SUCCESS: {
      const {
        meta: { organizationId },
        payload: { result: service }
      } = action;

      return Object.assign({}, state, {
        [organizationId]: Object.assign({}, state[organizationId], {
          [getId(service)]: service
        })
      });
    }

    default:
      return state;
  }
}

// action is stored in graph reducer, only status is tracked here
export function buyServiceOfferStatusByInstrumentOfId(state = {}, action) {
  switch (action.type) {
    case BUY_SERVICE_OFFER: {
      const instrumentOfId =
        getId(action.payload.instrumentOf) || action.meta.instrumentOfId;
      return Object.assign({}, state, {
        [instrumentOfId]: {
          isActive: true,
          error: null
        }
      });
    }

    case BUY_SERVICE_OFFER_SUCCESS: {
      const instrumentOfId =
        getId(action.payload.instrumentOf) || action.meta.instrumentOfId;
      return omit(state, [instrumentOfId]);
    }

    case CLEAR_ERROR_AND_STATUS_BY_KEY: {
      return omit(state, [action.payload]);
    }

    case BUY_SERVICE_OFFER_ERROR: {
      const instrumentOfId =
        getId(action.payload.instrumentOf) || action.meta.instrumentOfId;
      return Object.assign({}, state, {
        [instrumentOfId]: {
          isActive: false,
          error: action.error
        }
      });
    }

    default:
      return state;
  }
}
