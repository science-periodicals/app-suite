import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { HelmetProvider } from 'react-helmet-async';
import { Provider as ReduxProvider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { DragDropContextProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import { StripeProvider } from 'react-stripe-elements';
// Comment out for offline dev
// function StripeProvider(props) {
//   return props.children;
// }

import config from './utils/config';
import Routes from './components/routes';
import ScreenDimProvider from './components/screen-dim-provider';
import IsOfflineProvider from './components/is-offline-provider';

import './app.css';

class AppProvider extends Component {
  static propTypes = {
    store: PropTypes.any.isRequired
  };

  render() {
    const { store } = this.props;

    return (
      <DragDropContextProvider backend={HTML5Backend}>
        <HelmetProvider>
          <ReduxProvider store={store}>
            <StripeProvider apiKey={config.stripePublishableKey}>
              <BrowserRouter>
                <ScreenDimProvider>
                  <IsOfflineProvider>
                    <Routes />
                  </IsOfflineProvider>
                </ScreenDimProvider>
              </BrowserRouter>
            </StripeProvider>
          </ReduxProvider>
        </HelmetProvider>
      </DragDropContextProvider>
    );
  }
}

export default AppProvider;
