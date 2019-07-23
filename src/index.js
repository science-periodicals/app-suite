import '@babel/polyfill';
import path from 'path';
import express from 'express';
import expressSession from 'express-session';
import connectRedis from 'connect-redis';
import zmq from 'zeromq';
import { validateBasicAuthCredentials } from '@scipe/api';
import { getRedisConfig, getDbName } from '@scipe/librarian';
import registerRoutes from './routes/register';
import loginRoutes from './routes/login';
import resetPasswordRoutes from './routes/reset-password-routes';
import logoutRoutes from './routes/logout';
import appRoutes from './routes/app';
import demoRoutes from './routes/demo-routes';
import userRoutes from './routes/user-routes';
import pouchRoutes from './routes/pouch-routes';
import purlRoutes from './routes/purl';
import exploreRoutes from './routes/explore';
import vhostSifter from './middlewares/vhost-sifter';
import vhostReader from './middlewares/vhost-reader';

// used to prefetch the app-suite bundle from `@scienceai/documentation`
// (<link rel="prefetch" href=... />)
export const bundleManifestPath = path.join(
  path.dirname(__dirname),
  '/public/assets/app-suite-bundle-manifest-prod.json'
);

export function createSessionMiddleware(config = {}) {
  const RedisStore = connectRedis(expressSession);

  return expressSession(
    Object.assign(
      {
        name: 'scipe.sid',
        resave: false,
        saveUninitialized: false,
        store: new RedisStore(
          Object.assign({}, getRedisConfig(config), {
            prefix: `${getDbName(config)}:sess:`
          })
        ),
        secret:
          config.sessionSecret || process.env['SESSION_SECRET'] || 'secret'
      },
      config.sessionCookie
        ? {
            cookie: config.sessionCookie
          }
        : undefined
    )
  );
}

export function assets(config = {}) {
  const expressStatic = express.static(
    path.join(path.dirname(__dirname), 'public')
  );
  const app = express();
  app.use(expressStatic);
  return app;
}

