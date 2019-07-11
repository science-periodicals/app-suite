import { getId, textify, unprefix, arrayify } from '@scipe/jsonld';
import {
  EMAIL_MESSAGE_SENDER,
  remapRole,
  getAgentId,
  getObject,
  getObjectId,
  getRootPartId,
  getScopeId,
  getStageActions,
  getResultId,
  getTargetCollectionId,
  getContactPointScopeId
} from '@scipe/librarian';
import { getSortedStages, getInstance } from './workflow';
import { SCIPE_URL, DASHBOARD_URL } from '../constants';
import { createGraphAclSelector } from '../selectors/graph-selectors';

/**
 * `about` is an hydrated Graph or a periodical
 */
export function createEmailMessage(
  action,
  about, // Graph, Periodical, Organization, Profile
  state // redux store state
) {
  if (!action) {
    return null;
  }

  switch (action['@type']) {
    case 'InviteAction': {
      let emailMessage;
      const objectId = getObjectId(action);
      if (
        (about && about['@type'] === 'Graph') ||
        (objectId && objectId.startsWith('graph:'))
      ) {
        emailMessage = createGraphInviteEmailMessage(action, about, state);
      } else if (about && about['@type'] === 'Periodical') {
        emailMessage = createPeriodicalInviteEmailMessage(action, about);
      } else if (
        (about && about['@type'] === 'Organization') ||
        objectId.startsWith('org:')
      ) {
        emailMessage = createOrganizationInviteEmailMessage(action, about);
      }
      return emailMessage;
    }

    case 'UpdateContactPointAction': {
      return createUpdateContactPointEmailMessage(action, about);
    }

    case 'ResetPasswordAction': {
      return createResetPasswordEmailMessage(action, about);
    }

    default:
      return null;
  }
}

function createGraphInviteEmailMessage(
  inviteAction,
  graph, // live graph
  state
) {
  const { recipient } = inviteAction;
  const periodicalId = getRootPartId(graph);

  const { user, droplets, scopeMap } = state;
  const acl = createGraphAclSelector()(state, {
    graphId: getId(graph)
  });

  const scopeData = scopeMap[getScopeId(graph)] || {};
  const { actionMap = {}, graphMap = {} } = scopeData;
  const periodical = droplets[periodicalId];

  // we get the lastest completed create release action so that we have accurate abstract and release notes
  const stages = getSortedStages(actionMap);
  let latestCompletedCreateReleaseAction;
  for (let i = 0; i < stages.length; i++) {
    const actions = getStageActions(stages[i]);
    latestCompletedCreateReleaseAction = actions.find(
      action =>
        action &&
        action['@type'] === 'CreateReleaseAction' &&
        action.actionStatus === 'CompletedActionStatus'
    );

    if (latestCompletedCreateReleaseAction) {
      latestCompletedCreateReleaseAction = getInstance(
        latestCompletedCreateReleaseAction,
        {
          actionMap,
          user,
          acl
        }
      );
      break;
    }
  }

  const graphData =
    graphMap[getResultId(latestCompletedCreateReleaseAction)] ||
    graphMap[getId(graph)] ||
    {};

  const { nodeMap = {}, graph: release = {} } = graphData;

  const mainEntity = nodeMap[getId(release.mainEntity)];

  const abstract = arrayify(mainEntity && mainEntity.detailedDescription)
    .map(detailedDescription => nodeMap[getId(detailedDescription)])
    .find(
      abstract =>
        abstract && abstract['@type'] === 'WPAbstract' && abstract.text
    );

  const releaseNotes =
    latestCompletedCreateReleaseAction &&
    latestCompletedCreateReleaseAction.releaseNotes;

  return {
    '@type': 'EmailMessage',
    sender: {
      '@id': 'bot:scipe',
      name: 'sci.pe',
      email: `mailto:${EMAIL_MESSAGE_SENDER}`
    },
    recipient,
    about: graph,
    description: `[${textify(periodical.alternateName || periodical.name) ||
      'sci.pe'}] You have been invited as ${recipient.name ||
      recipient.roleName} to a new submission (${unprefix(
      getScopeId(release)
    )})`,
    text: {
      '@type': 'rdf:HTML',
      // Note we only use tags as this is to be supported by RichTextArea
      '@value': `<p>Hello,</p>
<p>You have been invited as <em>${recipient.name ||
        recipient.roleName}</em> to a new submission (${unprefix(
        getScopeId(release)
      )}) to <a href="${periodical.url}">${textify(
        periodical.alternateName || periodical.name
      ) || unprefix(getId(periodical))}</a>.</p>
${
  mainEntity && mainEntity.name
    ? `<p><strong>Title:</strong></p><p>${textify(mainEntity.name)}</p>`
    : ''
}
${
  abstract
    ? `<p><strong>Abstract:</strong></p><p>${textify(abstract.text)}</p>`
    : ''
}
${
  releaseNotes
    ? `<p><strong>Release notes:</strong></p><p>${textify(releaseNotes)}</p>`
    : ''
}
<p>You can accept or reject the invite on <strong>sci.pe</strong> <a href="${DASHBOARD_URL}">dashboard</a>.</p>
<p>Thank you.</p>
`
    },
    potentialAction: {
      '@type': 'ViewAction',
      name: 'View Invite',
      target: {
        '@type': 'EntryPoint',
        url: DASHBOARD_URL
      }
    }
  };
}

