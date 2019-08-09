import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Switch, Route } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { applyMiddleware, createStore } from 'redux';
import { Provider } from 'react-redux';
import thunkMiddleware from 'redux-thunk';

import { escJSON } from '@scipe/librarian';
import Sifter from '../components/sifter/sifter';
import JournalPage from '../components/sifter/journal-page';
import rootReducer from '../reducers/root-reducer';
import { fetchActiveInvites } from '../actions/invite-action-creators';
import bundlePaths from '../utils/bundle-paths';
import vhostDataSifter from './vhost-data-sifter';

// !! There will be a warning client side as the client side uses Suspense and
// suspense is not yet supported for SSR

/**
 * !! This is the SSR version. See also vhost.js for the non SSR version for local dev...
 * check if the HOST is a journal hosted by sci.pe, if so serve it, otherwise pass down...
 * This must be called first
 */
export default function vhostSifterSsr(req, res, next) {
  vhostDataSifter(req, res, (err, state) => {
    if (err) return next(err);
    if (!state) return next();

    const routerContext = {};
    const helmetContext = {};

    const store = createStore(
      rootReducer,
      state,
      applyMiddleware(thunkMiddleware)
    );
    const baseUrl = `${req.protocol}://${req.headers['x-ssr-host'] ||
      req.app.locals.config['X-SSR-Host'] ||
      req.headers.host}`; // x-ssr-host is used for testing

    const toFetch = [
      store.dispatch(
        fetchActiveInvites({
          query: req.query,
          baseUrl,
          cookie: req.headers.cookie
        })
      )
    ];

    // Note: we do not fetch the list of article or issue or rfa
    // this is done client side.
    // this is _not_ an issue for SEO as the explorer router is SSR
    // and takes care of that role

    Promise.all(toFetch)
      .then(() => {
        const html = renderToString(
          <HelmetProvider context={helmetContext}>
            <Provider store={store}>
              <StaticRouter location={req.url} context={routerContext}>
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
                  <Route
                    exact={true}
                    path="/rfas/:rfaId"
                    component={JournalPage}
                  />
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
                </Switch>
              </StaticRouter>
            </Provider>
          </HelmetProvider>
        );

        if (routerContext.url) {
          res.writeHead(301, {
            Location: routerContext.url
          });
          res.end();
        } else {
          const { helmet } = helmetContext;

          bundlePaths(['main', 'Sifter', 'JournalPage'], (err, bundles) => {
            if (err) return next(err);
            res.render('index', {
              ssr: true,
              // ssrOnly: true, for debugging
              isJournalSubdomain: true,
              escJSON,
              helmet,
              html,
              bundles,
              prefetchManifest: req.app.locals.config.prefetchManifest,
              initialState: store.getState(),
              resetPouchDB: req.session && req.session.resetPouchDB
            });
          });
        }
      })
      .catch(err => {
        return next(err);
      });
  });
}
