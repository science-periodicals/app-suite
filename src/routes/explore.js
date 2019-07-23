import { Router } from 'express';
import csurf from 'csurf';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Route, Switch, Redirect } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { applyMiddleware, createStore } from 'redux';
import { Provider } from 'react-redux';
import thunkMiddleware from 'redux-thunk';
import createError from '@scipe/create-error';
import { addDbVersion, addLibrarian, addCsrfToken } from '@scipe/api';
import { escJSON } from '@scipe/librarian';
import bundlePaths from '../utils/bundle-paths';
import rootReducer from '../reducers/root-reducer';
import { searchJournals } from '../actions/journal-action-creators';
import { searchArticles } from '../actions/article-action-creators';
import { searchRfas } from '../actions/rfa-action-creators';
import Explorer from '../components/explorer';

const router = new Router({ caseSensitive: true });
const csrf = csurf({ cookie: false });

// !! There will be a warning client side as the client side uses Suspense and
// suspense is not yet supported for SSR

router.get(
  '/:type(rfas|journals|articles)?', // default to rfas
  csrf,
  addCsrfToken,
  addDbVersion,
  addLibrarian,
  (req, res, next) => {
    checkCouchLogin(req, (err, ok) => {
      if (err) return next(err);
      if (!ok) {
        return next(createError(403, 'Need to re-login'));
      }

      getUser(req, (err, user) => {
        if (err) {
          return next(err);
        }
        res.header('Vary', 'Accept');
        bundlePaths(['main', 'Explorer'], (err, bundles) => {
          if (err) return next(err);

          // TODO uncomment true
          // SSR is currently disabled as we need to fix the MORE button nav
          if (true || req.app.locals.config.disableSsr) {
            res.render('index', {
              escJSON,
              bundles,
              initialState: { user },
              resetPouchDB: req.session && req.session.resetPouchDB
            });
          } else {
            // SSR
            const cookie = req.headers.cookie;

            const routerContext = {};
            const helmetContext = {};

            const store = createStore(
              rootReducer,
              { user },
              applyMiddleware(thunkMiddleware)
            );

            const baseUrl = `${req.protocol}://${req.headers['x-ssr-host'] ||
              req.app.locals.config['X-SSR-Host'] ||
              req.headers.host}`; // x-ssr-host is used for testing

            let p;
            switch (req.params.type) {
              case 'rfas':
                p = store.dispatch(
                  searchRfas({
                    query: req.query,
                    cookie,
                    baseUrl
                  })
                );
                break;

              case 'journals':
                p = store.dispatch(
                  searchJournals({ query: req.query, cookie, baseUrl })
                );
                break;

              case 'articles':
                p = store.dispatch(
                  searchArticles({
                    query: req.query,
                    cookie,
                    baseUrl
                  })
                );
                break;

              default:
                p = Promise.resolve();
                break;
            }

            p.then(() => {
              const html = renderToString(
                <HelmetProvider context={helmetContext}>
                  <Provider store={store}>
                    <StaticRouter
                      location={req.originalUrl}
                      context={routerContext}
                    >
                      <Switch>
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

                res.render('index', {
                  ssr: true,
                  // ssrOnly: true, // for debugging
                  bundles,
                  escJSON,
                  helmet,
                  html,
                  initialState: store.getState(),
                  resetPouchDB: req.session && req.session.resetPouchDB
                });
              }
            }).catch(err => {
              return next(err);
            });
          }
        });
      });
    });
  }
);

export default router;

function checkCouchLogin(req, callback) {
  if (!req.session.username) {
    callback(null, true);
  } else {
    req.librarian.checkCouchLogin(callback);
  }
}

function getUser(req, callback) {
  if (!req.session.username) {
    callback(null, {});
  } else {
    req.librarian.getAppSuiteUser(`user:${req.session.username}`, callback);
  }
}
