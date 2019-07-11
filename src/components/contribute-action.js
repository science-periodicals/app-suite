import React from 'react';
import PropTypes from 'prop-types';
import { Value } from '@scipe/ui';
import ScrollLink from './scroll-link';
import Node from './node';

/**
 * This is used in the Shell to render author contribution notes
 */
export default class ContributeAction extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    nodeMap: PropTypes.object,
    action: PropTypes.oneOfType([
      PropTypes.shape({
        '@type': PropTypes.oneOf(['ContributeAction'])
      }),
      PropTypes.string
    ]).isRequired,
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
      action,
      nodeMap,
      backlink,
      backlinkTextContent
    } = this.props;

    return (
      <Node graphId={graphId} node={action} nodeMap={nodeMap}>
        {action => (
          <div className="contribute-action">
            {!!backlink && (
              <ScrollLink
                className="contribute-action__symbol"
                to={backlink}
                preventLinkInterceptor={true}
              >
                {backlinkTextContent || action.identifier}
              </ScrollLink>
            )}
            <Value>{action.description}</Value>
          </div>
        )}
      </Node>
    );
  }
}
