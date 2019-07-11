import http from 'http';
import { api } from '@scipe/api';
import { appSuite, createSessionMiddleware } from '../../src';
import express from 'express';
import {
  createExpressLoggerMiddleware,
  createExpressErrorLoggerMiddleware
} from '@scipe/express-logger';
import enableDestroy from 'server-destroy';

export default function createServer(
  config = { log: { name: 'test', level: 'fatal' } }
) {
  const app = express();
  app.use(createSessionMiddleware(config));
  app.use(createExpressLoggerMiddleware(config));
  app.use(api(config));
  app.use(appSuite(config));
  app.use(createExpressErrorLoggerMiddleware(config));

  const server = http.createServer(app);
  enableDestroy(server);

  return server;
}
