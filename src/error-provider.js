import React from 'react';
import PropTypes from 'prop-types';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import ErrorPage from './components/error-page';

import './app.css';

export default class ErrorProvider extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    error: PropTypes.shape({
      description: PropTypes.string,
      statusCode: PropTypes.number
    })
  };

  render() {
    const { user, error } = this.props;

    return (
      <HelmetProvider>
        <BrowserRouter>
          <ErrorPage user={user} error={error} />
        </BrowserRouter>
      </HelmetProvider>
    );
  }
}
