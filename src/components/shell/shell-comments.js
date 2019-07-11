import React from 'react';
import PropTypes from 'prop-types';
import StagingDiscussion from '../staging-discussion';
import Counter from '../../utils/counter';

export default class ShellComments extends React.Component {
  static propTypes = {
    journalId: PropTypes.string.isRequired,
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string.isRequired,
    blindingData: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,

    disabled: PropTypes.bool,
    readOnly: PropTypes.bool,

    search: PropTypes.string
  };

  render() {
    const {
      disabled,
      readOnly,
      journalId,
      graphId,
      actionId,
      blindingData,
      search,
      counter
    } = this.props;

    return (
      <div className="shell-comments">
        <StagingDiscussion
          shellified={true}
          journalId={journalId}
          graphId={graphId}
          actionId={actionId}
          counter={counter}
          blindingData={blindingData}
          disabled={disabled}
          readOnly={readOnly}
          search={search}
        />
      </div>
    );
  }
}
