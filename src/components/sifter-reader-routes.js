import React, { Component, Suspense } from 'react';
import { Route, Switch } from 'react-router-dom';
import ErrorPage from './error-page';
import LoadingPage from './loading-page';

const Sifter = React.lazy(() =>
  import(/* webpackChunkName: "Sifter" */ './sifter/sifter')
);
const Reader = React.lazy(() =>
  import(/* webpackChunkName: "Reader" */ './reader/reader')
);
const JournalPage = React.lazy(() =>
  import(/* webpackChunkName: "JournalPage" */ './sifter/journal-page')
);

export default class SifterReaderRoutes extends Component {
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
    const { error } = this.state;
    if (error) {
      return <ErrorPage error={error} />;
    }

    return (
      <Suspense fallback={<LoadingPage />}>
        {/* Note: the Switch is currently duplicated in vhost-sifter-ssr.js to avoid React.lazy */}
        <Switch>
          <Route
            exact={true}
            path="/"
            render={props => <Sifter {...props} mode="journal" />}
          />
          <Route
            exact={true}
            path="/rfas"
            render={props => <Sifter {...props} mode="requests" />}
          />
          <Route exact={true} path="/rfas/:rfaId" component={JournalPage} />
          <Route
            exact={true}
            path="/issues"
            render={props => <Sifter {...props} mode="issues" />}
          />
          <Route
            exact={true}
            path="/issue/:issueId"
            render={props => <Sifter {...props} mode="issue" />}
          />
          <Route
            exact={true}
            path="/about/(journal|staff)"
            component={JournalPage}
          />
          <Route exact={true} path="/:slug" component={Reader} />
        </Switch>
      </Suspense>
    );
  }
}
