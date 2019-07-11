/* globals Stripe */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';
import pickBy from 'lodash/pickBy';
import { getId, unprefix, arrayify } from '@scipe/jsonld';
import { xhr, createId } from '@scipe/librarian';
import {
  PaperSelect,
  PaperInput,
  PaperButton,
  ControlPanel,
  LayoutWrapRows,
  LayoutWrapItem
} from '@scipe/ui';

import {
  StyleLegend,
  StyleValidatedInput,
  StyleSectionControls,
  StyleSection
} from './settings';
import Notice from '../notice';
import config from '../../utils/config';

// TODO list the Organization orders

/**
 * Create and Update a Stripe account
 * See:
 * - https://stripe.com/docs/connect/required-verification-information
 * - https://stripe.com/docs/connect/account-tokens
 */
export default class SettingsOrganizationPayments extends React.Component {
  static propTypes = {
    disabled: PropTypes.bool,
    organization: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      account: null,
      fetching: null,
      fetchError: null,
      posting: null,
      postError: null,
      formData: accountToFormData(null, { testing: false }) // set `testing` to `true` to have the form pre-populated for development purposes
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this.fetchAccount();
  }

  componentDidUpdate(prevProps) {
    const { organization } = this.props;

    if (getId(prevProps.organization) !== getId(organization)) {
      this.fetchAccount();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._xhr) {
      this._xhr.abort();
    }
  }

  fetchAccount() {
    const { organization } = this.props;

    if (this._xhr) {
      this._xhr.abort();
    }

    this.setState({ fetching: true }, () => {
      const r = xhr({
        url: `/stripe/account?organization=${unprefix(getId(organization))}`,
        method: 'GET',
        json: true
      });
      this._xhr = r.xhr;

      r.then(({ body: account }) => {
        if (this._isMounted) {
          this.setState({
            account,
            fetchError: null,
            fetching: false,
            formData: accountToFormData(account)
          });
        }
      }).catch(error => {
        if (this._isMounted) {
          if (error.code === 404) {
            this.setState({ fetchError: null, account: null, fetching: false });
          } else {
            this.setState({ fetchError: error, fetching: false });
          }
        }
      });
    });
  }

  handleChange = e => {
    this.setState(
      Object.assign({}, this.state, {
        formData: Object.assign({}, this.state.formData, {
          [e.target.name]: e.target.value
        })
      })
    );
  };

  handleFormAutoSubmit = e => {
    e.preventDefault();
  };

  handleReplaceSensitiveField(props) {
    const { user } = this.props;
    const { account } = this.state;

    const upd = arrayify(props).reduce((upd, p) => {
      switch (p) {
        case 'businessTaxId':
          if (!upd.legal_entity) {
            upd.legal_entity = {};
          }
          upd.legal_entity.business_tax_id = null;
          break;

        case 'personalIdNumber':
          if (!upd.legal_entity) {
            upd.legal_entity = {};
          }
          upd.legal_entity.personal_id_number = null;
          break;

        default:
          break;
      }

      return upd;
    }, {});

    if (!Object.keys(upd).length) {
      return;
    }

    this.setState(
      {
        posting: true,
        postError: null
      },
      () => {
        xhr({
          url: '/action',
          method: 'POST',
          json: true,
          body: {
            '@type': 'UpdateAction',
            agent: getId(user),
            actionStatus: 'CompletedActionStatus',
            object: upd,
            targetCollection: createId('stripe', account.id)['@id']
          }
        })
          .then(({ body }) => {
            if (this._isMounted) {
              const account = body.result;
              this.setState({
                account,
                formData: accountToFormData(account),
                posting: false,
                postError: null
              });
            }
          })
          .catch(err => {
            if (this._isMounted) {
              this.setState({
                posting: false,
                postError: err
              });
            }
          });
      }
    );
  }

  handleReplaceBankAccount = e => {
    const { account } = this.state;

    const nextAccount = omit(account, 'external_accounts');
    this.setState({
      account: nextAccount,
      formData: accountToFormData(nextAccount)
    });
  };

