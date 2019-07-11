import uuid from 'uuid';
import { JSDOM } from 'jsdom';
import { getId, unprefix } from '@scipe/jsonld';
import createError from '@scipe/create-error';
import { Librarian, createId } from '@scipe/librarian';

import { client } from './config';

export default function register(user, { login = false } = {}, callback) {
  user = Object.assign(
    {
      '@id': `user:${uuid.v1()}`,
      name: 'peter',
      password: uuid.v4(),
      email: `mailto:success+${uuid.v1()}@simulator.amazonses.com`
    },
    user
  );

  const librarian = new Librarian();
  const tokenId = createId('token')['@id'];

  librarian.post(
    {
      '@type': 'RegisterAction',
      actionStatus: 'ActiveActionStatus',
      agent: user,
      instrument: {
        '@type': 'Password',
        value: user.password
      }
    },
    { tokenId, strict: false },
    (err, activeRegisterAction) => {
      if (err) return callback(err);

      librarian.post(
        Object.assign({}, activeRegisterAction, {
          actionStatus: 'CompletedActionStatus',
          instrument: {
            '@id': tokenId,
            '@type': 'Token',
            tokenType: 'registrationToken'
          }
        }),
        (err, registerAction) => {
          if (err) return callback(err);

          if (!login) {
            return callback(
              null,
              Object.assign(
                {
                  auth: {
                    username: unprefix(getId(user)),
                    password: user.password
                  }
                },
                user
              )
            );
          }

          // login the registered user
          const jar = client.jar();

          client.get(
            {
              url: '/login',
              jar
            },
            (err, resp, body) => {
              if ((err = createError(err, resp, body))) {
                return callback(err);
              }

              const { document } = new JSDOM(body).window;
              const csrf = document.querySelector('meta[name="csrf-token"]')
                .content;

              client.post(
                {
                  url: '/login',
                  headers: { 'X-CSRF-Token': csrf },
                  jar,
                  json: {
                    username: unprefix(getId(user)),
                    password: user.password
                  }
                },
                (err, resp, body) => {
                  if ((err = createError(err, resp, body))) {
                    return callback(err);
                  }
                  callback(
                    null,
                    Object.assign(
                      {
                        jar,
                        auth: {
                          username: unprefix(getId(user)),
                          password: user.password
                        }
                      },
                      user
                    )
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
