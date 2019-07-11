import fs from 'fs';
import path from 'path';
import asyncParallel from 'async/parallel';
import { arrayify } from '@scipe/jsonld';

const manifestType =
  process.env.NODE_ENV === 'production' || process.env.CI ? 'prod' : 'dev'; // on CI app-suite-bundle-manifest-dev won't be defined

const appData = {
  manifestPath: path.resolve(
    __dirname,
    `../../public/assets/app-suite-bundle-manifest-${manifestType}.json`
  ),
  lastSeen: 0,
  cache: {},
  retries: 10
};

const workersData = {
  manifestPath: path.resolve(
    __dirname,
    `../../public/assets/app-suite-worker-bundle-manifest-${manifestType}.json`
  ),
  lastSeen: 0,
  cache: {},
  retries: 10
};

export default function bundlePaths(
  chunkNames, // list of 'Reader', 'Sifter', 'JournalPage', 'Dashboard', 'Settings', 'Explorer', 'Publisher'
  callback
) {
  if (!callback) {
    callback = chunkNames;
    chunkNames = undefined;
  }

  asyncParallel(
    {
      app: cb => {
        load(chunkNames, appData, cb);
      },
      workers: cb => {
        load(chunkNames, workersData, cb);
      }
    },
    (err, configs) => {
      if (err) return callback(err);
      const config = Object.assign({}, configs.app, configs.workers);

      if (chunkNames) {
        Object.keys(config).forEach(composedChunkName => {
          if (
            !arrayify(chunkNames).some(chunkName =>
              composedChunkName.includes(chunkName)
            )
          ) {
            config[composedChunkName].prefetch = true;
          }
        });
      }

      callback(null, config);
    }
  );
}

function load(chunkNames, data, callback) {
  fs.stat(data.manifestPath, (err, info) => {
    if (err) {
      if (err.code === 'ENOENT') {
        if (!data.retries) return callback(err);
        data.retries--;
        return setTimeout(() => bundlePaths(chunkNames, callback), 1000);
      }
      return callback(err);
    }

    // !! info.mtime.getTime() can be 0 on AWS
    if (
      info.mtime.getTime() > data.lastSeen ||
      info.birthtime.getTime() > data.lastSeen
    ) {
      return fs.readFile(data.manifestPath, 'utf8', (err, manifest) => {
        if (err) return callback(err);
        try {
          data.lastSeen = info.mtime.getTime();
          data.cache = JSON.parse(manifest);
        } catch (err) {
          return callback(err);
        }
        callback(null, data.cache);
      });
    }
    callback(null, data.cache);
  });
}