  handleSubmit = e => {
    const { user, organization } = this.props;
    const { formData } = this.state;

    this.setState(
      {
        posting: true,
        postError: null
      },
      () => {
        formDataToAccount(formData)
          .then(account => {
            return xhr({
              url: '/action',
              method: 'POST',
              json: true,
              body: {
                '@type': 'CreatePaymentAccountAction',
                actionStatus: 'CompletedActionStatus',
                agent: getId(user),
                object: getId(organization),
                result: Object.assign(
                  {
                    country: formData.addressCountry
                  },
                  account
                )
              }
            });
          })
          .then(({ body: createPaymentAccountAction }) => {
            const account = createPaymentAccountAction.result;
            if (this._isMounted) {
              this.setState({
                account,
                formData: accountToFormData(account),
                posting: false,
                postError: null
              });
            }
          })
          .catch(err => {
            if (this._isMounted) {
              this.setState({
                posting: false,
                postError: err
              });
            }
          });
      }
    );
  };

  handleUpdate = e => {
    const { user } = this.props;
    const { formData, account } = this.state;

    this.setState(
      {
        posting: true,
        postError: null
      },
      () => {
        formDataToAccount(formData)
          .then(upd => {
            return xhr({
              url: '/action',
              method: 'POST',
              json: true,
              body: {
                '@type': 'UpdateAction',
                actionStatus: 'CompletedActionStatus',
                agent: getId(user),
                object: upd,
                targetCollection: createId('stripe', account.id)['@id']
              }
            });
          })
          .then(({ body: updateAction }) => {
            const account = updateAction.result;
            if (this._isMounted) {
              this.setState({
                account,
                formData: accountToFormData(account),
                posting: false,
                postError: null
              });
            }
          })
          .catch(err => {
            if (this._isMounted) {
              this.setState({
                posting: false,
                postError: err
              });
            }
          });
      }
    );
  };

