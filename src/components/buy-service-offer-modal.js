import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import {
  Card,
  ControlPanel,
  PaperButton,
  ServicePicker,
  Price,
  Strong,
  Modal
} from '@scipe/ui';
import { getId, arrayify } from '@scipe/jsonld';
import {
  escapeLucene,
  remapRole,
  getStageActions,
  getEligibleOffer
} from '@scipe/librarian';
import {
  createGraphDataSelector,
  createActionMapSelector,
  createGraphAclSelector
} from '../selectors/graph-selectors';
import { buyServiceOffer } from '../actions/service-action-creators';
import Search from './search';
import PayButton from './pay-button';
import { getWorkflowAction, getSortedStages } from '../utils/workflow';
import Notice from './notice';
import { clearErrorAndStatusByKey } from '../actions/ui-action-creators';

/**
 * For now this is only used for author services
 */
class BuyServiceOfferModal extends React.Component {
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    graphId: PropTypes.string.isRequired,
    annotation: PropTypes.object,

    // redux
    authorRoles: PropTypes.arrayOf(PropTypes.object),
    createReleaseAction: PropTypes.object,
    customerType: PropTypes.oneOf(['Enduser', 'RevisionAuthor']),
    potentialServiceIds: PropTypes.arrayOf(PropTypes.string),
    buyServiceOffer: PropTypes.func.isRequired,
    isBuying: PropTypes.bool,
    buyError: PropTypes.instanceOf(Error),
    clearErrorAndStatusByKey: PropTypes.func.isRequired
  };

  static defaultProps = {
    potentialServiceIds: []
  };

  static getDerivedStateFromProps(props, state) {
    if (props.annotation !== state.lastAnnotation) {
      return {
        selectedServiceId: null,
        lastAnnotation: props.annotation
      };
    }

    return null;
  }

  constructor(props) {
    super(props);
    this.state = {
      selectedServiceId: null,
      lastAnnotation: props.annotation
    };
  }

  handleSelect = (serviceId, nextChecked) => {
    this.setState({ selectedServiceId: nextChecked ? serviceId : null });
  };

  handlePlaceOrder(
    service,
    offer,
    token, // can be `null` if service was free
    role
  ) {
    const { graphId, createReleaseAction, buyServiceOffer } = this.props;

    if (service) {
      buyServiceOffer(service, offer, {
        agent: remapRole(role, 'agent', { dates: false }),
        graphId,
        paymentToken: token
          ? { '@type': 'PaymentToken', value: token.id }
          : undefined,
        instrumentOf: getId(createReleaseAction)
      }).then(buyAction => {
        if (buyAction.actionStatus === 'CompletedActionStatus') {
          this.props.onClose();
        }
      });
    }
  }

  handleCancelPayment = () => {
    const { annotation, clearErrorAndStatusByKey } = this.props;
    clearErrorAndStatusByKey(getId(annotation.selector.node));
  };

  render() {
    const {
      onClose,
      potentialServiceIds,
      customerType,
      authorRoles,
      isBuying,
      buyError
    } = this.props;
    const { selectedServiceId } = this.state;

    return (
      <Search
        index="service"
        query={potentialServiceIds
          .map(serviceId => `@id: ${escapeLucene(serviceId)}`)
          .join(' OR ')}
        hydrate="provider"
      >
        {({ items, droplets, error, isActive }) => {
          const potentialServices = items.map(item => {
            if (getId(item.provider) in droplets) {
              Object.assign({}, item, {
                provider: droplets[getId(item.provider)]
              });
            }
            return item;
          });

          const service = potentialServices.find(
            service => getId(service) === selectedServiceId
          );

          const offer = getEligibleOffer(service, customerType);

          const canBuy = !!(selectedServiceId && offer);

          return (
            <Modal>
              <Card className="buy-service-offer-modal">
                <div className="buy-service-offer-modal__header">
                  <h3 className="buy-service-offer-modal__title">
                    Author Services
                  </h3>
                  <div className="buy-service-offer-modal__description">
                    <span>Select an editing support offer.</span>
                  </div>
                </div>
                <ServicePicker
                  customerType={customerType}
                  potentialServices={potentialServices}
                  services={[selectedServiceId]}
                  onSelect={this.handleSelect}
                />

                {!!(service && offer) && (
                  <div className="buy-service-offer-modal__summary">
                    <span className="buy-service-offer-modal__summary-label">
                      Order Summary
                    </span>

                    {offer.priceSpecification &&
                    offer.priceSpecification.price > 0 ? (
                      <span>
                        <strong>
                          <Price
                            priceSpecification={offer.priceSpecification}
                            numberOfUnit={1}
                            fallback="$0"
                          />
                        </strong>{' '}
                        will be added to your invoice for{' '}
                        <Strong>{service.name}</Strong>.
                      </span>
                    ) : (
                      <span>
                        <Strong>{service.name}</Strong> is free
                      </span>
                    )}
                  </div>
                )}
                <ControlPanel>
                  <PaperButton onClick={onClose}>Cancel</PaperButton>
                  <PayButton
                    mode="payment"
                    roles={authorRoles}
                    disabled={!canBuy}
                    isProgressing={isBuying}
                    error={buyError}
                    priceSpecification={offer && offer.priceSpecification}
                    onToken={this.handlePlaceOrder.bind(this, service, offer)}
                    checkoutInfo={
                      offer ? (
                        <Notice iconName="money">
                          <span>Amount due:&nbsp;</span>
                          <strong>
                            <Price
                              priceSpecification={offer.priceSpecification}
                              fallback="$0"
                              numberOfUnit={1}
                            />
                          </strong>
                        </Notice>
                      ) : (
                        undefined
                      )
                    }
                    onCancel={this.handleCancelPayment}
                  >
                    Place order
                  </PayButton>
                </ControlPanel>
              </Card>
            </Modal>
          );
        }}
      </Search>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    (state, props) => props.annotation,
    createGraphAclSelector(),
    createGraphDataSelector(),
    createActionMapSelector(),
    (state, props) => {
      const instrumentOfId = getId(props.annotation.selector.node);
      return state.buyServiceOfferStatusByInstrumentOfId[instrumentOfId];
    },
    (
      user,
      annotation = {},
      acl,
      { graph, nodeMap = {} } = {},
      actionMap = {},
      buyStatus
    ) => {
      // See <AnnotableEncoding /> for the selector definition
      const actionId = getId(annotation.selector.node);
      const createReleaseAction = getWorkflowAction(actionId, {
        user,
        acl,
        actionMap
      });

      const potentialServiceIds = arrayify(
        createReleaseAction && createReleaseAction.potentialService
      ).map(getId);

      // get customerType: either `Enduser` or `RevisionAuthor`
      let customerType = 'Enduser';
      const stages = getSortedStages(actionMap);
      for (const stage of stages) {
        const actions = getStageActions(stage);
        if (
          actions.some(
            action =>
              action['@type'] === 'TypesettingAction' &&
              getId(action.serviceOutputOf) &&
              potentialServiceIds.includes(getId(action.serviceOutputOf))
          )
        ) {
          customerType = 'RevisionAuthor';
          break;
        }
      }

      const activeRoles = acl.getActiveRoles(user);
      const authorRoles = activeRoles.filter(
        role => role.roleName === 'author'
      );

      return {
        authorRoles,
        potentialServiceIds,
        createReleaseAction,
        customerType,
        isBuying: !!(buyStatus && buyStatus.isActive),
        buyError: buyStatus && buyStatus.error
      };
    }
  ),
  { buyServiceOffer, clearErrorAndStatusByKey }
)(BuyServiceOfferModal);
