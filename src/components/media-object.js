import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getId } from '@scipe/jsonld';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { Value } from '@scipe/ui';

class MediaObject extends Component {
  static propTypes = {
    id: PropTypes.string,
    resource: PropTypes.object.isRequired,
    content: PropTypes.object,
    isPrinting: PropTypes.bool
  };

  static defaultProps = {
    resource: {},
    content: {}
  };

  render() {
    const { id, content } = this.props;

    return (
      <Value escHtml={false} id={id} className="media-object">
        {content.document && content.document.body.innerHTML}
      </Value>
    );
  }
}

function makeSelector() {
  return createSelector(
    (state, props) => {
      if (props.resource && props.resource.encoding) {
        for (let encoding of props.resource.encoding) {
          const encodingId = getId(encoding);
          if (
            encodingId in state.contentMap &&
            state.contentMap[encodingId].document
          ) {
            return state.contentMap[encodingId];
          }
        }
      }
    },
    content => {
      return { content };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default connect(makeMapStateToProps)(MediaObject);