  render() {
    const {
      fetching,
      posting,
      account,
      formData,
      fetchError,
      postError
    } = this.state;

    // Don't render anything untill at least the first fetching
    if (fetching === null) {
      return null;
    }

    const {
      // legal entity
      type,
      businessName,
      businessTaxId,
      firstName,
      lastName,
      personalIdNumber,
      dobDay,
      dobMonth,
      dobYear,
      addressLine1,
      addressLine2,
      addressPostalCode,
      addressCity,
      addressState,
      addressCountry,
      // Bank account
      accountNumber,
      routingNumber,
      accountHolderName,
      accountHolderType,
      accountCountry,
      currency
    } = formData;

    const optionalProps = new Set(
      type === 'company'
        ? ['addressLine2']
        : ['addressLine2', 'businessName', 'businessTaxId']
    );

    const canSubmit =
      !fetching &&
      !posting &&
      !Object.keys(formData).some(p => !optionalProps.has(p) && !formData[p]);

    const canUpdate = account && !isEqual(accountToFormData(account), formData);

    // TODO Notice for account.verification (see https://stripe.com/docs/api#account_object)
    let personalIdProvided, businessTaxIdProvided;
    if (account) {
      personalIdProvided = account.legal_entity.personal_id_number_provided;
      businessTaxIdProvided = account.legal_entity.business_tax_id_provided;
    }

    const bankAccount = getBankAccount(account);

    return (
      <div className="settings-organization-payments">
        {canSubmit && account && account.payouts_enabled && (
          <Notice iconName="check">
            Your account is able to receive payments. No further action is
            needed at that time.
          </Notice>
        )}

        <form onSubmit={this.handleFormAutoSubmit}>
          <StyleSection>
            <fieldset className="settings-organization-payments__form-group">
              <StyleLegend>
                <legend className="settings-organization-payments__legend">
                  Kind of legal entity the payment account is for
                </legend>
              </StyleLegend>
              <PaperSelect
                name="type"
                label="type"
                value={type}
                required={!optionalProps.has('type')}
                disabled={fetching || posting}
                onChange={this.handleChange}
              >
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </PaperSelect>
            </fieldset>
          </StyleSection>
          {type === 'company' && (
            <StyleSection>
              <fieldset className="settings-organization-payments__form-group">
                <StyleLegend>
                  <legend className="settings-organization-payments__legend">
                    Information about the company responsible for the payment
                    account
                  </legend>
                </StyleLegend>
                <LayoutWrapRows>
                  <LayoutWrapItem>
                    <PaperInput
                      name="businessName"
                      label="Legal name"
                      type="text"
                      value={businessName}
                      required={!optionalProps.has('businessName')}
                      disabled={fetching || posting}
                      onChange={this.handleChange}
                    />
                  </LayoutWrapItem>
                  {businessTaxIdProvided ? (
                    <LayoutWrapItem>
                      {/* <p>Social Security Number was successfully provided</p> */}
                      <StyleValidatedInput>
                        <PaperInput
                          name="businessTaxIdPlaceHolder"
                          label="Tax ID"
                          type="string"
                          placeholder="•••••••••"
                          value="•••••••••"
                          disabled={true}
                        />
                      </StyleValidatedInput>
                      <PaperButton
                        disabled={fetching || posting}
                        onClick={this.handleReplaceSensitiveField.bind(
                          this,
                          'businessTaxId'
                        )}
                      >
                        Replace
                      </PaperButton>
                    </LayoutWrapItem>
                  ) : (
                    <LayoutWrapItem>
                      <PaperInput
                        name="businessTaxId"
                        label="Tax ID"
                        type="text"
                        value={businessTaxId}
                        required={!optionalProps.has('businessTaxId')}
                        disabled={fetching || posting}
                        onChange={this.handleChange}
                      />
                    </LayoutWrapItem>
                  )}
                </LayoutWrapRows>
              </fieldset>
            </StyleSection>
          )}
          <StyleSection>
            <fieldset className="settings-organization-payments__form-group">
              <StyleLegend>
                <legend className="settings-organization-payments__legend">
                  Identity of the individal primary responsible for the payment
                  account
                </legend>
              </StyleLegend>

              <LayoutWrapRows>
                <LayoutWrapItem flexBasis="240px">
                  <PaperInput
                    name="firstName"
                    label="First name"
                    type="text"
                    value={firstName}
                    required={!optionalProps.has('firstName')}
                    disabled={fetching || posting}
                    onChange={this.handleChange}
                  />
                </LayoutWrapItem>
                <LayoutWrapItem flexBasis="240px">
                  <PaperInput
                    name="lastName"
                    label="Last name"
                    type="text"
                    value={lastName}
                    required={!optionalProps.has('lastName')}
                    disabled={fetching || posting}
                    onChange={this.handleChange}
                  />
                </LayoutWrapItem>
                {personalIdProvided ? (
                  <LayoutWrapItem flexBasis="240px">
                    {/* <p>Social Security Number was successfully provided</p> */}
                    <StyleValidatedInput>
                      <PaperInput
                        name="personalIdNumberPlaceHolder"
                        label="Social Security Number, Social Insurance Number"
                        type="string"
                        placeholder="•••••••••"
                        value="•••••••••"
                        disabled={true}
                      />
                    </StyleValidatedInput>
                    <StyleSectionControls>
                      <PaperButton
                        disabled={fetching || posting}
                        onClick={this.handleReplaceSensitiveField.bind(
                          this,
                          'personalIdNumber'
                        )}
                      >
                        Replace
                      </PaperButton>
                    </StyleSectionControls>
                  </LayoutWrapItem>
                ) : (
                  <LayoutWrapItem flexBasis="480px">
                    <PaperInput
                      name="personalIdNumber"
                      label="Social Security Number, Social Insurance Number"
                      type="number"
                      value={personalIdNumber}
                      required={!optionalProps.has('personalIdNumber')}
                      pattern="\d{9}"
                      minLenght={9}
                      maxLenght={9}
                      disabled={fetching || posting}
                      onChange={this.handleChange}
                    />
                  </LayoutWrapItem>
                )}
              </LayoutWrapRows>
            </fieldset>
          </StyleSection>
          <StyleSection>
            <fieldset className="settings-organization-payments__form-group">
              <StyleLegend>
                <legend className="settings-organization-payments__legend">
                  Date of birth of the individal primary responsible for the
                  payment account
                </legend>
              </StyleLegend>
              <LayoutWrapRows>
                <LayoutWrapItem flexBasis="240px">
                  <PaperInput
                    name="dobDay"
                    label="Day"
                    type="number"
                    value={dobDay}
                    required={!optionalProps.has('dobDay')}
                    min={1}
                    max={31}
                    step={1}
                    disabled={fetching || posting}
                    onChange={this.handleChange}
                  />
                </LayoutWrapItem>
                <LayoutWrapItem flexBasis="240px">
                  <PaperInput
                    name="dobMonth"
                    label="Month"
                    type="number"
                    value={dobMonth}
                    required={!optionalProps.has('dobMonth')}
                    min={1}
                    max={12}
                    step={1}
                    disabled={fetching || posting}
                    onChange={this.handleChange}
                  />
                </LayoutWrapItem>
                <LayoutWrapItem flexBasis="240px">
                  <PaperInput
                    name="dobYear"
                    label="Year"
                    type="number"
                    value={dobYear}
                    required={!optionalProps.has('dobYear')}
                    pattern="\d{4}"
                    disabled={fetching || posting}
                    onChange={this.handleChange}
                  />
                </LayoutWrapItem>
              </LayoutWrapRows>
            </fieldset>
          </StyleSection>
          <StyleSection>
            <fieldset className="settings-organization-payments__form-group">
              <StyleLegend>
                <legend className="settings-organization-payments__legend">
                  Primary address of the legal entity processing payment
                </legend>
              </StyleLegend>

              <PaperInput
                name="addressLine1"
                label="Address line 1 (Street address, PO Box or Company name)"
                type="text"
                value={addressLine1}
                required={!optionalProps.has('addressLine1')}
                disabled={fetching || posting}
                onChange={this.handleChange}
                floatLabel={false}
              />

              <PaperInput
                name="addressLine2"
                label="Address line 2 (Apartment, Suite, Unit or Building)"
                type="text"
                value={addressLine2}
                required={!optionalProps.has('addressLine2')}
                disabled={fetching || posting}
                onChange={this.handleChange}
                floatLabel={false}
              />
              <LayoutWrapRows>
                <LayoutWrapItem flexBasis="120px">
                  <PaperInput
                    name="addressPostalCode"
                    label="ZIP or postal code"
                    type="text"
                    value={addressPostalCode}
                    required={!optionalProps.has('addressPostalCode')}
                    disabled={fetching || posting}
                    onChange={this.handleChange}
                    floatLabel={false}
                  />
                </LayoutWrapItem>
                <LayoutWrapItem flexBasis="240px">
                  <PaperInput
                    name="addressState"
                    label="State, county, province or region"
                    type="text"
                    value={addressState}
                    required={!optionalProps.has('addressState')}
                    disabled={fetching || posting}
                    onChange={this.handleChange}
                    floatLabel={false}
                  />
                </LayoutWrapItem>
                <LayoutWrapItem flexBasis="240px">
                  <PaperInput
                    name="addressCity"
                    label="City, district, suburb, town or village"
                    type="text"
                    value={addressCity}
                    required={!optionalProps.has('addressCity')}
                    disabled={fetching || posting}
                    onChange={this.handleChange}
                    floatLabel={false}
                  />
                </LayoutWrapItem>
                <LayoutWrapItem flexBasis="120px">
                  <PaperSelect
                    name="addressCountry"
                    label="Country"
                    type="text"
                    value={addressCountry}
                    required={!optionalProps.has('addressCountry')}
                    disabled={fetching || posting}
                    onChange={this.handleChange}
                    floatLabel={false}
                  >
                    <option value="CA">Canada</option>
                    <option value="US">United States of America (USA)</option>
                  </PaperSelect>
                </LayoutWrapItem>
              </LayoutWrapRows>
            </fieldset>
          </StyleSection>
          <StyleSection>
            <fieldset className="settings-organization-payments__form-group">
              <StyleLegend>
                <legend className="settings-organization-payments__legend">
                  Bank account
                </legend>
              </StyleLegend>
              {bankAccount ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--xsgrd)',
                    border: '1px solid var(--ruling-color'
                  }}
                >
                  <div style={{ marginRight: '1.6rem' }}>
                    <span>
                      {bankAccount.bank_name || bankAccount.routing_number}{' '}
                      Account ending in: {bankAccount.last4}
                    </span>
                  </div>

