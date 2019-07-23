import http from 'http';
import path from 'path';
import express from 'express';
import socketIo from 'socket.io';
import { createAppSuiteBackstopConfig } from '@scipe/stories';
import resources from '@scipe/resources';
import {
  createExpressLoggerMiddleware,
  createExpressErrorLoggerMiddleware
} from '@scipe/express-logger';
import createError from '@scipe/create-error';
import { api, assets as apiAssets } from '@scipe/api';
import ontologist from '@scipe/ontologist';
import {
  appSuite,
  assets,
  setUpSocketIoServer,
  createSessionMiddleware,
  createErrorPageMiddleware
} from './';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import webpackConfig from '../webpack.config';

const compiler = webpack(webpackConfig);

const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT_HTTP || 3000;

const hmr = process.env.HMR === 'false' ? false : true;

const config = {
  acl: true,
  ci: String(process.env.CI) === 'true', // needed for testing with backstop JS so we console.log a `readyEvent` (`TEST_DATA_READY`) when NODE_ENV is `production` and remove some middleware (websocket etc.),
  backstop: createAppSuiteBackstopConfig(),
  rateLimiter: (req, res, next) => {
    next();
  },
  anonymize: true,
  log: {
    name: 'appSuite',
    level: 'error'
  },
  cache: true, // Note set to `true` to debug cache bugs
  openRegistration: false,
  skipPayments: true, // set to false
  emailService: 'ses', // comment out to prevent email
  disableSsr: process.env.NODE_ENV !== 'production',
  blobStorageBackend: 'fs', // or 'S3'
  // s3BlobStoreRoot: 'sa-blobs-platform-dev'
  fsBlobStoreRoot:
    process.env.FS_BLOB_STORE_ROOT || path.resolve(__dirname, '../blobs'),
  getUnLoggedInUserRedirectPath(req) {
    return '/login';
  },
  'X-SSR-Host': `${host}:${port}`, // for when we test with NODE_ENV === `production`
  reNoLog: /__([A-Za-z0-9\-\.]*)__/ // exclude couchdb reverse proxy logs
};

const sessionMiddleware = createSessionMiddleware(config);
const app = express();

if (process.env.NODE_ENV === 'development') {
  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: webpackConfig.output.publicPath
    })
  );
  if (hmr) {
    app.use(webpackHotMiddleware(compiler));
  }
}

app.use(sessionMiddleware);

app.use(resources(config));
app.use(assets(config));
app.use(apiAssets(config));
app.use(createExpressLoggerMiddleware(config));

app.use(ontologist(config));
app.use(api(config));
app.use(appSuite(config));
app.use(createExpressErrorLoggerMiddleware(config));
app.use((req, res, next) => {
  next(createError(404));
});
app.use(createErrorPageMiddleware(config));

const server = http.createServer(app);
const io = socketIo(server);

setUpSocketIoServer(app, io, sessionMiddleware, config);

server.listen(port, () => {
  console.warn(
    `Server running on port ${port} (${host}, NODE_ENV=${process.env.NODE_ENV}, HMR=${hmr}, CI=${config.ci})`
  );
});
