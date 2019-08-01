import querystring from 'querystring';
import { getId } from '@scipe/jsonld';
import { xhr, getMetaActionParticipants } from '@scipe/librarian';

export const BUY_SERVICE_OFFER = 'BUY_SERVICE_OFFER';
export const BUY_SERVICE_OFFER_SUCCESS = 'BUY_SERVICE_OFFER_SUCCESS';
export const BUY_SERVICE_OFFER_ERROR = 'BUY_SERVICE_OFFER_ERROR';

// Note: error and status can be cleared by calling `clearErrorAndStatusByKey`
export function buyServiceOffer(
  service,
  offer,
  {
    agent,
    graphId,
    paymentToken, // may be undefined if the offer is free
    instrumentOf // typically the @id of a CreateReleaseAction
  }
) {
  return (dispatch, getState) => {
    const offerId = getId(offer);
    const instrumentOfId = getId(instrumentOf);

    const buyAction = {
      '@type': 'BuyAction',
      actionStatus: 'CompletedActionStatus',
      agent,
      participant: getMetaActionParticipants(service.serviceOutput, {
        addAgent: true
      }),
      object: offerId,
      instrumentOf
    };

    if (paymentToken) {
      buyAction.paymentToken = paymentToken;
    }

    if (!buyAction.participant.length) {
      delete buyAction.participant;
    }

    dispatch({
      type: BUY_SERVICE_OFFER,
      payload: buyAction,
      meta: { graphId, offerId, instrumentOfId }
    });

    return xhr({
      url: `/action`,
      method: 'POST',
      body: buyAction,
      json: true
    })
      .then(({ body: buyAction }) => {
        dispatch({
          type: BUY_SERVICE_OFFER_SUCCESS,
          payload: buyAction,
          meta: { graphId, offerId, instrumentOfId }
        });
        return buyAction;
      })
      .catch(err => {
        const failedBuyAction = Object.assign({}, buyAction, {
          actionStatus: 'FailedActionStatus',
          error: {
            '@type': 'Error',
            statusCode: err.code,
            description: err.message
          }
        });

        dispatch({
          type: BUY_SERVICE_OFFER_ERROR,
          payload: failedBuyAction,
          meta: { graphId, offerId, instrumentOfId },
          error: err
        });

        return failedBuyAction;
      });
  };
}

export const FETCH_ORGANIZATION_SERVICES = 'FETCH_ORGANIZATION_SERVICES';
export const FETCH_ORGANIZATION_SERVICES_SUCCESS =
  'FETCH_ORGANIZATION_SERVICES_SUCCESS';
export const FETCH_ORGANIZATION_SERVICES_ERROR =
  'FETCH_ORGANIZATION_SERVICES_ERROR';

export function fetchOrganizationServices(organizationId) {
  organizationId = getId(organizationId);

  return (dispatch, getState) => {
    const qs = querystring.stringify({
      q: `brokerId:"${organizationId}" NOT serviceStatus:"ArchivedServiceStatus"`,
      includeDocs: true,
      hydrate: JSON.stringify(['brokeredService'])
    });

    dispatch({
      type: FETCH_ORGANIZATION_SERVICES,
      meta: { organizationId }
    });

    xhr({
      url: `/service?${qs}`,
      method: 'GET',
      json: true
    })
      .then(({ body }) => {
        dispatch({
          type: FETCH_ORGANIZATION_SERVICES_SUCCESS,
          meta: { organizationId },
          payload: body
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_ORGANIZATION_SERVICES_ERROR,
          meta: { organizationId },
          err
        });
      });
  };
}

export const CREATE_SERVICE = 'CREATE_SERVICE';
export const CREATE_SERVICE_SUCCESS = 'CREATE_SERVICE_SUCCESS';
export const CREATE_SERVICE_ERROR = 'CREATE_SERVICE_ERROR';

export function createService(organizationId, service) {
  return (dispatch, getState) => {
    const { user } = getState();

    dispatch({
      type: CREATE_SERVICE,
      meta: { organizationId }
    });

    xhr({
      url: '/action',
      method: 'POST',
      body: {
        '@type': 'CreateServiceAction',
        actionStatus: 'CompletedActionStatus',
        agent: getId(user),
        object: getId(organizationId),
        result: service
      },
      json: true
    })
      .then(({ body }) => {
        dispatch({
          type: CREATE_SERVICE_SUCCESS,
          payload: body,
          meta: { organizationId }
        });
      })
      .catch(err => {
        dispatch({
          type: CREATE_SERVICE_ERROR,
          err,
          meta: { organizationId }
        });
      });
  };
}

