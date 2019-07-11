import assert from 'assert';
import { createId } from '@scipe/librarian';
import createError from '@scipe/create-error';
import url from 'url';
import uuid from 'uuid';
import createServer from './utils/create-server';
import { client, portHttp } from './utils/config';
import register from './utils/register';

describe('app-suite routes', function() {
  this.timeout(40000);

  let server, user, createPeriodicalAction;
  before(done => {
    server = createServer();
    server.listen(portHttp, () => {
      register({ name: 'normal user' }, { login: true }, (err, _user) => {
        if (err) return done(err);
        user = _user;

        client.post(
          {
            url: '/action',
            json: {
              '@type': 'CreateOrganizationAction',
              agent: user['@id'],
              actionStatus: 'CompletedActionStatus',
              result: {
                '@id': createId('org', uuid.v4())['@id'],
                '@type': 'Organization',
                name: 'org'
              }
            },
            jar: user.jar
          },
          (err, resp, createOrganization) => {
            if (err) return done(err);
            const organization = createOrganization.result;

            client.post(
              {
                url: '/action',
                json: {
                  '@type': 'CreatePeriodicalAction',
                  actionStatus: 'CompletedActionStatus',
                  agent: user['@id'],
                  object: organization['@id'],
                  result: {
                    '@id': createId('journal', uuid.v4())['@id'],
                    '@type': 'Periodical',
                    hasDigitalDocumentPermission: {
                      '@type': 'DigitalDocumentPermission',
                      permissionType: 'ReadPermission',
                      grantee: {
                        '@type': 'Audience',
                        audienceType: 'public'
                      }
                    },
                    name: 'Test journal'
                  }
                },
                jar: user.jar
              },
              (err, resp, _createPeriodicalAction) => {
                if ((err = createError(err, resp, _createPeriodicalAction)))
                  return done(err);
                createPeriodicalAction = _createPeriodicalAction;
                done();
              }
            );
          }
        );
      });
    });
  });

  it('should return the app (HTML)', done => {
    client.get(
      {
        url: '/',
        headers: {
          Accept: 'text/html'
        },
        jar: user.jar
      },
      (err, resp, body) => {
        if ((err = createError(err, resp, body))) return done(err);
        assert.equal(resp.statusCode, 200);
        assert(/window.__INITIAL_STATE__/.test(body), 'the app is served');
        done();
      }
    );
  });

  it('should serve a journal homepage when called from a journal subdomain', done => {
    const { host } = url.parse(createPeriodicalAction.result.url);

    client.get(
      {
        url: '/',
        headers: {
          Host: host,
          'X-SSR-Host': `127.0.0.1:${portHttp}`,
          Accept: 'text/html'
        },
        jar: user.jar
      },
      (err, resp, body) => {
        if ((err = createError(err, resp, body))) return done(err);
        assert.equal(resp.statusCode, 200);
        assert(/Test journal/.test(body), 'the journal homepage is served');
        done();
      }
    );
  });

  it('should serve the profile page when logged in', done => {
    client.get(
      {
        url: `/about/${user.auth.username}`,
        headers: {
          Accept: 'text/html'
        },
        jar: user.jar
      },
      (err, resp, body) => {
        if ((err = createError(err, resp, body))) return done(err);
        assert.equal(resp.statusCode, 200);
        assert(/normal user/i.test(body), 'the user page is served');
        done();
      }
    );
  });

  it('should serve the profile page when logged out', done => {
    client.get(
      {
        url: `/about/${user.auth.username}`,
        headers: {
          Accept: 'text/html'
        }
      },
      (err, resp, body) => {
        if ((err = createError(err, resp, body))) return done(err);
        assert.equal(resp.statusCode, 200);
        assert(/normal user/i.test(body), 'the user page is served');
        done();
      }
    );
  });

  after(() => {
    server.destroy();
  });
});
