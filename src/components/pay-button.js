import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';
import { Elements } from 'react-stripe-elements';
import { getId } from '@scipe/jsonld';
import { PaperButton, ButtonMenu, MenuItem, Modal, Card } from '@scipe/ui';
import CheckoutForm from './checkout-form';
import { isFree } from '../utils/payment-utils';

// TODO bring back native payment request API support (for now we don't use it as error reporting / progress is easier to do with the modal)

export default class PayButton extends React.Component {
  static propTypes = {
    'data-testid': PropTypes.string,
    children: PropTypes.any.isRequired,
    mode: PropTypes.oneOf(['subscription', 'payment']).isRequired, // `subscription` (-> stripe.createSource) or `payment` (-> stripe.createToken)
    // One of `user` or `roles` must be provided
    user: PropTypes.object,
    roles: PropTypes.arrayOf(PropTypes.object),
    capsule: PropTypes.bool,
    raised: PropTypes.bool,
    disabled: PropTypes.bool,
    checkoutTitle: PropTypes.string,
    checkoutInfo: PropTypes.element,
    isProgressing: PropTypes.bool,
    priceSpecification: PropTypes.object, // TODO make required
    requestedPrice: PropTypes.number,
    numberOfUnit: PropTypes.number,
    error: PropTypes.instanceOf(Error),
    onToken: PropTypes.func.isRequired, // called with `(token, role)` if Card is OK
    onCancel: PropTypes.func
  };

  static defaultProps = {
    roles: [],
    numberOfUnit: 1,
    onCancel: noop
  };

  constructor(props) {
    super(props);

    this.state = {
      modal: false,
      role: null
    };
  }

  handleSubmitToken = token => {
    const { role } = this.state;
    const { onToken } = this.props;
    onToken(token, role);
  };

  handleClick(role) {
    const {
      priceSpecification,
      requestedPrice,
      numberOfUnit,
      onToken
    } = this.props;

    if (isFree(priceSpecification, { requestedPrice, numberOfUnit })) {
      onToken(null, role);
      this.setState({ modal: false, role: null });
    } else {
      this.setState({ modal: true, role });
    }
  }

  handleCloseModal = () => {
    this.setState({ modal: false, role: null });
    this.props.onCancel();
  };

  reset = () => {
    this.handleCloseModal();
  };

  render() {
    const {
      mode,
      children,
      user,
      roles,
      capsule,
      raised,
      disabled,
      checkoutTitle,
      checkoutInfo,
      isProgressing,
      error
    } = this.props;
    const { modal } = this.state;

    return (
      <Fragment>
        {roles.length > 1 ? (
          <ButtonMenu
            data-testid={this.props['data-testid']}
            className="pay-button"
            capsule={capsule}
            raised={raised}
            disabled={disabled}
          >
            <span>{children}</span>
            {roles.map(role => (
              <MenuItem
                key={getId(role)}
                onClick={this.handleClick.bind(this, role)}
                disabled={disabled}
              >
                {role.name ? `${role.name} (${role.roleName})` : role.roleName}
              </MenuItem>
            ))}
          </ButtonMenu>
        ) : (
          <PaperButton
            data-testid={this.props['data-testid']}
            className="pay-button"
            capsule={capsule}
            raised={raised}
            disabled={disabled}
            onClick={this.handleClick.bind(this, roles[0] || user)}
          >
            {children}
          </PaperButton>
        )}
        {modal && (
          <Modal>
            <div className="pay-button__modal">
              <Card>
                <div className="pay-button__modal__content">
                  <Elements>
                    <CheckoutForm
                      mode={mode}
                      isProgressing={isProgressing}
                      error={error}
                      checkoutTitle={checkoutTitle}
                      checkoutInfo={checkoutInfo}
                      onToken={this.handleSubmitToken}
                      onCancel={this.handleCloseModal}
                    />
                  </Elements>
                </div>
              </Card>
            </div>
          </Modal>
        )}
      </Fragment>
    );
  }
}
