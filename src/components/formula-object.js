import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { getId } from '@scipe/jsonld';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { Value } from '@scipe/ui';

// Note: we don't need to rescale as equations are rendered in SVG and we use
// CSS with max-width:100% and object-fit:contain to do the scaling. This may have
// to change if we switch to HTML equation rendering

class FormulaObject extends React.PureComponent {
  static propTypes = {
    id: PropTypes.string,
    resource: PropTypes.object.isRequired,
    content: PropTypes.shape({
      html: PropTypes.string
    }),
    isPrinting: PropTypes.bool
  };

  static defaultProps = {
    resource: {},
    content: {}
  };

  constructor(props) {
    super(props);

    this.root = React.createRef();
  }

  render() {
    const { content, isPrinting } = this.props;
    return (
      <div
        id={this.props.id}
        className={classNames('formula-object', {
          'formula-object--print': isPrinting
        })}
      >
        <Value escHtml={false}>{content.html}</Value>
      </div>
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
            state.contentMap[encodingId].html
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

export default connect(makeMapStateToProps)(FormulaObject);
