import omit from 'lodash/omit';
import { parseIndexableString } from '@scipe/collate';
import { getId, arrayify, getNodeMap } from '@scipe/jsonld';
import { WEBIFY_ACTION_TYPES } from '@scipe/librarian';
import {
  FETCH_JOURNAL_SUCCESS,
  UPDATE_JOURNAL_SUCCESS,
  SEARCH_JOURNALS_SUCCESS,
  CREATE_JOURNAL_SUCCESS,
  UPSERT_JOURNAL_STYLE_SUCCESS,
  ADD_JOURNAL_SUBJECT_SUCCESS,
  JOURNAL_STAFF_ACTION_SUCCESS,
  UPDATE_JOURNAL_ACCESS_SUCCESS,
  DELETE_JOURNAL_SUBJECT_SUCCESS,
  RESET_JOURNAL_STYLE_OR_ASSET_SUCCESS
} from '../actions/journal-action-creators';
import {
  SEARCH_GRAPHS_SUCCESS,
  FETCH_GRAPH_SUCCESS,
  UPDATE_RELEASE_SUCCESS
} from '../actions/graph-action-creators';
import { FETCH_FEED_ITEMS_SUCCESS } from '../actions/feed-action-creators';
import { FETCH_ACTIVE_INVITES_SUCCESS } from '../actions/invite-action-creators';
import { FETCH_ACTIVE_COMMENT_ACTIONS_SUCCESS } from '../actions/comment-action-creators';
import {
  FETCH_PROFILE_SUCCESS,
  UPDATE_PROFILE_SUCCESS,
  UPDATE_USER_CONTACT_POINT_SUCCESS
} from '../actions/user-action-creators';
import {
  ADD_DROPLETS,
  FETCH_DROPLET_SUCCESS
} from '../actions/droplet-action-creators';
import {
  FETCH_SETTINGS_JOURNAL_LIST_SUCCESS,
  FETCH_SETTINGS_ORGANIZATION_LIST_SUCCESS,
  SEARCH_SETTINGS_ISSUE_LIST_SUCCESS,
  SEARCH_SETTINGS_ARTICLE_LIST_SUCCESS,
  SEARCH_SETTINGS_RFA_LIST_SUCCESS
} from '../actions/settings-action-creators';
import {
  CREATE_ORGANIZATION_SUCCESS,
  FETCH_ORGANIZATION_SUCCESS,
  UPDATE_ORGANIZATION_SUCCESS,
  POST_ORGANIZATION_MEMBER_ACTION_SUCCESS,
  UPDATE_ORGANIZATION_CONTACT_POINT_SUCCESS
} from '../actions/organization-action-creators';
import {
  SEARCH_ISSUES_SUCCESS,
  CREATE_ISSUE_SUCCESS,
  UPDATE_ISSUE_SUCCESS
} from '../actions/issue-action-creators';
import { FETCH_ORGANIZATION_SERVICES_SUCCESS } from '../actions/service-action-creators';
import {
  REMOTE_DATA_UPSERTED,
  REMOTE_DATA_DELETED,
  LOAD_FROM_POUCH_SUCCESS,
  POUCH_DATA_UPSERTED
} from '../actions/pouch-action-creators';
import {
  SEARCH_RFAS_SUCCESS,
  FETCH_RFA_SUCCESS,
  CREATE_RFA_SUCCESS,
  UPDATE_RFA_SUCCESS
} from '../actions/rfa-action-creators';
import { SEARCH_ARTICLES_SUCCESS } from '../actions/article-action-creators';
import { FETCH_ACTIVE_CHECKS_SUCCESS } from '../actions/check-action-creators';
import { WORKER_DATA } from '../actions/worker-action-creators';
import { FETCH_PERIODICAL_PUBLICATION_TYPES_SUCCESS } from '../actions/type-action-creators';
import {
  UPDATE_WORKFLOW_SPECIFICATION_SUCCESS,
  ARCHIVE_WORKFLOW_SPECIFICATION_SUCCESS
} from '../actions/workflow-action-creators';

