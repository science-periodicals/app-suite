import { Router } from 'express';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Route } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { applyMiddleware, createStore } from 'redux';
import { Provider } from 'react-redux';
import thunkMiddleware from 'redux-thunk';
import { escJSON } from '@scipe/librarian';
import { addDbVersion, addLibrarian } from '@scipe/api';
import bundlePaths from '../utils/bundle-paths';
import UserPage from '../components/user-page';
import rootReducer from '../reducers/root-reducer';
import { fetchProfile } from '../actions/user-action-creators';

const router = new Router({ caseSensitive: true });

router.get('/:userId', addDbVersion, addLibrarian, (req, res, next) => {
  const routerContext = {};
  const helmetContext = {};

  const store = createStore(rootReducer, {}, applyMiddleware(thunkMiddleware));
  const baseUrl = `${req.protocol}://${req.headers['x-ssr-host'] ||
    req.app.locals.config['X-SSR-Host'] ||
    req.headers.host}`; // x-ssr-host is used for testing

  store
    .dispatch(
      fetchProfile(`user:${req.params.userId}`, {
        baseUrl,
        cookie: req.headers.cookie
      })
    )
    .then(() => {
      bundlePaths(['main'], (err, bundles) => {
        if (err) return next(err);

        if (req.app.locals.config.disableSsr) {
          res.render('index', {
            escJSON,
            initialState: store.getState(),
            bundles,
            prefetchManifest: req.app.locals.config.prefetchManifest
          });
        } else {
          const html = renderToString(
            <HelmetProvider context={helmetContext}>
              <Provider store={store}>
                <StaticRouter
                  location={req.originalUrl}
                  context={routerContext}
                >
                  <Route
                    exact={true}
                    path="/about/:userId"
                    component={UserPage}
                  />
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

            res.render('index', {
              ssr: true,
              // ssrOnly: true, // for debugging
              escJSON,
              helmet,
              html,
              initialState: store.getState(),
              bundles,
              prefetchManifest: req.app.locals.config.prefetchManifest
            });
          }
        }
      });
    })
    .catch(err => {
      return next(err);
    });
});

export default router;
