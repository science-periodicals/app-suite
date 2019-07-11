import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Value } from '@scipe/ui';
import Node from './node';
import ScrollLink from './scroll-link';

export default class Footnote extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    resourceId: PropTypes.string.isRequired,
    nodeMap: PropTypes.object,
    comment: PropTypes.oneOfType([PropTypes.object, PropTypes.string])
      .isRequired,
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
      comment,
      nodeMap,
      backlink,
      backlinkTextContent
    } = this.props;

    return (
      <Node graphId={graphId} node={comment} nodeMap={nodeMap}>
        {comment => (
          <div className="footnote">
            <span className="footnote__symbol">
              {backlink ? (
                <ScrollLink to={backlink} preventLinkInterceptor={true}>
                  {backlinkTextContent || comment.noteIdentifier}
                </ScrollLink>
              ) : (
                comment.identifier
              )}
            </span>
            <Value>{comment.text}</Value>
          </div>
        )}
      </Node>
    );
  }
}
