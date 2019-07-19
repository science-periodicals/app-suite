import assert from 'assert';
import createError from '@scipe/create-error';
import { getId, unprefix } from '@scipe/jsonld';
import createServer from './utils/create-server';
import { client, portHttp } from './utils/config';
import register from './utils/register';

describe('demo routes', function() {
  this.timeout(40000);

  let server, user;
  before(done => {
    server = createServer();
    server.listen(portHttp, () => {
      register(
        { name: 'demo user', password: 'pass' },
        { login: true },
        (err, _user) => {
          if (err) return done(err);
          user = _user;

          done();
        }
      );
    });
  });

  it('should auto login and redirect to the demo of interest', done => {
    client.get(
      {
        url: '/demo',
        headers: {
          Accept: 'text/html'
        },
        qs: {
          user: unprefix(getId(user)),
          next: '/settings'
        },
        followRedirect: false
      },
      (err, resp, body) => {
        if ((err = createError(err, resp, body))) return done(err);
        assert.equal(resp.statusCode, 302);
        assert.equal(resp.headers.location, '/settings');
        assert(
          resp.headers['set-cookie'].some(cookie =>
            cookie.startsWith('AuthSession=')
          )
        );
        assert(
          resp.headers['set-cookie'].some(cookie =>
            cookie.startsWith('scipe.sid=')
          )
        );
        done();
      }
    );
  });

  after(() => {
    server.destroy();
  });
});
