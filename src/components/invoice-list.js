import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { xhr } from '@scipe/librarian';
import { unprefix, getId } from '@scipe/jsonld';
import { PaperButton, Price, bemify } from '@scipe/ui';
import Notice from './notice';
import PrintInvoiceButton from './print-invoice-button';

export default class InvoiceList extends React.Component {
  static propTypes = {
    organizationId: PropTypes.string.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      isFetchingUpcoming: false,
      isFetchingPrevious: false,
      errorUpcoming: null,
      errorPrevious: null,
      upcoming: null,
      previous: [],
      nextPreviousUrl: null
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this.fetchUpcoming();
    this.fetchPrevious();
  }

  componentDidUpdate(prevProps) {
    if (this.props.organizationId !== prevProps.organizationId) {
      this.setState({
        isFetchingUpcoming: false,
        isFetchingPrevious: false,
        errorUpcoming: null,
        errorPrevious: null,
        upcoming: null,
        previous: [],
        nextPreviousUrl: null
      });
      this.fetchUpcoming();
      this.fetchPrevious();
    }
  }

  componentWillUnmount() {
    if (this.xhrUpcoming) {
      this.xhrUpcoming.abort();
    }
    if (this.xhrPrevious) {
      this.xhrPrevious.abort();
    }
    this._isMounted = false;
  }

  fetchUpcoming() {
    const { organizationId } = this.props;

    if (this.xhrUpcoming) {
      this.xhrUpcoming.abort();
    }
    const r = xhr({
      url: `/invoice?organization=${unprefix(organizationId)}&upcoming=true`,
      method: 'GET',
      json: true
    });

    this.xhrUpcoming = r.xhr;

    this.setState({
      isFetchingUpcoming: true,
      errorUpcoming: null
    });
    r.then(({ body }) => {
      this.xhrUpcoming = null;
      if (this._isMounted) {
        this.setState({
          upcoming: body,
          isFetchingUpcoming: false,
          errorUpcoming: null
        });
      }
    }).catch(err => {
      this.xhrUpcoming = null;
      if (this._isMounted) {
        this.setState({
          isFetchingUpcoming: false,
          errorUpcoming: err
        });
      }
    });
  }

  fetchPrevious(more = false) {
    const { organizationId } = this.props;
    const { nextPreviousUrl, previous } = this.state;

    if (this.xhrPrevious) {
      this.xhrPrevious.abort();
    }
    const r = xhr({
      url: more
        ? nextPreviousUrl
        : `/invoice?organization=${unprefix(organizationId)}`,
      method: 'GET',
      json: true
    });

    this.xhrPrevious = r.xhr;

    this.setState({
      isFetchingPrevious: true,
      errorPrevious: null
    });
    r.then(({ body }) => {
      this.xhrPrevious = null;
      if (this._isMounted) {
        const nextPrevious = body.itemListElement.map(
          listItem => listItem.item
        );

        this.setState({
          previous: more ? previous.concat(nextPrevious) : nextPrevious,
          isFetchingPrevious: false,
          errorPrevious: null,
          nextPreviousUrl:
            (nextPrevious[nextPrevious.length - 1] &&
              nextPrevious[nextPrevious.length - 1].nextItem) ||
            null
        });
      }
    }).catch(err => {
      this.xhrPrevious = null;
      if (this._isMounted) {
        this.setState({
          isFetchingPrevious: false,
          errorPrevious: err
        });
      }
    });
  }

  render() {
    const { organizationId } = this.props;

    const {
      upcoming,
      previous,
      nextPreviousUrl,
      isFetchingPrevious,
      isFetchingCurrent
    } = this.state;

    if (
      !isFetchingCurrent &&
      !isFetchingPrevious &&
      !upcoming &&
      !previous.length
    ) {
      return <Notice>No invoices</Notice>;
    }

    const bem = bemify('invoice-list');

    return (
      <div className={bem``}>
        <table className={bem`__table`}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Due date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {!!upcoming && (
              <InvoiceRow
                organizationId={organizationId}
                invoice={upcoming}
                upcoming={true}
              />
            )}
            {previous.map(invoice => (
              <InvoiceRow
                organizationId={organizationId}
                key={getId(invoice)}
                invoice={invoice}
              />
            ))}
          </tbody>
        </table>

        {!!nextPreviousUrl && (
          <PaperButton onClick={this.fetchPrevious.bind(this, true)}>
            More
          </PaperButton>
        )}
      </div>
    );
  }
}

class InvoiceRow extends React.Component {
  static propTypes = {
    organizationId: PropTypes.string.isRequired,
    upcoming: PropTypes.bool,
    invoice: PropTypes.object.isRequired
  };

  render() {
    const { invoice, upcoming, organizationId } = this.props;

    const paymentStatusMap = {
      PaymentAutomaticallyApplied: 'paid',
      PaymentComplete: 'paid',
      PaymentDeclined: 'declined',
      PaymentDue: 'due',
      PaymentPastDue: 'past due'
    };

    return (
      <tr>
        <td>{upcoming ? <em>upcoming</em> : unprefix(getId(invoice))}</td>
        <td>{moment(invoice.paymentDueDate).format('YYYY-MM-DD')}</td>
        <td>
          <Price priceSpecification={invoice.totalPaymentDue} />
        </td>
        <td>{upcoming ? '-' : paymentStatusMap[invoice.paymentStatus]}</td>
        <td>
          <PrintInvoiceButton
            organizationId={organizationId}
            invoice={invoice}
            upcoming={upcoming}
          />
        </td>
      </tr>
    );
  }
}
