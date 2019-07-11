import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { unprefix, getId } from '@scipe/jsonld';
import { Logo, bemify, Price, TextLogo } from '@scipe/ui';
import { xhr } from '@scipe/librarian';

/**
 * this is typically rendered in a iframe for print
 * See <PrintInvoiceButton />
 */
export default class InvoicePage extends React.Component {
  static propTypes = {
    match: PropTypes.object,
    location: PropTypes.object
  };

  constructor(props) {
    super(props);

    this.state = { invoice: null };
  }

  componentDidMount() {
    const {
      match: { params },
      location
    } = this.props;

    this._isMounted = true;

    const upcoming = location.search === '?upcoming=true';

    const url = upcoming
      ? `/invoice?organization=${params.organizationId}&upcoming=true`
      : `/invoice/${params.invoiceId}`;

    xhr({
      url,
      method: 'GET',
      json: true
    })
      .then(({ body }) => {
        if (this._isMounted) {
          this.setState({
            invoice: body
          });
        }
      })
      .catch(err => {
        console.error(err);
        this.setState({
          error: err
        });
      });

    window.addEventListener('load', this.handleLoad);
  }

  componentWillUnmount() {
    this._isMounted = false;
    window.removeEventListener('load', this.handleLoad);
    clearTimeout(this._firePrintableTimeout);
  }

  handleLoad = e => {
    // There can be a race condition when printable is fired _before_ the `load` event.
    // This ensures that we refire the event in that case
    if (this._printableHasFired) {
      this._firePrintableTimeout = setTimeout(() => {
        window.dispatchEvent(new Event('printable'));
      }, 10); // timeout is needed as we add the event listener for `printable` within the `load` event listener in the iframe
      console.log('printable re-fired after load');
      this._printableHasFired = false;
    }
  };

  handleLogoLoad = e => {
    window.dispatchEvent(new Event('printable'));
    console.log('printable fired on logo load');
    this._printableHasFired = true;
  };

  render() {
    const { location } = this.props;
    const { invoice } = this.state;
    if (!invoice) {
      return null;
    }

    const upcoming = location.search === '?upcoming=true';

    const bem = bemify('invoice-page');

    const paymentStatusMap = {
      PaymentAutomaticallyApplied: 'paid',
      PaymentComplete: 'paid',
      PaymentDeclined: 'declined',
      PaymentDue: 'due',
      PaymentPastDue: 'past due'
    };

    return (
      <div className={bem``}>
        <header className={bem`__header`}>
          <div className={bem`__header__left`}>
            <h2 className={bem`__title`}>Invoice</h2>
          </div>
          <div className={bem`__header__right`}>
            <Logo onLoad={this.handleLogoLoad} logo="sci.pe" />
            <p className={bem`__header__address`}>
              7 World Trade Center, 46th floor
              <br />
              New York NY 10007, United States
              <br />
              <a href="mailto:contact@sci.pe">contact@sci.pe</a>
              {` | `}
              <a href="www.sci.pe">www.sci.pe</a>
            </p>
          </div>
        </header>

        <section>
          <dl className={bem`__invoice-info`}>
            <div className={bem`__invoice-info__item`}>
              <dt className={bem`__invoice-info__label`}>Invoice number</dt>
              <dd className={bem`__invoice-info__value`}>
                {upcoming ? <em>upcoming</em> : unprefix(getId(invoice))}
              </dd>
            </div>
            <div className={bem`__invoice-info__item`}>
              <dt className={bem`__invoice-info__label`}>Customer</dt>
              <dd className={bem`__invoice-info__value`}>
                {unprefix(getId(invoice.customer))}
              </dd>
            </div>
            <div className={bem`__invoice-info__item`}>
              <dt className={bem`__invoice-info__label`}>Due date</dt>
              <dd className={bem`__invoice-info__value`}>
                {moment(invoice.paymentDueDate).format('YYYY-MM-DD')}
              </dd>
            </div>
            <div className={bem`__invoice-info__item`}>
              <dt className={bem`__invoice-info__label`}>Status</dt>
              <dd className={bem`__invoice-info__value`}>
                {paymentStatusMap[invoice.paymentStatus]}
              </dd>
            </div>
          </dl>
          <div className={bem`__costs`}>
            <table className={bem`__cost-table`}>
              {!!invoice.referencesOrder.length && (
                <thead>
                  <tr>
                    <th className={bem`__cost-table__header`}>Description</th>
                    <th className={bem`__cost-table__header`}>QTY</th>
                    <th className={bem`__cost-table__header`}>Amount</th>
                  </tr>
                </thead>
              )}

              {!!invoice.referencesOrder.length && (
                <tbody>
                  {invoice.referencesOrder.map(orderItem => (
                    <tr key={getId(orderItem)}>
                      <td className={bem`__cost-table__description`}>
                        {orderItem.description}
                      </td>
                      <td>{orderItem.orderQuantity || 0}</td>
                      <td>
                        <Price priceSpecification={orderItem.orderAmount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}

              <tfoot>
                <tr className={bem`__cost-table__total-row`}>
                  <th scope="row" className={bem`__cost-table__header`}>
                    Total amount due
                  </th>
                  <td />
                  <td>
                    <Price priceSpecification={invoice.totalPaymentDue} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <footer>
          <strong>Questions?</strong> contact <TextLogo /> at{' '}
          <a href="mailto:contact@sci.pe">contact@sci.pe</a>.
        </footer>
      </div>
    );
  }
}
