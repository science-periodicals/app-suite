import React from 'react';
import PropTypes from 'prop-types';
import { Elements } from 'react-stripe-elements';
import {
  xhr,
  SCIPE_FREE_OFFER_ID,
  SCIPE_EXPLORER_OFFER_ID,
  SCIPE_VOYAGER_OFFER_ID,
  SCIPE_EXPLORER_ACTIVATION_PRICE_USD
} from '@scipe/librarian';
import {
  PaperButton,
  PaperButtonLink,
  ButtonMenu,
  MenuItem,
  bemify,
  Modal,
  Card,
  ControlPanel,
  TextLogo
} from '@scipe/ui';
import { getId, unprefix, arrayify } from '@scipe/jsonld';
import PayButton from '../pay-button';
import Notice from '../notice';
import {
  StyleSection,
  StyleSectionHeader,
  StyleSectionTitle
} from './settings';
import CheckoutForm from '../checkout-form';
import InvoiceList from '../invoice-list';

// TODO add invoices

export default class SettingsOrganizationBilling extends React.Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    user: PropTypes.object.isRequired,
    organization: PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      activeSubscribeAction: null,
      customer: null,
      isFetching: false,
      fetchError: null,
      isUpdating: false,
      updateError: null,
      nextOfferId: null
    };

    this.invoiceListRef = React.createRef();
    this.buttonMenuRef = React.createRef();
  }

  componentDidMount() {
    this._isMounted = true;
    this.fetch();
  }

  componentWillUnmount() {
    this._isMounted = false;
    arrayify(this.xhrs).forEach(xhr => xhr.abort());
  }

  componentDidUpdate(prevProps) {
    const { organization } = this.props;
    if (getId(prevProps.organization) !== getId(organization)) {
      this.fetch();
    }
  }

  fetch() {
    arrayify(this.xhrs).forEach(xhr => xhr.abort());

    const { organization } = this.props;

    const xhrActiveSubscribeAction = xhr({
      url: `/stripe/subscription?organization=${unprefix(getId(organization))}`,
      method: 'GET',
      json: true
    });

    const xhrCustomer = xhr({
      url: `/stripe/customer?organization=${unprefix(getId(organization))}`,
      method: 'GET',
      json: true
    });

    this.xhrs = [xhrActiveSubscribeAction.xhr, xhrCustomer.xhr];

    this.setState(
      {
        isFetching: true,
        fetchError: null
      },
      () => {
        Promise.all([xhrActiveSubscribeAction, xhrCustomer])
          .then(([{ body: activeSubscribeAction }, { body: customer }]) => {
            if (this._isMounted) {
              this.setState({
                activeSubscribeAction,
                customer,
                isFetching: false,
                fetchError: null
              });
            }
          })
          .catch(err => {
            if (this._isMounted) {
              this.setState({
                isFetching: false,
                fetchError: err
              });
            }
          });
      }
    );
  }

  handleSelectPlan(nextOfferId) {
    this.setState({ nextOfferId });
  }

  handleUpgrade = sourceToken => {
    const { user, organization } = this.props;
    const { nextOfferId } = this.state;

    const action = {
      '@type': 'SubscribeAction',
      agent: getId(user),
      actionStatus: 'ActiveActionStatus',
      paymentToken: { '@type': 'PaymentToken', value: sourceToken.id },
      object: 'service:scipe',
      expectsAcceptanceOf: nextOfferId,
      instrument: getId(organization)
    };

    this.setState(
      {
        isUpdating: true,
        updateError: null
      },
      () => {
        xhr({
          url: '/action?mode=document',
          method: 'POST',
          body: action,
          json: true
        })
          .then(({ body }) => {
            if (this._isMounted) {
              this.setState({
                isUpdating: false,
                updateError: null,
                nextOfferId: null,
                activeSubscribeAction: body
              });

              if (this.invoiceListRef.current) {
                this.invoiceListRef.current.fetchUpcoming();
                this.invoiceListRef.current.fetchPrevious();
              }
            }
          })
          .catch(err => {
            if (this._isMounted) {
              this.setState({
                isUpdating: false,
                updateError: err
              });
            }
          });
      }
    );
  };

  handleCancel = e => {
    const { user, organization } = this.props;

    // Update the activeSubscribeAction to Free plan
    this.setState(
      {
        isUpdating: true,
        updateError: null
      },
      () => {
        xhr({
          url: '/action',
          method: 'POST',
          body: {
            '@type': 'SubscribeAction',
            agent: getId(user),
            actionStatus: 'ActiveActionStatus',
            expectsAcceptanceOf: SCIPE_FREE_OFFER_ID,
            object: 'service:scipe',
            instrument: getId(organization)
          },
          json: true
        })
          .then(({ body }) => {
            if (this._isMounted) {
              this.setState({
                isUpdating: false,
                updateError: null,
                activeSubscribeAction: body,
                nextOfferId: null
              });

              if (this.invoiceListRef.current) {
                this.invoiceListRef.current.fetchUpcoming();
                this.invoiceListRef.current.fetchPrevious();
              }
            }
          })
          .catch(err => {
            if (this._isMounted) {
              this.setState({
                isUpdating: false,
                updateError: err
              });
            }
          });
      }
    );
  };

  handleCloseModal = e => {
    this.setState({
      nextOfferId: null
    });

    if (this.buttonMenuRef && this.buttonMenuRef.current) {
      this.buttonMenuRef.current.focus();
    }
  };

  render() {
    const { user, organization, disabled } = this.props;
    const {
      isFetching,
      activeSubscribeAction,
      customer,
      isUpdating,
      updateError,
      nextOfferId
    } = this.state;

    if (isFetching && !activeSubscribeAction && !customer) {
      return null;
    }

    const offerId =
      activeSubscribeAction && activeSubscribeAction.expectsAcceptanceOf
        ? getId(activeSubscribeAction.expectsAcceptanceOf)
        : SCIPE_FREE_OFFER_ID;

    const offerIdToName = {
      [SCIPE_FREE_OFFER_ID]: 'free',
      [SCIPE_EXPLORER_OFFER_ID]: 'explorer',
      [SCIPE_VOYAGER_OFFER_ID]: 'voyager'
    };

    const card =
      customer &&
      customer.sources &&
      customer.sources.data &&
      customer.sources.data[0] &&
      customer.sources.data[0].card;

    const bem = bemify('settings-organization-billing');

    return (
      <div className={bem``}>
        <Notice className={bem`__plan-notice`}>
          <span>
            You are currently on <TextLogo />{' '}
            <a href="/get-started/pricing">{offerIdToName[offerId]} plan</a>.
          </span>

          <div className={bem`__plan-controls`}>
            {offerId === SCIPE_FREE_OFFER_ID ? (
              <ButtonMenu focusOnClose={false} ref={this.buttonMenuRef}>
                <span>
                  {offerId === SCIPE_FREE_OFFER_ID ? 'Upgrade' : 'Change'}
                </span>
                <MenuItem
                  disabled={disabled || offerId === SCIPE_EXPLORER_OFFER_ID}
                  onClick={this.handleSelectPlan.bind(
                    this,
                    SCIPE_EXPLORER_OFFER_ID
                  )}
                >
                  Explorer
                </MenuItem>
                <MenuItem
                  disabled={disabled || offerId === SCIPE_VOYAGER_OFFER_ID}
                  onClick={this.handleSelectPlan.bind(
                    this,
                    SCIPE_VOYAGER_OFFER_ID
                  )}
                >
                  Voyager
                </MenuItem>
              </ButtonMenu>
            ) : offerId === SCIPE_EXPLORER_OFFER_ID ? (
              <PaperButton
                disabled={disabled}
                onClick={this.handleSelectPlan.bind(
                  this,
                  SCIPE_VOYAGER_OFFER_ID
                )}
              >
                Upgrade
              </PaperButton>
            ) : null}

            {offerId !== SCIPE_FREE_OFFER_ID && (
              <PaperButton
                disabled={disabled || isUpdating}
                onClick={this.handleSelectPlan.bind(this, SCIPE_FREE_OFFER_ID)}
              >
                Cancel
              </PaperButton>
            )}
          </div>
        </Notice>

        {/* If user is on a paid plan we allow him to update payment info */}
        {card && offerId !== SCIPE_FREE_OFFER_ID ? (
          <StyleSection>
            <StyleSectionHeader>
              <StyleSectionTitle>Payment method</StyleSectionTitle>
            </StyleSectionHeader>
            <div className="settings-organization-billing__card">
              <span>
                {`${card.brand || 'Card'}${
                  card.last4 ? ` ending with ${card.last4}` : ''
                }`}
              </span>

              <UpdatePaymentInfoButton
                user={user}
                planName={offerIdToName[offerId]}
              />
            </div>
          </StyleSection>
        ) : null}

        <StyleSection>
          <StyleSectionHeader>
            <StyleSectionTitle>Invoices</StyleSectionTitle>
          </StyleSectionHeader>

          <InvoiceList
            ref={this.invoiceListRef}
            organizationId={getId(organization)}
          />
        </StyleSection>

        {!!nextOfferId && (
          <Modal>
            <div className={bem`__modal`}>
              <Card>
                <div className={bem`__modal__content`}>
                  {nextOfferId === SCIPE_EXPLORER_OFFER_ID ? (
                    <Elements>
                      <CheckoutForm
                        mode="subscription"
                        isProgressing={isUpdating}
                        error={updateError}
                        checkoutTitle={
                          <span>
                            Submit payment
                            {nextOfferId === SCIPE_EXPLORER_OFFER_ID
                              ? ' information'
                              : ''}{' '}
                            for <TextLogo />{' '}
                            <strong>{offerIdToName[nextOfferId]}</strong> plan
                          </span>
                        }
                        checkoutInfo={
                          <Notice>
                            <span>
                              You will be charged a one time, non refundable,{' '}
                              <strong>
                                ${SCIPE_EXPLORER_ACTIVATION_PRICE_USD}
                              </strong>{' '}
                              activation fee and then billed monthly for usage.
                              See the{' '}
                              <a href="/get-started/pricing">pricing page</a>{' '}
                              for detailed information on usage fees.
                            </span>
                          </Notice>
                        }
                        onToken={this.handleUpgrade}
                        onCancel={this.handleCloseModal}
                      />
                    </Elements>
                  ) : nextOfferId === SCIPE_VOYAGER_OFFER_ID ? (
                    <div>
                      <header className={bem`__modal__header`}>
                        Subscribe to <TextLogo />{' '}
                        <strong>{offerIdToName[nextOfferId]}</strong> plan
                      </header>

                      <p>
                        Subscription to <TextLogo />{' '}
                        <strong>{offerIdToName[nextOfferId]}</strong> plan
                        requires a custom quote.
                      </p>

                      <ControlPanel>
                        <PaperButton onClick={this.handleCloseModal}>
                          Cancel
                        </PaperButton>
                        <PaperButtonLink href="mailto:contact@sci.pe">
                          Request quote
                        </PaperButtonLink>
                      </ControlPanel>
                    </div>
                  ) : (
                    <div>
                      <header className={bem`__modal__header`}>
                        Cancel <TextLogo />{' '}
                        <strong>{offerIdToName[offerId]}</strong> plan
                      </header>

                      <Notice
                        iconName={
                          offerId === SCIPE_VOYAGER_OFFER_ID
                            ? 'warningTriangle'
                            : 'info'
                        }
                      >
                        {offerId === SCIPE_VOYAGER_OFFER_ID ? (
                          <span>
                            Cancelling the plan will disable submissions to all
                            journals covered by the organization and{' '}
                            <em>void activation fees</em>.
                          </span>
                        ) : (
                          <span>
                            Cancelling the plan will disable submissions to all
                            journals covered by the organization.
                          </span>
                        )}
                      </Notice>

                      <p>
                        Alternatively, you can pause the plan and stop usage
                        billing by changing the journal access settings to
                        prevent incoming submissions.
                      </p>

                      <ControlPanel>
                        <PaperButton
                          disabled={isUpdating}
                          onClick={this.handleCloseModal}
                        >
                          Stay on the plan
                        </PaperButton>
                        <PaperButton
                          disabled={isUpdating}
                          onClick={this.handleCancel}
                        >
                          {isUpdating
                            ? 'Cancelling plan…'
                            : 'I understand and wish to cancel the plan'}
                        </PaperButton>
                      </ControlPanel>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </Modal>
        )}
      </div>
    );
  }
}

class UpdatePaymentInfoButton extends React.Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    user: PropTypes.object.isRequired,
    planName: PropTypes.string
  };

  constructor(props) {
    super(props);

    this.payButtonRef = React.createRef();

    this.state = {
      customer: null,
      isUpdating: false,
      error: null
    };
  }

  handleChangeCard = sourceToken => {
    const { user } = this.props;
    const { customer } = this.state;

    // Update the customer `source`
    this.setState(
      {
        isUpdating: true,
        error: null
      },
      () => {
        xhr({
          url: '/action',
          method: 'POST',
          body: {
            '@type': 'UpdateAction',
            agent: getId(user),
            actionStatus: 'CompletedActionStatus',
            object: {
              source: sourceToken.id
            },
            targetCollection: `stripe:${customer.id}`
          },
          json: true
        })
          .then(({ body }) => {
            if (this._isMounted) {
              this.setState({
                isUpdating: false,
                error: null,
                customer: body.result
              });
              this.payButtonRef.current.reset();
            }
          })
          .catch(err => {
            if (this._isMounted) {
              this.setState({
                isUpdating: false,
                error: err
              });
              this.payButtonRef.current.reset();
            }
          });
      }
    );
  };

  render() {
    const { disabled, user, planName } = this.props;
    const { isUpdating, error } = this.state;

    return (
      <PayButton
        ref={this.payButtonRef}
        user={user}
        mode="subscription"
        onToken={this.handleChangeCard}
        disabled={disabled || isUpdating}
        isProgressing={isUpdating}
        error={error}
        checkoutTitle="Update payment method"
        checkoutInfo={
          <Notice>
            <span>
              Enter a new card information for your <TextLogo />{' '}
              <strong>{planName}</strong> plan subscription
            </span>
          </Notice>
        }
      >
        Change card
      </PayButton>
    );
  }
}