export const ACTIVATE_SERVICE = 'ACTIVATE_SERVICE';
export const ACTIVATE_SERVICE_SUCCESS = 'ACTIVATE_SERVICE_SUCCESS';
export const ACTIVATE_SERVICE_ERROR = 'ACTIVATE_SERVICE_ERROR';

export function activateService(organizationId, serviceId) {
  serviceId = getId(serviceId);
  return (dispatch, getState) => {
    const { user } = getState();

    dispatch({
      type: ACTIVATE_SERVICE,
      meta: { organizationId, serviceId }
    });

    xhr({
      url: '/action',
      method: 'POST',
      body: {
        '@type': 'ActivateAction',
        actionStatus: 'CompletedActionStatus',
        agent: getId(user),
        object: serviceId
      },
      json: true
    })
      .then(({ body }) => {
        dispatch({
          type: ACTIVATE_SERVICE_SUCCESS,
          meta: { organizationId, serviceId },
          payload: body
        });
      })
      .catch(err => {
        dispatch({
          type: ACTIVATE_SERVICE_ERROR,
          meta: { organizationId, serviceId },
          err
        });
      });
  };
}

export const DEACTIVATE_SERVICE = 'DEACTIVATE_SERVICE';
export const DEACTIVATE_SERVICE_SUCCESS = 'DEACTIVATE_SERVICE_SUCCESS';
export const DEACTIVATE_SERVICE_ERROR = 'DEACTIVATE_SERVICE_ERROR';

export function deactivateService(organizationId, serviceId) {
  serviceId = getId(serviceId);
  return (dispatch, getState) => {
    const { user } = getState();

    dispatch({
      type: DEACTIVATE_SERVICE,
      meta: { organizationId, serviceId }
    });

    xhr({
      url: '/action',
      method: 'POST',
      body: {
        '@type': 'DeactivateAction',
        actionStatus: 'CompletedActionStatus',
        agent: getId(user),
        object: serviceId
      },
      json: true
    })
      .then(({ body }) => {
        dispatch({
          type: DEACTIVATE_SERVICE_SUCCESS,
          meta: { organizationId, serviceId },
          payload: body
        });
      })
      .catch(err => {
        dispatch({
          type: DEACTIVATE_SERVICE_ERROR,
          meta: { organizationId, serviceId },
          err
        });
      });
  };
}

export const UPDATE_SERVICE = 'UPDATE_SERVICE';
export const UPDATE_SERVICE_SUCCESS = 'UPDATE_SERVICE_SUCCESS';
export const UPDATE_SERVICE_ERROR = 'UPDATE_SERVICE_ERROR';

export function updateService(organizationId, serviceId, upd) {
  return (dispatch, getState) => {
    const { user } = getState();

    dispatch({
      type: UPDATE_SERVICE,
      meta: { organizationId, serviceId }
    });

    xhr({
      url: '/action',
      method: 'POST',
      body: {
        '@type': 'UpdateAction',
        actionStatus: 'CompletedActionStatus',
        agent: getId(user),
        object: upd,
        targetCollection: serviceId
      },
      json: true
    })
      .then(({ body }) => {
        dispatch({
          type: UPDATE_SERVICE_SUCCESS,
          meta: { organizationId, serviceId },
          payload: body
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_SERVICE_ERROR,
          meta: { organizationId, serviceId },
          err
        });
      });
  };
}

export const ARCHIVE_SERVICE = 'ARCHIVE_SERVICE';
export const ARCHIVE_SERVICE_SUCCESS = 'ARCHIVE_SERVICE_SUCCESS';
export const ARCHIVE_SERVICE_ERROR = 'ARCHIVE_SERVICE_ERROR';

export function archiveService(organizationId, serviceId) {
  serviceId = getId(serviceId);

  return (dispatch, getState) => {
    const { user } = getState();

    const r = xhr({
      url: `/action`,
      method: 'POST',
      json: {
        agent: getId(user),
        '@type': 'ArchiveAction',
        actionStatus: 'CompletedActionStatus',
        object: serviceId
      }
    });

    dispatch({
      type: ARCHIVE_SERVICE,
      payload: serviceId,
      meta: { organizationId, serviceId, xhr: r.xhr }
    });

    return r
      .then(({ body: action }) => {
        dispatch({
          type: ARCHIVE_SERVICE_SUCCESS,
          payload: action,
          meta: { organizationId, serviceId }
        });
      })
      .catch(err => {
        dispatch({
          type: ARCHIVE_SERVICE_ERROR,
          payload: serviceId,
          meta: { organizationId, serviceId },
          error: err
        });
      });
  };
}