export function droplets(state = {}, action) {
  if (action.buffered) {
    return action.payload.reduce((state, action) => {
      return droplets(state, action);
    }, state);
  }

  switch (action.type) {
    case UPDATE_USER_CONTACT_POINT_SUCCESS:
    case UPDATE_PROFILE_SUCCESS: {
      const profile = action.payload.result;
      return Object.assign({}, state, {
        [profile['@id']]: profile
      });
    }

    case WORKER_DATA: {
      // the worker can be responsible to auto apply update actions
      // when they do that they do it with `mode: 'document'`
      // => we can get droplet out of the result of the `UpdateAction`
      const webifyAction = action.payload;
      if (
        webifyAction.actionStatus === 'CompletedActionStatus' &&
        WEBIFY_ACTION_TYPES.has(webifyAction['@type'])
      ) {
        const udpateAction = webifyAction.result;
        if (
          udpateAction &&
          udpateAction['@type'] === 'UpdateAction' &&
          udpateAction.actionStatus === 'CompletedActionStatus'
        ) {
          const droplet = udpateAction.result;
          if (droplet) {
            return Object.assign({}, state, { [getId(droplet)]: droplet });
          }
        }
      }
      return state;
    }

    case FETCH_SETTINGS_ORGANIZATION_LIST_SUCCESS:
    case FETCH_ORGANIZATION_SERVICES_SUCCESS:
    case FETCH_PERIODICAL_PUBLICATION_TYPES_SUCCESS:
    case SEARCH_SETTINGS_ARTICLE_LIST_SUCCESS:
    case SEARCH_SETTINGS_ISSUE_LIST_SUCCESS:
    case SEARCH_SETTINGS_RFA_LIST_SUCCESS:
    case SEARCH_ISSUES_SUCCESS:
    case FETCH_SETTINGS_JOURNAL_LIST_SUCCESS:
    case FETCH_JOURNAL_SUCCESS:
    case FETCH_GRAPH_SUCCESS:
    case SEARCH_GRAPHS_SUCCESS:
    case SEARCH_JOURNALS_SUCCESS:
    case SEARCH_ARTICLES_SUCCESS:
    case SEARCH_RFAS_SUCCESS:
    case FETCH_ACTIVE_COMMENT_ACTIONS_SUCCESS:
    case FETCH_ACTIVE_INVITES_SUCCESS:
    case FETCH_ACTIVE_CHECKS_SUCCESS:
    case FETCH_FEED_ITEMS_SUCCESS: {
      const nodes = arrayify(action.payload['@graph']).concat(
        // in case of search results
        arrayify(
          action.payload.mainEntity && action.payload.mainEntity.itemListElement
        ).map(listItem => listItem.item),
        arrayify(action.payload.itemListElement).map(listItem => listItem.item)
      );

      const changedNodes = nodes.filter(node => {
        return !(node['@id'] in state) || node._rev !== state[node['@id']]._rev;
      });

      if (changedNodes.length) {
        return Object.assign({}, state, getNodeMap(changedNodes));
      }

      return state;
    }

    case ADD_DROPLETS: {
      const changedNodes = Object.values(action.payload).filter(node => {
        return !(node['@id'] in state) || node._rev !== state[node['@id']]._rev;
      });

      if (changedNodes.length) {
        return Object.assign({}, state, getNodeMap(changedNodes));
      }

      return state;
    }

    case FETCH_DROPLET_SUCCESS: {
      return Object.assign({}, state, {
        [getId(action.payload)]: action.payload
      });
    }

    case FETCH_ORGANIZATION_SUCCESS:
    case FETCH_RFA_SUCCESS: {
      const droplet = action.payload;
      return Object.assign({}, state, {
        [getId(droplet)]: droplet
      });
    }

    case FETCH_PROFILE_SUCCESS: {
      const data = action.payload;
      return Object.assign({}, state, {
        [getId(data)]: omit(data, ['hasActiveRole'])
      });
    }

    // we need that as we rely on the droplets for the settings panel
    case CREATE_JOURNAL_SUCCESS:
    case UPSERT_JOURNAL_STYLE_SUCCESS:
    case ADD_JOURNAL_SUBJECT_SUCCESS:
    case JOURNAL_STAFF_ACTION_SUCCESS:
    case UPDATE_JOURNAL_ACCESS_SUCCESS:
    case DELETE_JOURNAL_SUBJECT_SUCCESS:
    case RESET_JOURNAL_STYLE_OR_ASSET_SUCCESS:
    case CREATE_ISSUE_SUCCESS:
    case UPDATE_ISSUE_SUCCESS:
    case UPDATE_JOURNAL_SUCCESS:
    case CREATE_ORGANIZATION_SUCCESS:
    case UPDATE_ORGANIZATION_CONTACT_POINT_SUCCESS:
    case UPDATE_ORGANIZATION_SUCCESS:
    case UPDATE_WORKFLOW_SPECIFICATION_SUCCESS:
    case ARCHIVE_WORKFLOW_SPECIFICATION_SUCCESS:
    case POST_ORGANIZATION_MEMBER_ACTION_SUCCESS:
    case UPDATE_RELEASE_SUCCESS: {
      const node = action.payload.result;
      return Object.assign({}, state, { [getId(node)]: node });
    }

    case CREATE_RFA_SUCCESS:
    case UPDATE_RFA_SUCCESS: {
      const node = action.payload;
      return Object.assign({}, state, { [getId(node)]: node });
    }

    case POUCH_DATA_UPSERTED: {
      if (action.meta.type === 'journal') {
        const periodical = action.payload.master;
        if (periodical) {
          return Object.assign({}, state, {
            [getId(periodical)]: periodical
          });
        }
      }
      return state;
    }

    case LOAD_FROM_POUCH_SUCCESS: {
      const nodes = action.payload.filter(data => {
        const [, type] = parseIndexableString(data.master._id);
        return type === 'journal' || type === 'type';
      });

      if (nodes.length) {
        return Object.assign(
          {},
          state,
          nodes.reduce((nodeMap, node) => {
            node = node.master;
            if (node) {
              nodeMap[getId(node)] = node;
            }
            return nodeMap;
          }, {})
        );
      }
      return state;
    }

    case REMOTE_DATA_UPSERTED: {
      const doc = action.payload.master;
      const docId = getId(doc);
      if (
        docId &&
        (docId.startsWith('journal:') ||
          docId.startsWith('org:') ||
          docId.startsWith('type:') ||
          docId.startsWith('workflow:') ||
          docId.startsWith('issue:'))
      ) {
        return Object.assign({}, state, {
          [getId(doc)]: doc
        });
      }
      return state;
    }

    case REMOTE_DATA_DELETED: {
      const doc = action.payload.master;
      const docId = getId(doc);
      if (
        docId &&
        (docId.startsWith('journal:') ||
          docId.startsWith('org:') ||
          docId.startsWith('type:') ||
          docId.startsWith('workflow:') ||
          docId.startsWith('issue:'))
      ) {
        return omit(state, [getId(doc)]);
      }
      return state;
    }

    default:
      return state;
  }
}
