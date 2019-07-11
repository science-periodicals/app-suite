import React from 'react';
import isEqual from 'lodash/isEqual';

export default function withIsPrinting(ComposedComponent) {
  class WithIsPrinting extends React.Component {
    constructor(props) {
      super(props);

      this.state = { isPrinting: false, beforePrint: false, afterPrint: false };

      this.handleMql = this.handleMql.bind(this);
      this.handleBeforePrint = this.handleBeforePrint.bind(this);
      this.handleAfterPrint = this.handleAfterPrint.bind(this);
    }

    componentDidMount() {
      this.mql = window.matchMedia && window.matchMedia('print');
      if (this.mql) {
        this.mql.addListener(this.handleMql);
        this.handleMql(this.mql);
      }
      window.addEventListener('beforeprint', this.handleBeforePrint);
      window.addEventListener('afterprint', this.handleAfterPrint);
    }

    componentWillUnmount() {
      if (this.mql) {
        this.mql.removeListener(this.handleMql);
      }

      window.removeEventListener('beforeprint', this.handleBeforePrint);
      window.removeEventListener('afterprint', this.handleAfterPrint);
    }

    handleBeforePrint(e) {
      const nextState = {
        isPrinting: true,
        beforePrint: true,
        afterPrint: false
      };

      if (!isEqual(nextState, this.state)) {
        this.setState(nextState);
      }
    }

    handleAfterPrint(e) {
      const nextState = {
        isPrinting: false,
        beforePrint: false,
        afterPrint: true
      };

      if (!isEqual(nextState, this.state)) {
        this.setState(nextState);
      }
    }

    handleMql(mql) {
      const isPrinting = !!this.mql.matches;
      if (isPrinting !== this.state.isPrinting) {
        this.setState({ isPrinting });
      }
    }

    render() {
      return <ComposedComponent {...this.props} {...this.state} />;
    }
  }

  return WithIsPrinting;
}
