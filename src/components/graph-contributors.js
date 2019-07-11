import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getAgent, getAgentId } from '@scipe/librarian';
import { arrayify, getId, unprefix, getNodeMap } from '@scipe/jsonld';
import { Span, getDisplayName, Hyperlink } from '@scipe/ui';
import Node from './node';
import ContributorInfoMenu from './contributor-info-menu';

export default class GraphContributors extends Component {
  static propTypes = {
    fromJournalSubdomain: PropTypes.bool,
    graph: PropTypes.object.isRequired,
    roleNames: PropTypes.object, // only needed if fromMainEntity is false
    blindingData: PropTypes.object.isRequired,
    fromMainEntity: PropTypes.bool // `true` in sifter and explorer, `false` in dashboard
  };

  renderMainEntityAuthors() {
    const { graph, blindingData } = this.props;

    const { visibleRoleNames } = blindingData;

    const canViewIdentity = visibleRoleNames.has('author');

    return (
      <Node
        graphId={getId(graph)}
        node={graph.mainEntity}
        embed={['author']}
        omit={['potentialAction']}
        nodeMap={
          graph['@graph'] && graph['@graph'].length
            ? getNodeMap(graph)
            : undefined
        }
      >
        {mainEntity => {
          let authors = arrayify(mainEntity.author);

          let etal;
          if (authors.length >= 4) {
            authors = authors.slice(0, 1);
            etal = true;
          }

          return (
            <ul className="graph-contributors">
              {authors.map(role => {
                const agent = getAgent(role);

                let name;
                if (canViewIdentity) {
                  if (agent.name) {
                    name = <Span>{agent.name}</Span>;
                  } else if (agent.familyName && agent.givenName) {
                    name = (
                      <span>
                        <Span>{agent.givenName}</Span>{' '}
                        <Span>{agent.familyName}</Span>
                      </span>
                    );
                  } else if (agent.familyName) {
                    name = <Span>{agent.familyName}</Span>;
                  } else {
                    name = unprefix(getId(agent));
                  }
                } else {
                  name = getDisplayName(blindingData, role, {
                    alwaysPrefix: true,
                    roleName: 'author'
                  });
                }

                return (
                  <li key={getId(role)}>
                    {name}
                    {!!canViewIdentity && <ContributorInfoMenu role={role} />}
                  </li>
                );
              })}
              {etal ? <li key="etal">et al.</li> : null}
            </ul>
          );
        }}
      </Node>
    );
  }

  renderGraphParticipants() {
    const { graph, roleNames, blindingData, fromJournalSubdomain } = this.props;

    const { visibleRoleNames } = blindingData;

    const roles = arrayify(graph.author)
      .concat(
        arrayify(graph.contributor),
        arrayify(graph.reviewer),
        arrayify(graph.editor),
        arrayify(graph.producer)
      )
      .filter(role => role.roleName);

    const visibleRoles = roles.filter(role =>
      visibleRoleNames.has(role.roleName)
    );

    const visibleRolesByAgentId = visibleRoles.reduce(
      (visibleRolesByAgentId, role) => {
        const agentId = getAgentId(role);
        if (!(agentId in visibleRolesByAgentId)) {
          visibleRolesByAgentId[agentId] = {};
        }
        visibleRolesByAgentId[agentId][role.name || role.roleName] = true;
        return visibleRolesByAgentId;
      },
      {}
    );

    const anonymousRoleCounts = roles
      .filter(role => !visibleRoleNames.has(role.roleName))
      .reduce((counts, role) => {
        const title = role.name || role.roleName;
        if (!(title in counts)) {
          counts[title] = 0;
        }
        counts[title]++;
        return counts;
      }, {});

    const userTitles = Object.keys(roleNames).reduce((userTitles, roleName) => {
      userTitles.add(roleName);
      Object.keys(roleNames[roleName]).forEach(subRoleName => {
        userTitles.add(subRoleName);
      });
      return userTitles;
    }, new Set());

    return (
      <ul className="graph-contributors">
        {Object.keys(visibleRolesByAgentId)
          .sort()
          .map(agentId => {
            const username = unprefix(agentId);
            return (
              <li key={username}>
                <Hyperlink
                  page="user"
                  role={agentId}
                  reset={fromJournalSubdomain}
                >
                  {username}
                </Hyperlink>{' '}
                <span>{`(${Object.keys(visibleRolesByAgentId[agentId])
                  .sort()
                  .join(', ')})`}</span>
              </li>
            );
          })}
        {Object.keys(anonymousRoleCounts)
          .sort()
          .map(title => {
            const count = anonymousRoleCounts[title];
            return (
              <li key={title}>
                {`${count} anonymous ${title}${count > 1 ? 's' : ''}${
                  userTitles.has(title)
                    ? count > 1
                      ? ' (including you)'
                      : ' (you)'
                    : ''
                }`}
              </li>
            );
          })}
      </ul>
    );
  }

  render() {
    const { fromMainEntity } = this.props;

    if (fromMainEntity) {
      return this.renderMainEntityAuthors();
    } else {
      return this.renderGraphParticipants();
    }
  }
}
