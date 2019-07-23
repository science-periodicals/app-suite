import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Route } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { applyMiddleware, createStore } from 'redux';
import { Provider } from 'react-redux';
import thunkMiddleware from 'redux-thunk';
import { getId } from '@scipe/jsonld';
import { escJSON } from '@scipe/librarian';
import Reader from '../components/reader/reader';
import rootReducer from '../reducers/root-reducer';
import { fetchGraph } from '../actions/graph-action-creators';
import { fetchJournal } from '../actions/journal-action-creators';
import bundlePaths from '../utils/bundle-paths';
import vhostDataReader from './vhost-data-reader';

// !! There will be a warning client side as the client side uses Suspense and
// suspense is not yet supported for SSR

/**
 * !! See also vhost-reader.js for the non SSR version
 */
export default function vhostReaderSsr(req, res, next) {
  vhostDataReader(req, res, (err, state) => {
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

    const slug = req.path.replace(/^\//, '').replace(/\/$/, '');

    Promise.all([
      store.dispatch(
        fetchGraph(slug, {
          query: req.query,
          baseUrl,
          cookie: req.headers.cookie,
          reader: true
        })
      ),
      store.dispatch(
        fetchJournal(getId(state.homepage), {
          query: req.query,
          baseUrl,
          cookie: req.headers.cookie,
          homepage: true
        })
      )
    ])
      .then(() => {
        const html = renderToString(
          <HelmetProvider context={helmetContext}>
            <Provider store={store}>
              <StaticRouter location={req.url} context={routerContext}>
                <Route exact={true} path="/:slug" component={Reader} />
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

          bundlePaths(['main', 'Reader'], (err, bundles) => {
            if (err) return next(err);

            res.render('index', {
              isJournalSubdomain: true,
              ssr: true,
              // ssrOnly: true, // for debugging
              escJSON,
              helmet,
              html,
              initialState: store.getState(),
              bundles,
              prefetchManifest: req.app.locals.config.prefetchManifest,
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
