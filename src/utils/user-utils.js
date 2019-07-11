import moment from 'moment';
import uniq from 'lodash/uniq';
import groupBy from 'lodash/groupBy';
import { getAgentId } from '@scipe/librarian';
import { getId, arrayify } from '@scipe/jsonld';
import { compareDefinedNames } from '../utils/sort';

/**
 * returns true if the user has updated active roles
 */
export function hasUpdatedActiveRoles(
  user,
  doc = {} // a document from the changes feed
) {
  if (getId(user) && doc.actionStatus === 'CompletedActionStatus') {
    switch (doc['@type']) {
      case 'InviteAction':
      case 'AuthorizeContributorAction':
      case 'DeauthorizeContributorAction':
        if (getAgentId(doc.recipient) === getId(user)) {
          return true;
        }
        break;

      case 'CreateGraphAction':
      case 'CreatePeriodicalAction':
      case 'CreateOrganizationAction':
      case 'JoinAction':
      case 'LeaveAction':
        if (getAgentId(doc.agent) === getId(user)) {
          return true;
        }
        break;

      default:
        return false;
    }
  }

  return false;
}

export function getUserRolesSummary(roles = []) {
  const data = {};

  // `editorFor`, `reviewerFor` etc.
  ['editor', 'reviewer', 'author', 'producer'].forEach(roleName => {
    const myRoles = roles.filter(role => role.roleName === roleName);
    if (myRoles.length) {
      const journalMap = myRoles.reduce((map, role) => {
        const isNodeOfId = getId(role.isNodeOf);
        if (isNodeOfId && isNodeOfId.startsWith('journal:')) {
          map[isNodeOfId] = role.isNodeOf;
        }
        if (role.isNodeOf && role.isNodeOf.isNodeOf) {
          const isNodeOfId = getId(role.isNodeOf.isNodeOf);
          if (isNodeOfId && isNodeOfId.startsWith('journal:')) {
            map[isNodeOfId] = role.isNodeOf.isNodeOf;
          }
        }
        return map;
      }, {});

      data[`${roleName}For`] = Object.values(journalMap)
        .sort(compareDefinedNames)
        .map(journal => {
          return {
            journal,
            subRoleNames: uniq(
              arrayify(myRoles)
                .map(role => role.name)
                .filter(Boolean)
            )
          };
        });
    }
  });

  // activity

  const actions = [];
  roles.forEach(role => {
    if (role.roleAction) {
      actions.push(...arrayify(role.roleAction));
    }
  });

  if (actions.length) {
    const byTypes = groupBy(actions, action => action['@type']);
    data.activity = Object.keys(byTypes)
      .sort()
      .map(type => {
        const myActions = byTypes[type];

        const onTime = myActions.filter(action => {
          return (
            !action.startTime ||
            !action.endTime ||
            !action.expectedDuration ||
            (action.startTime &&
              action.expectedDuration &&
              action.endTime &&
              moment(action.startTime)
                .add(moment.duration(action.expectedDuration))
                .isAfter(moment(action.endTime)))
          );
        });

        return {
          type,
          count: myActions.length,
          onTimeCount: onTime.length
        };
      });
  }

  return data;
}
