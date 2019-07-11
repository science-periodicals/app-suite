import '@babel/polyfill';
import raf from 'raf';
import smoothscrollPolyfill from 'smoothscroll-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import { applyMiddleware, createStore } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { createLogger } from 'redux-logger';
import PouchDB from 'pouchdb';
import pouchdbUpsert from 'pouchdb-upsert';
import { getId } from '@scipe/jsonld';

import onChangeMiddleware from './middlewares/on-change-middleware';
import annotationMiddleware from './middlewares/annotation-middleware';
import createSocketIoMiddleware from './middlewares/create-socket-io-middleware';
import bufferer from './middlewares/bufferer';
import rootReducer from './reducers/root-reducer';
import ErrorProvider from './error-provider';

window.__forceSmoothScrollPolyfill__ = true;
smoothscrollPolyfill.polyfill();
raf.polyfill();
PouchDB.plugin(pouchdbUpsert);

function render(config, store) {
  const AppProvider = require('./app-provider').default;

  ReactDOM[config.ssr ? 'hydrate' : 'render'](
    <AppProvider store={store} />,
    document.getElementById('app')
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const initialState = window.__INITIAL_STATE__;
  const config = window.__CONFIG__;

  // special case for server side errors
  // we display a basic error page (no need for redux etc.)
  if (config.error) {
    ReactDOM[config.ssr ? 'hydrate' : 'render'](
      <ErrorProvider {...initialState} />,
      document.getElementById('app')
    );
    return;
  }

  // we print from iframe => in print mode we don't load all the middlewares to keep things fast
  const inIframe = window !== window.parent;
  const middlewares = [thunkMiddleware, bufferer, onChangeMiddleware];
  if (
    !inIframe &&
    !config.ci // in CI (backstopjs integration test, we don't rely on ws so that we can use networkidle0 in puppeteer
  ) {
    middlewares.push(annotationMiddleware, createSocketIoMiddleware());
  }

  if (
    window.location.hostname === 'nightly.sci.pe' ||
    process.env.NODE_ENV === 'development'
  ) {
    middlewares.push(
      createLogger({
        collapsed: true,
        level: 'info'
      })
    );
  }

  const state = Object.assign(initialState, {
    pouch: {
      db: new PouchDB(
        `${process.env.DB_NAME || 'scienceai'}-${[
          getId(initialState.user),
          config.DB_VERSION
        ]
          .filter(Boolean)
          .join('-')}`,
        {
          auto_compaction: true,
          fetch: function(url, opts) {
            opts.credentials = 'include';
            opts.headers.set('X-PouchDB', 'true');
            return PouchDB.fetch(url, opts);
          }
        }
      ),
      remote: new PouchDB(
        `${window.location.origin}/${process.env.DB_NAME ||
          'scienceai'}__${config.DB_VERSION || ''}__`,
        {
          fetch: function(url, opts) {
            opts.credentials = 'include';
            opts.headers.set('X-PouchDB', 'true');
            return PouchDB.fetch(url, opts);
          }
        }
      )
    }
  });

  const store = createStore(
    rootReducer,
    state,
    applyMiddleware(...middlewares)
  );

  window.onbeforeunload = function() {
    const {
      pouch: { repFromPouchToCouchStatus }
    } = store.getState();
    if (
      repFromPouchToCouchStatus &&
      repFromPouchToCouchStatus !== 'paused' &&
      repFromPouchToCouchStatus !== 'error'
    ) {
      return 'Documents still syncing. If you leave now, your latest changes will be saved but your collaborators (if any) will not be able to see them';
    }
  };

  if (config.ci) {
    window.addEventListener('load', e => {
      // needed for backstop.js `readyEvent` prop
      console.log('TEST_DATA_LOAD');
    });
  }

  // Note: this is currently used in <Annotable /> to access the redux store (see <CtxFwd /> in `measure` method)
  window.store = store;

  if (module.hot) {
    // See https://blog.isquaredsoftware.com/2016/11/practical-redux-part-3-project-planning-and-setup/
    module.hot.accept('./app-provider', () => {
      setTimeout(() => {
        render(config, store);
      }, 0);
    });
  }

  render(config, store);
});
