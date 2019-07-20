import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { getRootPart } from '@scipe/librarian';
import { getId, unrole } from '@scipe/jsonld';
import { Cite, Span } from '@scipe/ui';

import Node from '../node';

/**
 * This is to be called by `MetaMarginMixedData`
 */
export default class MetaMarginCitation extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    overwriteNodeMap: PropTypes.object,
    value: PropTypes.shape({
      '@id': PropTypes.string,
      $value: PropTypes.any,
      order: PropTypes.number,
      className: PropTypes.string,
      type: PropTypes.oneOf([
        'link-citation',
        'link-part',
        'link-orcid',
        'abbr'
      ])
    })
  };

  render() {
    const { id, graphId, className, value, overwriteNodeMap } = this.props;

    return (
      <Node
        key={getId(value)}
        graphId={graphId}
        node={getId(value)}
        embed={['citation', 'isPartOf']}
        nodeMap={overwriteNodeMap}
        className={classNames('meta-margin-citation', className)}
        id={id}
      >
        {citation => {
          // in case of point citation citation will be a role
          citation = unrole(citation, 'citation');
          const journal = getRootPart(citation);
          const journalName =
            journal && (journal.alternateName || journal.name);

          return (
            <span>
              <Cite className="meta-margin__link-target meta-margin__link-target--citation">
                {citation.name ||
                  citation.description ||
                  citation.url ||
                  getId(citation)}
              </Cite>
              {journalName && (
                <span>
                  {' '}
                  (<Span>{journalName}</Span>)
                </span>
              )}
            </span>
          );
        }}
      </Node>
    );
  }
}
