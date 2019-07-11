import React, { Component, Suspense } from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';
import PropTypes from 'prop-types';
import ErrorPage from './error-page';
import LoadingPage from './loading-page';
import config from '../utils/config';
import PrivateRoute from './private-route';
import RemoteDataProvider from './remote-data-provider';
import Login from './login';
import Register from './register';
import ResetPasswordPage from './reset-password-page';
import CreateJournal from './create-journal';
import CreateOrganization from './create-organization';

import ReplicationFromPouchToCouchProvider from './replication-from-pouch-to-couch-provider';
import UserPage from './user-page';
import InvoicePage from './invoice-page';
import SifterReaderRoutes from './sifter-reader-routes';
import PouchDataProvider from './pouch-data-provider';

const Settings = React.lazy(() =>
  import(/* webpackChunkName: "Settings" */ './settings/settings')
);
const Dashboard = React.lazy(() =>
  import(/* webpackChunkName: "Dashboard" */ './dashboard/dashboard')
);
const Explorer = React.lazy(() =>
  import(/* webpackChunkName: "Explorer" */ './explorer')
);

export default class Routes extends Component {
  static propTypes = {
    isJournalSubdomain: PropTypes.bool
  };

  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  render() {
    const { isJournalSubdomain = config.isJournalSubdomain } = this.props;
    const { error } = this.state;
    if (error) {
      return <ErrorPage error={error} />;
    }

    return (
      <Switch>
        <Route exact={true} path="/register/:username?" component={Register} />
        <Route exact={true} path="/login" component={Login} />
        <Route
          exact={true}
          path="/reset-password/:username"
          component={ResetPasswordPage}
        />

        <Route
          render={props => (
            <ReplicationFromPouchToCouchProvider {...props}>
              {/* Replication from PouchToCouch is started as early as possible and should only be stopped when user leaves the app so we maximize chances to get the data replicated back to the server */}

              <Switch>
                {!isJournalSubdomain && (
                  <Route
                    exact={true}
                    path="/about/:userId"
                    component={UserPage}
                  />
                )}

                {/* everything relying on sync (replication pouch <-> couch) */}
                {/* PouchDataProvider handles publisher */}
                <Route
                  exact={true}
                  path="/:journalId/:graphId/:mode(preview|submission)"
                  render={props => (
                    <PrivateRoute
                      exact={true}
                      path="/:journalId/:graphId/:mode(preview|submission)"
                      component={PouchDataProvider}
                    />
                  )}
                />

                {/* everything relying on the remote changes feed */}

                <Route
                  render={props => (
                    <RemoteDataProvider {...props}>
                      <Suspense fallback={<LoadingPage />}>
                        <Switch>
                          <PrivateRoute
                            exact={true}
                            path="/new/journal"
                            component={CreateJournal}
                          />
                          <PrivateRoute
                            exact={true}
                            path="/new/organization"
                            component={CreateOrganization}
                          />

                          <PrivateRoute
                            exact={true}
                            path="/settings/organization/:organizationId/billing/invoice/:invoiceId"
                            component={InvoicePage}
                          />

                          <PrivateRoute path="/settings" component={Settings} />

                          <Route
                            exact={true}
                            path="/explore"
                            render={props => <Redirect to="/explore/rfas" />}
                          />

                          <Route
                            exact={true}
                            path="/explore/journals"
                            render={props => (
                              <Explorer {...props} mode="journals" />
                            )}
                          />
                          <Route
                            exact={true}
                            path="/explore/articles"
                            render={props => (
                              <Explorer {...props} mode="articles" />
                            )}
                          />
                          <Route
                            exact={true}
                            path="/explore/rfas"
                            render={props => (
                              <Explorer {...props} mode="requests" />
                            )}
                          />

                          {isJournalSubdomain ? (
                            <SifterReaderRoutes />
                          ) : (
                            <PrivateRoute path="/" component={Dashboard} />
                          )}
                        </Switch>
                      </Suspense>
                    </RemoteDataProvider>
                  )}
                />
              </Switch>
            </ReplicationFromPouchToCouchProvider>
          )}
        />
      </Switch>
    );
  }
}
