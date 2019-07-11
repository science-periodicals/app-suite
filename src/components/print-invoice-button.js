import React from 'react';
import PropTypes from 'prop-types';
import { PaperButton } from '@scipe/ui';
import { unprefix, getId } from '@scipe/jsonld';

export default class PrintInvoiceButton extends React.Component {
  static propTypes = {
    organizationId: PropTypes.string.isRequired,
    invoice: PropTypes.object.isRequired,
    upcoming: PropTypes.bool
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoadingIframe: false
    };
  }

  handlePrint = e => {
    const { invoice, organizationId, upcoming } = this.props;

    var component = this;
    this.setState({ isLoadingIframe: true });

    const printSrc = `${
      window.location.origin
    }/settings/organization/${unprefix(
      organizationId
    )}/billing/invoice/${unprefix(getId(invoice))}${
      upcoming ? '?upcoming=true' : ''
    }`;

    // We print from a hidden iframe.
    // See https://developer.mozilla.org/en-US/docs/Web/Guide/Printing#Print_an_external_page_without_opening_it

    function closePrint() {
      // No idea why we need a timeout here but without it the browser freezes when we close the iframe
      const iframe = this.__container__ || window.__saPdfInvoiceIframe__;

      if (iframe) {
        iframe.contentWindow.stop();
        setTimeout(() => {
          document.body.removeChild(iframe);
          window.focus();
        }, 200);
        delete window.__saPdfInvoiceIframe__;
        iframe.contentWindow.removeEventListener('afterprint', closePrint);
        iframe.contentWindow.removeEventListener('beforeunload', closePrint);
      }

      window.removeEventListener('popstate', closePrint);
    }

    function setPrint() {
      // `this` is the iframe
      this.contentWindow.__container__ = this; // so that we can remove the iframe later (see closePrint)
      this.contentWindow.focus(); // Required for IE

      var that = this;

      function startPrint() {
        that.contentWindow.focus(); // Required for IE

        console.log('printable event received');

        // we let react the time to do work
        // TODO emit event to notify when ready...
        setTimeout(() => {
          console.log('calling print()');

          component.setState({
            isLoadingIframe: false
          });

          if (document.queryCommandSupported('print')) {
            // for browsers that support print execCommand, this seems to work well - for some reasone safari does not respond to .print() call.
            // see: https://github.com/jasonday/printThis/blob/c8148467ca97509f28bfa1a591ccf67a865b93da/printThis.js#L279-L284
            that.contentWindow.document.execCommand('print', false, null);
          } else {
            that.contentWindow.print();
          }
        }, 200);

        that.contentWindow.removeEventListener('printable', startPrint);
      }

      this.contentWindow.addEventListener('printable', startPrint);
      this.contentWindow.addEventListener('beforeunload', closePrint);
      this.contentWindow.addEventListener('afterprint', closePrint);
    }

    const iframe = document.createElement('iframe');
    this.iframe = iframe;
    window.__saPdfInvoiceIframe__ = iframe;
    iframe.id = 'sa-invoice-pdf-printer';
    iframe.onload = setPrint;
    iframe.style.position = 'fixed';
    iframe.style.visibility = 'hidden';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.right = '0';
    iframe.style.bottom = '0';

    // uncomment to see the iframe
    // iframe.style.zIndex = '1000';
    // iframe.style.top = '33%';
    // iframe.style.left = '33%';
    iframe.src = printSrc;
    document.body.appendChild(iframe);

    // we cancel print if the user click on the back button
    window.addEventListener('popstate', closePrint);
  };

  render() {
    const { isLoadingIframe } = this.state;

    return (
      <PaperButton onClick={this.handlePrint}>
        {isLoadingIframe ? 'Loading…' : 'Print'}
      </PaperButton>
    );
  }
}
