import assert from 'assert';
import querystring from 'querystring';
import { getId } from '@scipe/jsonld';
import createError from '@scipe/create-error';
import createServer from './utils/create-server';
import { client, portHttp } from './utils/config';
import register from './utils/register';

describe('login', function() {
  this.timeout(40000);

  describe('password-less login', () => {
    let server, user, admin;
    before(done => {
      server = createServer();

      server.listen(portHttp, () => {
        register(
          {
            name: 'admin user',
            memberOf: 'acl:admin'
          },
          { login: false },
          (err, _admin) => {
            if (err) return done(err);
            admin = _admin;
            register(
              { name: 'normal user' },
              { login: false },
              (err, _user) => {
                if (err) return done(err);
                user = _user;
                done();
              }
            );
          }
        );
      });
    });

    it('should allow password-less login', done => {
      // Get an auth token as an admin using BasicAuth
      client.post(
        {
          url: '/action',
          json: {
            '@type': 'CreateAuthenticationTokenAction',
            actionStatus: 'CompletedActionStatus',
            agent: getId(admin),
            object: getId(user)
          },
          auth: admin.auth
        },
        (err, resp, body) => {
          if ((err = createError(err, resp, body))) {
            return done(err);
          }

          const token = body.result;

          // Get a redirect link
          client.post(
            {
              url: '/login',
              headers: {
                Authorization: `token ${token.value}`
              },
              followRedirect: false
            },
            (err, resp, body) => {
              if ((err = createError(err, resp, body))) {
                return done(err);
              }

              assert(resp.statusCode, 302);
              const redirectUrl = resp.headers.location;

              // check that the redirect URL got an authToken query string parameter
              const qs = querystring.parse(redirectUrl.split('?')[1]);
              assert(qs.authToken);

              // check that the redirect URL auto login the _user_ and redirect it  to `/` with a 301

              const jar = client.jar();
              client.get(
                {
                  url: redirectUrl,
                  followRedirect: false,
                  jar
                },
                (err, resp, body) => {
                  if ((err = createError(err, resp, body))) {
                    return done(err);
                  }

                  assert(resp.statusCode, 302);
                  const cookies = resp.headers['set-cookie'];
                  // couchdb auth token
                  assert(
                    cookies.some(cookie => cookie.startsWith('AuthSession='))
                  );
                  // scipe session
                  assert(
                    cookies.some(cookie => cookie.startsWith('scipe.sid='))
                  );

                  // the ?authToken qs was removed
                  const redirectUrl = resp.headers.location;
                  assert.equal(redirectUrl, '/');

                  client.get(
                    {
                      url: redirectUrl,
                      jar
                    },
                    (err, resp, body) => {
                      if ((err = createError(err, resp, body))) {
                        return done(err);
                      }
                      assert(/normal user/.test(body));
                      done();
                    }
                  );
                }
              );
            }
          );
        }
      );
    });

    after(() => {
      server.destroy();
    });
  });
});
