import React from 'react';
import PropTypes from 'prop-types';
import { RdfaPersonOrOrganization, getDisplayName } from '@scipe/ui';
import ScrollLink from './scroll-link';
import Node from './node';

/**
 * This is used in the Shell to render a role affiliation
 */
export default class RoleAffiliation extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    blindingData: PropTypes.object,
    nodeMap: PropTypes.object,
    affiliation: PropTypes.oneOfType([PropTypes.object, PropTypes.string])
      .isRequired, // Organization (or subclass thereof)
    backlink: PropTypes.shape({
      pathname: PropTypes.string.isRequired,
      search: PropTypes.string,
      hash: PropTypes.string.isRequired
    }),
    backlinkTextContent: PropTypes.string
  };

  render() {
    const {
      graphId,
      affiliation,
      nodeMap,
      blindingData,
      backlink,
      backlinkTextContent
    } = this.props;

    const isBlinded = !blindingData.visibleRoleNames.has('author');

    return (
      <Node graphId={graphId} node={affiliation} nodeMap={nodeMap} embed="*">
        {affiliation => (
          <div className="role-affiliation">
            {!!backlink && (
              <ScrollLink
                className="role-affiliation__symbol"
                to={backlink}
                preventLinkInterceptor={true}
              >
                {backlinkTextContent}
              </ScrollLink>
            )}
            <RdfaPersonOrOrganization
              object={affiliation}
              blindedName={
                isBlinded
                  ? getDisplayName(blindingData, affiliation, {
                      subject: 'organization',
                      alwaysPrefix: true
                    })
                  : undefined
              }
            />
          </div>
        )}
      </Node>
    );
  }
}
