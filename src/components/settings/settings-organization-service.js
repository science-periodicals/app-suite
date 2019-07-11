import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import omit from 'lodash/omit';
import { getId, textify } from '@scipe/jsonld';
import {
  Card,
  ServicePicker,
  ServicePreview,
  Tooltip,
  PaperButton,
  PaperSwitch,
  PaperInput,
  RichTextarea,
  PaperSelect,
  PaperCheckbox,
  PaperActionButton,
  ControlPanel,
  Modal,
  bemify,
  Spinner,
  withOnSubmit
} from '@scipe/ui';
import { createId, escapeLucene } from '@scipe/librarian';
import Iconoclass from '@scipe/iconoclass';
import {
  fetchOrganizationServices,
  createService,
  activateService,
  deactivateService,
  updateService,
  archiveService
} from '../../actions/service-action-creators';
import { addDroplets } from '../../actions/droplet-action-creators';
import {
  StyleFormSetList,
  StyleFormSetListItem,
  StyleFormSetListItemGroup,
  StyleGroup
} from './settings';
import Notice from '../notice';
import Search from '../search';
import Droplet from '../droplet';

const ControlledPaperInput = withOnSubmit(PaperInput);

class SettingsOrganizationService extends React.Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    organization: PropTypes.object,

    // redux
    services: PropTypes.arrayOf(PropTypes.object),
    fetchOrganizationServices: PropTypes.func.isRequired,
    createService: PropTypes.func.isRequired,
    activateService: PropTypes.func.isRequired,
    deactivateService: PropTypes.func.isRequired,
    updateService: PropTypes.func.isRequired,
    archiveService: PropTypes.func.isRequired,
    addDroplets: PropTypes.func.isRequired
  };

  static getDerivedStateFromProps(props, state) {
    if (props.organization !== state.lastOrganization) {
      return {
        openServiceId: null,
        newService: null,
        selectedBrokeredService: null,
        isSelectProviderModalOpen: false,
        lastOrganization: props.organization
      };
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = {
      openServiceId: null,
      newService: null,
      selectedBrokeredService: null,
      isSelectProviderModalOpen: false,
      lastOrganization: props.organization
    };
  }

  componentDidMount() {
    const { organization, fetchOrganizationServices } = this.props;
    fetchOrganizationServices(getId(organization));
  }

  componentDidUpdate(prevProps) {
    const { organization, fetchOrganizationServices } = this.props;
    if (getId(organization) !== getId(prevProps.organization)) {
      fetchOrganizationServices(getId(organization));
    }
  }

  handleCreateService = () => {
    const { organization } = this.props;
    const newServiceId = createId('blank')['@id'];
    this.setState({
      openServiceId: newServiceId,
      newService: {
        '@id': newServiceId,
        serviceType: 'typesetting',
        audience: {
          '@type': 'Audience',
          audienceType: 'user',
          audienceScope: getId(organization)
        },
        // Default to free
        offers: {
          '@type': 'Offer',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: 0,
            priceCurrency: 'USD',
            unitText: 'submission',
            valueAddedTaxIncluded: false,
            platformFeesIncluded: false
          }
        }
      }
    });
  };

  handleToggle(serviceId, e) {
    e.preventDefault();
    this.setState({
      openServiceId: this.state.openServiceId === serviceId ? null : serviceId
    });
  }

  handleClose = e => {
    const { openServiceId, newService } = this.state;

    this.setState({
      openServiceId: null,
      newService: openServiceId === getId(newService) ? null : newService
    });
  };

  handleSubmit = e => {
    const { organization } = this.props;
    const { newService } = this.state;
    this.props.createService(getId(organization), newService);
    this.setState({
      openServiceId: null,
      newService: null
    });
  };

  handleToggleActivate(serviceId) {
    const { services, organization } = this.props;
    const service = services.find(service => getId(service) === serviceId);
    if (service) {
      const isActive = service.serviceStatus === 'ActiveServiceStatus';
      if (isActive) {
        // deactivate
        this.props.deactivateService(getId(organization), serviceId);
      } else {
        // activate
        this.props.activateService(getId(organization), serviceId);
      }
    }
  }

  handleArchive(serviceId, e) {
    e.preventDefault();
    const { archiveService, organization } = this.props;

    archiveService(getId(organization), serviceId);
  }

  handleChange = e => {
    const { organization, services } = this.props;
    const { openServiceId, newService } = this.state;

    const service =
      services.find(service => getId(service) === openServiceId) || newService;

    const key = e.target.name;
    const value = e.target.value;
    let upd;

    switch (key) {
      case 'name':
      case 'description':
        upd = { [key]: value };
        break;

      case 'addOn':
      case 'price': {
        let offer = service.offers;
        if (!offer) {
          offer = {
            '@type': 'Offer'
          };
        }

        if (key === 'addOn') {
          if (value) {
            offer = Object.assign({}, offer, {
              addOn: {
                '@type': 'Offer',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: 0,
                  priceCurrency: 'USD',
                  unitText: 'submission',
                  valueAddedTaxIncluded: false,
                  platformFeesIncluded: false
                },
                eligibleCustomerType: 'RevisionAuthor'
              }
            });
          } else {
            offer = omit(offer, ['addOn']);
          }
        } else if (key === 'price') {
          const price = parseFloat(e.target.value);
          if (!offer.priceSpecification) {
            offer = Object.assign({}, offer, {
              priceSpecification: {
                '@type': 'UnitPriceSpecification',
                priceCurrency: 'USD',
                unitText: 'submission',
                valueAddedTaxIncluded: false,
                platformFeesIncluded: false
              }
            });
          }
          offer = Object.assign({}, offer, {
            priceSpecification: Object.assign({}, offer.priceSpecification, {
              price
            })
          });
          if (price < 1e-6) {
            offer = omit(offer, ['addOn']);
          }
        }

        upd = { offers: offer };
        break;
      }
    }

    if (openServiceId && openServiceId === getId(newService)) {
      this.setState({
        newService: Object.assign({}, newService, upd)
      });
    } else {
      this.props.updateService(getId(organization), getId(service), upd);
    }
  };

  handleOpenSelectProviderModal = e => {
    this.setState({ isSelectProviderModalOpen: true });
  };

  handleCloseSelectProviderModal = e => {
    this.setState({ isSelectProviderModalOpen: false });
  };

  handleRemoveBrokeredService = e => {
    const { updateService, organization, services } = this.props;
    const { openServiceId, newService } = this.state;

    const service =
      services.find(service => getId(service) === openServiceId) || newService;

    if (newService) {
      this.setState({
        newService: Object.assign(omit(newService, ['brokeredService']), {
          provider: getId(organization)
        })
      });
    } else {
      updateService(getId(organization), getId(service), {
        provider: getId(organization),
        brokeredService: null
      });
    }
  };

  handleSelectProvider = (potentialServices, serviceId, nextChecked) => {
    const service = potentialServices.find(
      service => getId(service) === serviceId
    );
    this.setState({ selectedBrokeredService: nextChecked ? service : null });
  };

  handleSubmitProvider = e => {
    const { updateService, organization, services, addDroplets } = this.props;
    const { selectedBrokeredService, openServiceId, newService } = this.state;

    const service =
      services.find(service => getId(service) === openServiceId) || newService;

    // we add the selectedBrokeredService so that after the update we have the brokered service in the redux store
    addDroplets({ [getId(selectedBrokeredService)]: selectedBrokeredService });

    if (newService) {
      this.setState({
        newService: Object.assign({}, newService, {
          provider: getId(selectedBrokeredService.provider),
          brokeredService: getId(selectedBrokeredService)
        })
      });
    } else {
      updateService(getId(organization), getId(service), {
        provider: getId(selectedBrokeredService.provider),
        brokeredService: getId(selectedBrokeredService)
      });
    }
    this.setState({ isSelectProviderModalOpen: false });
  };

  render() {
    const { disabled, readOnly, organization, services } = this.props;
    const {
      openServiceId,
      newService,
      isSelectProviderModalOpen,
      selectedBrokeredService
    } = this.state;

    if (!organization) {
      return null;
    }

    const isActive = false; // TODO

    const service =
      services.find(service => getId(service) === openServiceId) || newService;

    let price, addOn;
    if (service) {
      price =
        service.offers &&
        service.offers.priceSpecification &&
        service.offers.priceSpecification.price;

      addOn = service.offers && service.offers.addOn;
    }

    const bem = bemify('settings-organization-service');

    return (
      <section className={bem``}>
        <h2 className={bem`__title`}>Services</h2>

        {(!!services.length || !!newService) && (
          <StyleFormSetList>
            {services.concat(newService || []).map(service => (
              <StyleFormSetListItem
                active={getId(service) === openServiceId}
                key={getId(service)}
              >
                <StyleFormSetListItemGroup>
                  <Spinner progressMode={isActive ? 'spinUp' : 'none'}>
                    <Iconoclass
                      iconName={
                        getId(service) === openServiceId ? 'pencil' : 'none'
                      }
                      behavior="button"
                      onClick={this.handleToggle.bind(this, getId(service))}
                      size="16px"
                    />
                  </Spinner>
                  <a
                    href="#"
                    className={bem`__toggle-link`}
                    onClick={this.handleToggle.bind(this, getId(service))}
                  >
                    {textify(service.name) || 'Untitled Service'}
                  </a>
                </StyleFormSetListItemGroup>

                <StyleFormSetListItemGroup align="right">
                  <Tooltip displayText="Activate Service">
                    <PaperSwitch
                      id={`switch-service-${getId(service)}`}
                      disabled={disabled || !!newService}
                      checked={service.serviceStatus === 'ActiveServiceStatus'}
                      onClick={this.handleToggleActivate.bind(
                        this,
                        getId(service)
                      )}
                    />
                  </Tooltip>
                  <Tooltip displayText="Archive Service">
                    <Iconoclass
                      iconName="trash"
                      disabled={disabled || !!newService}
                      behavior="button"
                      onClick={this.handleArchive.bind(this, getId(service))}
                    />
                  </Tooltip>
                </StyleFormSetListItemGroup>
              </StyleFormSetListItem>
            ))}
          </StyleFormSetList>
        )}

        {!readOnly && (
          <div className={bem`__add`}>
            <PaperActionButton
              large={false}
              onClick={this.handleCreateService}
              disabled={disabled || !!newService}
            />
          </div>
        )}

        {!!service && (
          <section className={bem`__service`}>
            <PaperSelect
              label="Type"
              name="type"
              disabled={true}
              readOnly={readOnly}
              value="typesetting"
              onChange={this.handleChange}
            >
              <option value="typesetting">Typesetting</option>
            </PaperSelect>

            {service.brokeredService ? (
              <StyleGroup className={bem`__brokered-service`}>
                <header className={bem`__inset-title`}>Brokered service</header>

                <Notice>
                  The service will provided on your behalf. The provider fees
                  (if any) will be billed to the organization.
                </Notice>
                <Droplet node={service.brokeredService}>
                  {brokeredService => (
                    <ServicePreview service={brokeredService} />
                  )}
                </Droplet>
                <ControlPanel>
                  <PaperButton onClick={this.handleRemoveBrokeredService}>
                    Remove
                  </PaperButton>
                </ControlPanel>
              </StyleGroup>
            ) : (
              <Notice className={bem`__notice`}>
                Selecting a provider is optional. If no provider is selected,
                you will be responsible to provide the service offered.
                <PaperButton onClick={this.handleOpenSelectProviderModal}>
                  Select provider
                </PaperButton>
              </Notice>
            )}

            <ControlledPaperInput
              label="Name"
              name="name"
              autoComplete="off"
              disabled={disabled}
              readOnly={readOnly}
              type="text"
              value={textify(service.name) || ''}
              onSubmit={this.handleChange}
            />

            <RichTextarea
              label="Description"
              name="description"
              disabled={disabled}
              readOnly={readOnly}
              defaultValue={service.description}
              onSubmit={this.handleChange}
            />

            <ControlledPaperInput
              label="Unit price (USD)"
              name="price"
              autoComplete="off"
              disabled={disabled}
              readOnly={readOnly}
              type="number"
              min={0}
              value={price || 0}
              step={1}
              onSubmit={this.handleChange}
            />

            <PaperCheckbox
              name="addOn"
              disabled={disabled || !price || price < 1e-6}
              readOnly={readOnly}
              checked={!!addOn}
              onChange={this.handleChange}
            >
              Free for revisions
            </PaperCheckbox>

            <ControlPanel>
              <PaperButton onClick={this.handleClose}>
                {newService ? 'cancel' : 'close'}
              </PaperButton>
              {!!newService && (
                <PaperButton onClick={this.handleSubmit}>Create</PaperButton>
              )}
            </ControlPanel>
          </section>
        )}

        {isSelectProviderModalOpen && (
          <Modal>
            <Card>
              <header className={bem`__modal-header`}>
                <h3 className={bem`__modal-title`}>
                  Select a service to broker
                </h3>
              </header>

              <Search
                index="service"
                query={`(audienceAudienceScope:"${escapeLucene(
                  'tmp:null'
                )}" OR audienceAudienceScope:"${escapeLucene(
                  getId(organization)
                )}") AND serviceType:"typesetting" AND serviceStatus:"ActiveServiceStatus" AND allowBroker:"true"`}
                hydrate="provider"
              >
                {({ items, droplets }) => {
                  const potentialServices = items.map(item => {
                    if (getId(item.provider) in droplets) {
                      Object.assign({}, item, {
                        provider: droplets[getId(item.provider)]
                      });
                    }
                    return item;
                  });

                  return (
                    <ServicePicker
                      potentialServices={potentialServices}
                      onSelect={this.handleSelectProvider.bind(
                        this,
                        potentialServices
                      )}
                      service={selectedBrokeredService}
                      multi={false}
                    />
                  );
                }}
              </Search>

              <ControlPanel>
                <PaperButton onClick={this.handleCloseSelectProviderModal}>
                  Cancel
                </PaperButton>
                <PaperButton onClick={this.handleSubmitProvider}>
                  Select
                </PaperButton>
              </ControlPanel>
            </Card>
          </Modal>
        )}
      </section>
    );
  }
}

export default connect(
  createSelector(
    (state, props) =>
      state.serviceMapByOrganizationId[getId(props.organization)],
    (serviceMap = {}) => {
      const services = Object.values(serviceMap)
        .filter(service => {
          return service.serviceStatus !== 'ArchivedServiceStatus';
        })
        .sort((a, b) => {
          // sort by type and name
          if (
            a.serviceType &&
            b.serviceType &&
            a.serviceType !== b.serviceType
          ) {
            return a.serviceType.localeCompare(b.serviceType);
          }
          if (a.name && b.name) {
            return textify(a.name).localeCompare(textify(b.name));
          }
        });

      return { services };
    }
  ),
  {
    fetchOrganizationServices,
    createService,
    activateService,
    deactivateService,
    updateService,
    archiveService,
    addDroplets
  }
)(SettingsOrganizationService);