function createPeriodicalInviteEmailMessage(inviteAction, periodical) {
  const { recipient } = inviteAction;
  periodical = periodical || getObject(inviteAction);

  return {
    '@type': 'EmailMessage',
    sender: {
      '@id': 'bot:scipe',
      name: 'sci.pe',
      email: `mailto:${EMAIL_MESSAGE_SENDER}`
    },
    recipient,
    about: periodical,
    description: `[${textify(periodical.alternateName || periodical.name) ||
      'sci.pe'}] You have been invited as ${recipient.name ||
      recipient.roleName}`,
    text: {
      '@type': 'rdf:HTML',
      // Note we only use simple tags as this is to be used with RichTextArea which will convert to markdown
      '@value': `<p>Hello,</p>
<p>You have been invited as <em>${recipient.name ||
        recipient.roleName}</em> to <a href="${periodical.url ||
        '#'}">${textify(periodical.name || periodical.alternateName) ||
        unprefix(getId(periodical))}</a>.</p>
${
  periodical.description
    ? `<p><strong>About:</strong></p><p>${textify(periodical.description)}</p>`
    : ''
}
<p>You can accept or reject the invite on <strong>sci.pe</strong> <a href="${DASHBOARD_URL}">dashboard</a>.</p>
<p>Thank you.</p>
`
    },
    potentialAction: {
      '@type': 'ViewAction',
      name: 'View Invite',
      target: {
        '@type': 'EntryPoint',
        url: DASHBOARD_URL
      }
    }
  };
}

function createOrganizationInviteEmailMessage(inviteAction, organization) {
  const { recipient } = inviteAction;
  organization = organization || getObject(inviteAction);

  const orgName =
    textify(organization.alternateName || organization.name) ||
    unprefix(getId(organization));

  return {
    '@type': 'EmailMessage',
    sender: {
      '@id': 'bot:scipe',
      name: 'sci.pe',
      email: `mailto:${EMAIL_MESSAGE_SENDER}`
    },
    recipient,
    about: organization,
    description: `[${unprefix(
      getId(organization)
    )}] You have been invited to join ${orgName} on sci.pe`,
    // prettier-ignore
    text: {
      '@type': 'rdf:HTML',
      // Note we only use simple tags as this is to be used with RichTextArea which will convert to markdown
      '@value': `<p>Hello,</p>
<p>You have been invited to join the organization <strong>${orgName}</strong>  as <em>${recipient.name || recipient.roleName}</em> on sci.pe.</p>
${
  organization.description
    ? `<p><strong>About:</strong></p><p>${textify(
      organization.description
    )}</p>`
    : ''
}
<p>You can accept or reject the invite on <strong>sci.pe</strong> <a href="${DASHBOARD_URL}">dashboard</a>.</p>
<p>Thank you.</p>
`
    },
    potentialAction: {
      '@type': 'ViewAction',
      name: 'View Invite',
      target: {
        '@type': 'EntryPoint',
        url: DASHBOARD_URL
      }
    }
  };
}

function createUpdateContactPointEmailMessage(updateContactPointAction) {
  const contactPointId = getTargetCollectionId(updateContactPointAction);
  const scopeId = getContactPointScopeId(contactPointId);

  return {
    '@type': 'EmailMessage',
    sender: {
      '@id': 'bot:scipe',
      name: 'sci.pe',
      email: `mailto:${EMAIL_MESSAGE_SENDER}`
    },
    recipient: {
      email: updateContactPointAction.object.email
    },
    description: '[sci.pe] Verify change of email address',
    // prettier-ignore
    text: {
      '@type': 'sa:ejs',
      // Note we only use simple tags as this is to be used with RichTextArea which will convert to markdown
      '@value': `<% var root = parsedReferer ? (parsedReferer.protocol + '//' + ((parsedReferer.port === 80 || parsedReferer.port === 443) ? parsedReferer.hostname : parsedReferer.host)) : '${SCIPE_URL}' %>
<% var next = root + '${
        scopeId.startsWith('org:')
          ? `/settings/organization/${unprefix(scopeId)}/contact-points`
          : '/settings/contact-points'
      }' %>
<% var url = root + '/contact/' + unprefix(unrole(object.targetCollection, 'targetCollection')) + '/validate?action=' + unprefix(getId(object)) + '&token=' + emailVerificationToken.value + '&next=' + encodeURIComponent(next) %>
<p>Hello,</p>
<p>You recently updated a contact point information on sci.pe to ${unprefix(updateContactPointAction.object.email)}.</p>
<p>To validate the new email address and complete the update click on: <a href="<%= url %>"><%= url %></a>.</p>
<p>Thank you.</p>
`
    }
  };
}

function createResetPasswordEmailMessage(resetPasswordAction) {
  const agentId = getAgentId(resetPasswordAction.agent);

  return {
    '@type': 'EmailMessage',
    sender: {
      '@id': 'bot:scipe',
      name: 'sci.pe',
      email: `mailto:${EMAIL_MESSAGE_SENDER}`
    },
    recipient: remapRole(resetPasswordAction.agent, 'recipient'),
    description: '[sci.pe] Password Reset',
    // prettier-ignore
    text: {
      '@type': 'sa:ejs',
      // Note we only use simple tags as this is to be used with RichTextArea which will convert to markdown
      '@value': `<% var root = parsedReferer ? (parsedReferer.protocol + '//' + ((parsedReferer.port === 80 || parsedReferer.port === 443) ? parsedReferer.hostname : parsedReferer.host)) : '${SCIPE_URL}' %>
<% var url = root + '/reset-password/' + unprefix(getId(unrole(object.agent, 'agent'))) + '?token=' + unprefix(getId(passwordResetToken)) + '&' + 'value=' + passwordResetToken.value %>
<p>Hello,</p>
<p>We received a request to reset the password for the account <strong>${unprefix(agentId)}</strong>.</p>
<p>To reset the password, visit <a href="<%= url %>"><%= url %></a> and enter a new password.</p>
<p>Thank you.</p>
`
    }
  };
}
