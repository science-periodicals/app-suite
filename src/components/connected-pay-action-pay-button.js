import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import PayButton from './pay-button';

class ConnectedPayActionPayButton extends React.Component {
  static propTypes = {
    roles: PropTypes.arrayOf(PropTypes.object).isRequired,
    disabled: PropTypes.bool.isRequired,
    checkoutInfo: PropTypes.element,
    priceSpecification: PropTypes.object.isRequired,
    requestedPrice: PropTypes.number,
    numberOfUnit: PropTypes.number,
    error: PropTypes.instanceOf(Error),
    isProgressing: PropTypes.bool,
    onToken: PropTypes.func.isRequired,
    children: PropTypes.string.isRequired
  };

  constructor(props) {
    super(props);

    this.payButtonRef = React.createRef();
  }

  componentDidUpdate(prevProps) {
    if (
      !this.props.isProgressing &&
      this.props.isProgressing &&
      !this.props.error
    ) {
      this.payButtonRef.current.reset();
    }
  }

  render() {
    const {
      roles,
      disabled,
      checkoutInfo,
      error,
      isProgressing,
      onToken,
      priceSpecification,
      requestedPrice,
      numberOfUnit,
      children
    } = this.props;

    return (
      <PayButton
        ref={this.payButtonRef}
        mode="payment"
        error={error}
        isProgressing={isProgressing}
        roles={roles}
        disabled={disabled}
        checkoutInfo={checkoutInfo}
        raised={true}
        capsule={true}
        priceSpecification={priceSpecification}
        requestedPrice={requestedPrice}
        numberOfUnit={numberOfUnit}
        onToken={onToken}
      >
        {children}
      </PayButton>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => {
      const { action } = props;
      return state.workflowActionStatus[getId(action)];
    },
    status => {
      return {
        isProgressing: status && status.status === 'active',
        error: status && status.error
      };
    }
  )
)(ConnectedPayActionPayButton);
