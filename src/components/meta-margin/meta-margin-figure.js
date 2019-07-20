import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { getId, unprefix } from '@scipe/jsonld';
import { Cite, Span, getIconNameFromSchema } from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import Node from '../node';

/**
 * This is to be called by `MetaMarginMixedData`
 * Render label (`alternateName`) & title (`name`) of a resource specified by `this.props.value['@id']`
 * Note: Despite the name, this is used for Resources (Image, Audio, Video, TextBox etc.)  _and_ Tables.
 */
export default class MetaMarginFigure extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    overwriteNodeMap: PropTypes.object,
    value: PropTypes.shape({
      '@id': PropTypes.string, // resourceId
      $value: PropTypes.any,
      order: PropTypes.number,
      className: PropTypes.string,
      type: PropTypes.oneOf(['link-part'])
    })
  };

  render() {
    const { id, graphId, className, value, overwriteNodeMap } = this.props;

    return (
      <Node
        key={getId(value)}
        graphId={graphId}
        node={getId(value)}
        nodeMap={overwriteNodeMap}
        id={id}
      >
        {resource => {
          return (
            <div className={classNames('meta-margin-figure', className)}>
              <Iconoclass
                iconName={getIconNameFromSchema(resource['@type'])}
                size="12px"
              />
              <Cite className="meta-margin__link-target meta-margin__link-target--citation">
                {resource.alternateName || unprefix(getId(resource))}
              </Cite>
              {resource.name && (
                <span>
                  {' '}
                  (<Span>{resource.name}</Span>)
                </span>
              )}
            </div>
          );
        }}
      </Node>
    );
  }
}