                  <PaperButton
                    disabled={fetching || posting}
                    onClick={this.handleReplaceBankAccount}
                  >
                    Replace
                  </PaperButton>
                </div>
              ) : (
                <Fragment>
                  <LayoutWrapRows>
                    <LayoutWrapItem flexBasis="240px">
                      <PaperInput
                        name="accountNumber"
                        label="Account number"
                        type="text"
                        value={accountNumber}
                        required={!optionalProps.has('accountNumber')}
                        disabled={fetching || posting}
                        onChange={this.handleChange}
                      />
                    </LayoutWrapItem>
                    <LayoutWrapItem flexBasis="240px">
                      <PaperInput
                        name="routingNumber"
                        label="Routing number"
                        type="text"
                        value={routingNumber}
                        required={!optionalProps.has('routingNumber')}
                        disabled={fetching || posting}
                        onChange={this.handleChange}
                      />
                    </LayoutWrapItem>
                  </LayoutWrapRows>
                  <LayoutWrapRows>
                    <LayoutWrapItem flexBasis="240px">
                      <PaperInput
                        name="accountHolderName"
                        label="Account holder name"
                        type="text"
                        value={accountHolderName}
                        required={!optionalProps.has('accountHolderName')}
                        disabled={fetching || posting}
                        onChange={this.handleChange}
                      />
                    </LayoutWrapItem>
                    <LayoutWrapItem flexBasis="240px">
                      <PaperSelect
                        name="accountHolderType"
                        label="type"
                        value={accountHolderType}
                        required={!optionalProps.has('accountHolderType')}
                        disabled={fetching || posting}
                        onChange={this.handleChange}
                      >
                        <option value="individual">Individual</option>
                        <option value="company">Company</option>
                      </PaperSelect>
                    </LayoutWrapItem>
                  </LayoutWrapRows>
                  <LayoutWrapRows>
                    <LayoutWrapItem>
                      <PaperSelect
                        name="accountCountry"
                        label="Country"
                        value={accountCountry}
                        required={!optionalProps.has('accountCountry')}
                        disabled={fetching || posting}
                        onChange={this.handleChange}
                      >
                        <option value="CA">Canada</option>
                        <option value="US">
                          United States of America (USA)
                        </option>
                      </PaperSelect>
                    </LayoutWrapItem>
                    <LayoutWrapItem flexBasis="240px">
                      <PaperSelect
                        name="currency"
                        label="Currency"
                        value={currency}
                        required={!optionalProps.has('currency')}
                        disabled={true}
                        onChange={this.handleChange}
                      >
                        <option value="usd">usd</option>
                      </PaperSelect>
                    </LayoutWrapItem>
                  </LayoutWrapRows>
                </Fragment>
              )}
            </fieldset>
          </StyleSection>
          <ControlPanel error={fetchError || postError}>
            <PaperButton
              type="submit"
              disabled={account ? !(canSubmit && canUpdate) : !canSubmit}
              onClick={this[account ? 'handleUpdate' : 'handleSubmit']}
            >
              {`${
                account
                  ? posting
                    ? 'Updating'
                    : 'Update'
                  : posting
                  ? 'Creating'
                  : 'Create'
              } Payment Account`}
            </PaperButton>
          </ControlPanel>
        </form>

        <Notice>
          <span>
            By creating a payment account, you agree to{' '}
            <a href="/get-started/terms">sci.pe terms</a> and the{' '}
            <a href="https://stripe.com/connect-account/legal">
              Stripe Connected Account Agreement
            </a>
            .
          </span>
        </Notice>
      </div>
    );
  }
}

