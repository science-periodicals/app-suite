import { getObjectId } from '@scipe/librarian';
import { createEmailMessage } from '../utils/email-utils';
import { createGraphDataSelector } from '../selectors/graph-selectors';

export const SET_EMAIL_COMPOSER_DATA = 'SET_EMAIL_COMPOSER_DATA';

// For now `action` must be an InviteAction
export function setEmailComposerData(action) {
  return function(dispatch, getState) {
    switch (action['@type']) {
      case 'InviteAction': {
        // we get some data that will become the `about` property of the EmailMessage

        const { droplets } = getState();

        const objectId = getObjectId(action);

        if (objectId && objectId.startsWith('graph:')) {
          // Graph
          const graphData = createGraphDataSelector()(getState(), {
            graphId: objectId
          });
          const about = graphData && graphData.graph;

          dispatch({
            type: SET_EMAIL_COMPOSER_DATA,
            payload: Object.assign({}, action, {
              potentialAction: {
                '@type': 'InformAction',
                actionStatus: 'CompletedActionStatus',
                agent: action.agent,
                recipient: action.recipient,
                instrument: createEmailMessage(action, about, getState())
              }
            })
          });
        } else {
          // Periodical or Organization
          const about = droplets[objectId];

          dispatch({
            type: SET_EMAIL_COMPOSER_DATA,
            payload: Object.assign({}, action, {
              potentialAction: {
                '@type': 'InformAction',
                actionStatus: 'CompletedActionStatus',
                agent: action.agent,
                recipient: action.recipient,
                instrument: createEmailMessage(action, about, getState())
              }
            })
          });
        }

        break;
      }

      default:
        break;
    }
  };
}

export const DELETE_EMAIL_COMPOSER_DATA = 'DELETE_EMAIL_COMPOSER_DATA';

export function deleteEmailComposerData() {
  return {
    type: DELETE_EMAIL_COMPOSER_DATA
  };
}