export function appSuite(config = {}) {
  const app = express();

  app.enable('case sensitive routing');
  app.set('views', path.join(path.dirname(__dirname), 'views'));
  app.set('view engine', 'ejs');

  app.locals.config = Object.assign(
    {
      acl: true,
      getUnLoggedInUserRedirectPath(req) {
        return '/get-started';
      },
      restrictFreeAccounts: false,
      anonymize:
        config.anonymize != null
          ? config.anonymize
          : process.env.ANONYMIZE != null
          ? process.env.ANONYMIZE
          : true
    },
    config
  );
  app.locals.DB_VERSION = app.locals.config.dbVersion || '';
  app.locals.openRegistration = app.locals.config.openRegistration;

  // Needed for Stripe.js
  app.locals.stripePublishableKey =
    app.locals.config.stripePublishableKey ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    'pk_test_key';

  // vhost middlewares: used to serve sci.pe subdomains.
  // vhost middlewares must be called first and in the right order

  // must be called first
  // /
  // /about/...
  // /issues
  // /issue/:issueId
  app.use(
    app.locals.config.disableSsr
      ? vhostSifter
      : require('./middlewares/vhost-sifter-ssr').default
  );

  // Must be called second
  // /:articleSlug
  app.use(
    app.locals.config.disableSsr
      ? vhostReader
      : require('./middlewares/vhost-reader-ssr').default
  );

  app.use('/purl', validateBasicAuthCredentials, purlRoutes);

  // explore pages (SSR)
  app.use('/explore', validateBasicAuthCredentials, exploreRoutes);

  // register
  app.use('/register', validateBasicAuthCredentials, registerRoutes);

  // login
  app.use('/login', validateBasicAuthCredentials, loginRoutes);
  app.use('/logout', validateBasicAuthCredentials, logoutRoutes);

  // reset password
  app.use('/reset-password', validateBasicAuthCredentials, resetPasswordRoutes);

  // pouch
  app.use('/pouch', validateBasicAuthCredentials, pouchRoutes);

  // demos
  app.use('/demo', validateBasicAuthCredentials, demoRoutes);

  app.use(
    '/new/:type(journal|submission|organization)',
    validateBasicAuthCredentials,
    appRoutes
  );
  app.use('/settings', validateBasicAuthCredentials, appRoutes);
  app.use(
    '/settings/:category(profile|contact-points|password)/:subCategory(bio|subjects|affiliations)?',
    validateBasicAuthCredentials,
    appRoutes
  );
  app.use(
    '/settings/journal/:journalId?/:category(journal|staff|workflows|types|issues|articles|rfas|access|style|organization|issues)?',
    validateBasicAuthCredentials,
    (req, res, next) => {
      req.journalId = `journal:${req.params.journalId}`;
      next();
    },
    appRoutes
  );
  app.use(
    '/settings/organization/:organizationId/:category(organization|contact-points|admins|services|payments|discounts|billing)?',
    validateBasicAuthCredentials,
    (req, res, next) => {
      req.organizationId = `org:${req.params.organizationId}`;
      next();
    },
    appRoutes
  );

  // printable invoice
  app.use(
    '/settings/organization/:organizationId/billing/invoice/:invoiceId',
    validateBasicAuthCredentials,
    (req, res, next) => {
      req.organizationId = `org:${req.params.organizationId}`;
      next();
    },
    appRoutes
  );

  // special case as it needs to be available when user is logged out
  app.use('/about' /* /:userId */, validateBasicAuthCredentials, userRoutes);

  app.use(
    '/:journalId/:graphId/:mode(preview|submission)',
    validateBasicAuthCredentials,
    (req, res, next) => {
      req.journalId = `journal:${req.params.journalId}`;
      req.graphId = `graph:${req.params.graphId}`;
      next();
    },
    appRoutes
  );

  app.use('/', validateBasicAuthCredentials, appRoutes);

  return app;
}

export function setUpSocketIoServer(app, io, sessionMiddleware, config = {}) {
  // add authentication to ws
  // see http://stackoverflow.com/questions/25532692/how-to-share-sessions-with-socket-io-1-x-and-express-4-x/25618636#25618636
  io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res, next);
  });

  // user must be logged in to use ws
  io.use((socket, next) => {
    if (socket.request.session.userId) {
      next();
    } else {
      next(new Error('Authentification error'));
    }
  });

  const EVENT_NAME = config.eventName || 'WORKER_DATA';
  const XPUB_ENDPOINT =
    config.brokerXpubConnectEndpoint ||
    process.env.BROKER_XPUB_CONNECT_ENDPOINT ||
    'tcp://127.0.0.1:3001';

  const sub = zmq.socket('sub');

  sub.connect(XPUB_ENDPOINT);

  sub.subscribe('');
  sub.on('message', function(userId, workerData) {
    userId = userId.toString();
    workerData = workerData.toString(); // TODO directly send the buffer

    const ns = io.of('/');
    // TODO if we use the redis adapter, use https://github.com/socketio/socket.io/#namespaceclientsfnfunction
    for (let id in ns.connected) {
      if (ns.connected.hasOwnProperty(id)) {
        if (ns.connected[id].request.session.userId === userId) {
          ns.connected[id].emit(EVENT_NAME, workerData); // or io.to(id).emit(EVENT_NAME, workerData);
          // we do not `break;` as there could be many clients with
          // the same userId connected at any given time (e.g. someone
          // with 2 browsers open that forgot to logout in one of the
          // browser...
        }
      }
    }
  });

  io.on('connection', function(ws) {
    ws.on('join', function(room) {
      ws.join(room);
    });

    ws.on('leave', function(room) {
      ws.leave(room);
    });
  });

  app.locals.io = io;

  return { sub };
}

export {
  createErrorPageMiddleware
} from './middlewares/create-error-page-middleware';
