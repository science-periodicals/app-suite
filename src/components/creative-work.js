import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import identity from 'lodash/identity';
import { NoRenderingNotice } from './notice';
import Counter from '../utils/counter';

export default class CreativeWork extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    nodeMap: PropTypes.object,
    resource: PropTypes.object.isRequired,
    embedded: PropTypes.bool,
    shellified: PropTypes.bool,
    blindingData: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool
  };

  static defaultProps = {
    createSelector: identity
  };

  render() {
    const { id, className } = this.props;

    return (
      <div id={id} className={classNames('creative-work', className)}>
        <NoRenderingNotice />
      </div>
    );
  }
}