function getBankAccount(account) {
  return (
    account &&
    account.external_accounts &&
    account.external_accounts.data &&
    account.external_accounts.data[0]
  );
}

function accountToFormData(
  account,
  {
    testing = false // in testing mode we prepopulate the form for convenience
  } = {}
) {
  const bankAccount = getBankAccount(account);

  // Note: some sensitive fields are not available but indicated with a `_provided` suffix (e.g personal_id_number_4_provided). For those fields we set the state to `true`

  // See https://stripe.com/docs/connect/testing for bank account values
  return {
    // account.legal_entity
    type: account ? account.legal_entity.type : 'individual',
    businessName: account ? account.legal_entity.business_name || '' : '',
    businessTaxId:
      account && account.legal_entity.business_tax_id_provided ? true : '',
    firstName: account
      ? account.legal_entity.first_name || ''
      : testing
      ? 'Peter'
      : '',
    lastName: account
      ? account.legal_entity.last_name || ''
      : testing
      ? 'Smith'
      : '',
    personalIdNumber:
      account && account.legal_entity.personal_id_number_provided
        ? true
        : testing
        ? '000111111'
        : '',
    dobDay: account ? account.legal_entity.dob.day || 1 : 1,
    dobMonth: account ? account.legal_entity.dob.month || 1 : 1,
    dobYear: account ? account.legal_entity.dob.year || 2000 : 2000,
    addressLine1: account
      ? account.legal_entity.address.line1 || ''
      : testing
      ? '2 gold street'
      : '',
    addressLine2: account ? account.legal_entity.address.line2 || '' : '',
    addressPostalCode: account
      ? account.legal_entity.address.postal_code || ''
      : testing
      ? '10038'
      : '',
    addressCity: account
      ? account.legal_entity.address.city || ''
      : testing
      ? 'New York'
      : '',
    addressState: account
      ? account.legal_entity.address.state || ''
      : testing
      ? 'NY'
      : '',
    addressCountry: account
      ? account.legal_entity.address.country || 'US'
      : 'US',

    // account.external_accounts
    accountNumber: bankAccount ? true : testing ? '000123456789' : '',
    routingNumber: bankAccount
      ? bankAccount.routing_number || ''
      : testing
      ? '110000000'
      : '',
    accountHolderName: bankAccount
      ? bankAccount.account_holder_name || ''
      : testing
      ? 'Peter John Smith'
      : '',
    accountHolderType: bankAccount
      ? bankAccount.account_holder_type
      : 'individual',
    accountCountry: bankAccount ? bankAccount.country || 'US' : 'US',
    currency: bankAccount ? bankAccount.currency || 'usd' : 'usd'
  };
}

