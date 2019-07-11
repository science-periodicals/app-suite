import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import pick from 'lodash/pick';
import querystring from 'querystring';
import { unprefix, getId } from '@scipe/jsonld';
import { getScopeId } from '@scipe/librarian';
import { MenuItem } from '@scipe/ui';
import {
  openPrintProgressModal,
  closePrintProgressModal
} from '../actions/ui-action-creators';

class PrintPdfMenuItem extends React.Component {
  static propTypes = {
    journal: PropTypes.object,
    graph: PropTypes.object,
    issue: PropTypes.object, // the issue being viewed (if any)
    preview: PropTypes.bool,
    query: PropTypes.object,

    // redux
    openPrintProgressModal: PropTypes.func.isRequired,
    closePrintProgressModal: PropTypes.func.isRequired
  };

  static defaultProps = {
    query: {}
  };

  //  componentDidMount() {
  //    window.addEventListener('message', receiveMessage);
  //
  //    var that = this;
  //    function receiveMessage(event) {
  //      if (event.origin === window.location.origin) {
  //        // Not sure why but event.source is not the window of the iframe but `window`
  //        // all the following are false :(
  //        // console.log({
  //        //   source: event.source == that.iframe.contentWindow,
  //        //   srcElement: event.srcElement == that.iframe.contentWindow,
  //        //   target: event.target == that.iframe.contentWindow,
  //        //   currentTarget: event.currentTarget == that.iframe.contentWindow
  //        // });
  //        that.iframe.contentWindow.postMessage('hi iframe', event.origin);
  //
  //        window.removeEventListener('message', receiveMessage);
  //      }
  //    }
  //  }

  handlePrint = e => {
    const {
      journal,
      graph,
      issue,
      preview,
      query,
      openPrintProgressModal,
      closePrintProgressModal
    } = this.props;
    const qs = querystring.stringify(
      Object.assign(
        pick(query, ['hostname']),
        { print: true },
        getId(issue)
          ? { issue: unprefix((getId(issue) || '').split('/', 2)[1]) }
          : undefined
      )
    );

    openPrintProgressModal();

    const printSrc = preview
      ? `${window.location.origin}/${unprefix(getId(journal))}/${unprefix(
          getScopeId(graph)
        )}/preview?${qs}`
      : `${window.location.origin}/${graph.slug ||
          unprefix(getScopeId(graph))}?${qs}`;

    // We print from a hidden iframe.
    // See https://developer.mozilla.org/en-US/docs/Web/Guide/Printing#Print_an_external_page_without_opening_it

    function closePrint() {
      // No idea why we need a timeout here but without it the browser freezes when we close the iframe
      const iframe = this.__container__ || window.__saPdfPrinterIframe__;

      if (iframe) {
        iframe.contentWindow.stop();
        setTimeout(() => {
          document.body.removeChild(iframe);
          window.focus();
        }, 200);
        delete window.__saPdfPrinterIframe__;
        iframe.contentWindow.removeEventListener('afterprint', closePrint);
        iframe.contentWindow.removeEventListener('beforeunload', closePrint);
      }

      closePrintProgressModal();
      window.removeEventListener('popstate', closePrint);
    }

    function setPrint() {
      // `this` is the iframe
      this.contentWindow.__container__ = this; // so that we can remove the iframe later (see closePrint)
      this.contentWindow.focus(); // Required for IE

      var that = this;
      //      function receiveMessage(event) {
      //        console.log('received from iframe', event);
      //        that.contentWindow.removeEventListener(
      //          'message',
      //          receiveMessage,
      //          false
      //        );
      //        // closePrint(that);
      //      }

      function startPrint() {
        that.contentWindow.focus(); // Required for IE

        // we let react the time to do all the caption measurements
        // TODO emit event to notify when ready...
        setTimeout(() => {
          closePrintProgressModal();
          console.log('calling print()');

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

      // this.contentWindow.addEventListener('message', receiveMessage);
      this.contentWindow.addEventListener('printable', startPrint);

      // window.postMessage('hello from iframe', window.location.origin);
      this.contentWindow.addEventListener('beforeunload', closePrint);
      this.contentWindow.addEventListener('afterprint', closePrint);
    }

    const iframe = document.createElement('iframe');
    this.iframe = iframe;
    window.__saPdfPrinterIframe__ = iframe;
    iframe.id = 'sa-pdf-printer';
    iframe.onload = setPrint;
    iframe.style.position = 'fixed';
    iframe.style.visibility = 'hidden';
    iframe.style.top = '0';
    iframe.style.left = '0';
    // iframe.style.right = '0';
    // iframe.style.bottom = '0';
    /*
    The width and height set here determine the window.innerWidth & innerHeight reading in the printable-resource
    They should match the *available* print area - ie. the page paper size minus @page margins
    */
    iframe.style.height = '9.75in'; /* 11in - 1.25 combined margin */
    iframe.style.width = '8.5in';

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
    return (
      <MenuItem
        icon={{ iconName: 'manuscript', size: '24px' }}
        onClick={this.handlePrint}
      >
        Print PDF
      </MenuItem>
    );
  }
}

export default connect(
  null,
  {
    openPrintProgressModal,
    closePrintProgressModal
  }
)(PrintPdfMenuItem);
