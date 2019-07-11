import React from 'react';
import PropTypes from 'prop-types';
import { Div } from '@scipe/ui';

export default class PreSubmissionComment extends React.Component {
  static propTypes = {
    comment: PropTypes.object
  };
  static defaultProps = {
    comment: {}
  };

  render() {
    const { comment: { text } } = this.props;

    return (
      <div>
        {text ? (
          <Div className="pre-submission-comment">{text}</Div>
        ) : (
          <div>
            The journal does not accept submission yet. Please check back later.
          </div>
        )}
      </div>
    );
  }
}
