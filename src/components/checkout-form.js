import React from 'react';
import PropTypes from 'prop-types';
import { CardElement, injectStripe } from 'react-stripe-elements';
import { ControlPanel, PaperButton } from '@scipe/ui';

class CheckoutForm extends React.Component {
  static propTypes = {
    mode: PropTypes.oneOf(['subscription', 'payment']).isRequired, // `subscription` (-> stripe.createSource) or `payment` (-> stripe.createToken)
    isProgressing: PropTypes.bool,
    error: PropTypes.instanceOf(Error),
    checkoutTitle: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    checkoutInfo: PropTypes.element,
    stripe: PropTypes.object.isRequired,
    onToken: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
  };

  static defaultProps = {
    checkoutTitle: 'Submit payment'
  };

  constructor(props) {
    super(props);

    this.state = {
      error: null,
      isTokenizing: false,
      canSubmit: false
    };
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleChange = change => {
    const { error } = this.state;
    if (change.complete) {
      this.setState({ error: null, canSubmit: true });
    } else if (change.error) {
      this.setState({
        canSubmit: false,
        error: new Error(change.error.message)
      });
    } else if (error) {
      // clear error
      this.setState({ error: null });
    }
  };

  handleSubmit = e => {
    const { mode, stripe, onToken } = this.props;

    this.setState(
      {
        isTokenizing: true
      },
      () => {
        let p;
        if (mode === 'subscription') {
          p = stripe
            .createSource({
              type: 'card'
            })
            .then(({ source, error }) => {
              if (error) {
                if (this._isMounted) {
                  this.setState({ error: new Error(error.message) });
                }
              } else {
                onToken(source);
              }
            })
            .catch(console.error.bind(console));
        } else {
          p = stripe
            .createToken({
              type: 'card'
            })
            .then(({ token, error }) => {
              if (error) {
                if (this._isMounted) {
                  this.setState({ error: new Error(error.message) });
                }
              } else {
                onToken(token);
              }
            })
            .catch(console.error.bind(console));
        }

        p.then(() => {
          if (this._isMounted) {
            this.setState({
              isTokenizing: false
            });
          }
        });
      }
    );
  };

  render() {
    const {
      onCancel,
      checkoutTitle,
      checkoutInfo,
      error,
      isProgressing
    } = this.props;
    const { error: stripeError, canSubmit, isTokenizing } = this.state;

    return (
      <div className="checkout-form">
        <header className="checkout-form__header">{checkoutTitle}</header>
        {checkoutInfo ? (
          <div className="checkout-form__info">{checkoutInfo}</div>
        ) : null}

        <CardElement onChange={this.handleChange} />
        <ControlPanel error={stripeError || error}>
          <PaperButton onClick={onCancel} disabled={isProgressing}>
            Cancel
          </PaperButton>
          <PaperButton
            disabled={isProgressing || isTokenizing || !canSubmit}
            onClick={this.handleSubmit}
          >
            {isProgressing || isTokenizing ? 'Submitting…' : 'Submit'}
          </PaperButton>
        </ControlPanel>
      </div>
    );
  }
}

export default injectStripe(CheckoutForm);