function formDataToAccount(formData) {
  const {
    type,
    businessName,
    businessTaxId,
    firstName,
    lastName,
    personalIdNumber,
    dobDay,
    dobMonth,
    dobYear,
    addressLine1,
    addressLine2,
    addressPostalCode,
    addressCity,
    addressState,
    addressCountry,
    // Bank account
    accountNumber,
    routingNumber,
    accountHolderName,
    accountHolderType,
    accountCountry,
    currency
  } = formData;

  try {
    var stripe = Stripe(config.stripePublishableKey);
  } catch (err) {
    console.error(err);
    return Promise.reject(err);
  }

  let promises = [];
  if (accountNumber !== true) {
    // If accountNumber is `true`, the bank account is OK and wasn't changed by the user

    // Create a promise that resolve to the `external_account` data
    promises.push(
      stripe
        .createToken('bank_account', {
          country: accountCountry,
          currency,
          routing_number: routingNumber,
          account_number: accountNumber,
          account_holder_name: accountHolderName,
          account_holder_type: accountHolderType
        })
        .then(({ error, token }) => {
          if (error) throw error;
          return { external_account: token.id };
        })
    );
  }

  // Create a promise that resolve to the `account_token` data
  // handle the `personal_id_number` case that need to be tokenized
  let p;
  if (personalIdNumber === true) {
    // the data is OK and wasn't changed by the user
    p = Promise.resolve(undefined);
  } else {
    p = stripe
      .createToken('pii', { personal_id_number: personalIdNumber })
      .then(({ error, token }) => {
        if (error) {
          throw error;
        }
        return token.id;
      });
  }

  // the actual promise that resolves to `account_token`
  promises.push(
    p
      .then(personal_id_number => {
        return stripe.createToken('account', {
          legal_entity: pickBy({
            type,
            first_name: firstName,
            last_name: lastName,
            business_name: businessName,
            business_tax_id: businessTaxId === true ? undefined : businessTaxId,
            personal_id_number,
            address: {
              line1: addressLine1,
              line2: addressLine2,
              city: addressCity,
              state: addressState,
              country: addressCountry,
              postal_code: addressPostalCode
            },
            dob: {
              day: dobDay,
              month: dobMonth,
              year: dobYear
            }
          }),
          tos_shown_and_accepted: true
        });
      })
      .then(({ error, token }) => {
        if (error) {
          throw error;
        }
        return { account_token: token.id };
      })
  );

  const payload = {};

  return promises.reduce((_, p) => {
    return p.then(data => {
      return Object.assign(payload, data);
    });
  }, Promise.resolve(payload));
}
