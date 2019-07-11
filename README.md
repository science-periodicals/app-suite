# @scipe/app-suite

[![CircleCI](https://circleci.com/gh/science-periodicals/app-suite.svg?style=svg&circle-token=1bdc90ecaeff8a4d75eabbf0e1945b789e2310df)](https://circleci.com/gh/science-periodicals/app-suite)

[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

sci.pe App suite.

Note: this module is auto published to npm on CircleCI. Only run `npm version
patch|minor|major` and let CI do the rest.

## Coding style

Use `prettier --single-quote` (or `npm run format`) and:
- `const` over `let` or `var` whenever possible

## Semantic of `readOnly` and `disabled`

- `disabled`: all controls (delete icon, input etc.) visible _but_ disabled
- `readOnly`: do not render any controls

## Reporting bugs

Be sure that dependencies are up-to-date. You can run `./check.sh` to generate a report.

## Usage

**Be sure that redis is running and that your env variable points to a Cloudant instance (see below).**

### Setup

```sh
npm run redis
npm install
npm run init # Note: if you have your DB already setup, use npm run push-db instead
```

Follow the instructions at https://github.com/science-periodicals/workers#installation to install worker dependencies.

### Seeding the app-suite

#### Automatically with stories (recommended)

See the [stories](https://github.com/science-periodicals/stories) repository.

#### Manually

```sh
./node_modules/.bin/librarian register -u <username> -p <password> # Do that for as many users as required
./node_modules/.bin/librarian create-org -u <username> -p <password> -n "<org name>" # Note the double quote if the org name contains spaces or dashes
```

For convenience you can run:
```sh
npm run register
```

### Start the app

- Production environment:

```sh
npm start
```

- Development environment:

link what you want (if anything) e.g

```
(cd ../ui && npm link)
npm link @scipe/ui
```

then run:

```sh
npm run watch
```

Note: for convenience you can use the `./link.sh` script to link common
dependencies (you will have to be sure to be up-to-date git wise on those and
that the path coded on this script match your installs).



### Cloudant (CouchDB 2.x + Clouseau + Dreyfus)

The simplest way to get that up and running locally is to use the
`cloudant-developer` docker container. To do so follow the instruction on:
https://hub.docker.com/r/ibmcom/cloudant-developer/

After installing docker run:

```sh
docker pull ibmcom/cloudant-developer
```

To start the container run:

```sh
docker run --detach --volume cloudant:/srv --name cloudant-developer --publish 5984:80 --hostname cloudant.dev ibmcom/cloudant-developer
```

Be sure to set the following environment variable (for instance in your
`.profile`) accordingly (the following default match cloudant defaults).

```sh
export COUCH_PROTOCOL=http:
export COUCH_HOST=127.0.0.1
export COUCH_PORT=5984
export COUCH_ADMIN_USERNAME=admin
export COUCH_ADMIN_PASSWORD=pass
```

The cloudant dashboard will be available at http://127.0.0.1:5984/dashboard.html

To restart the container after quiting Docker, run:
```sh
docker restart cloudant-developer
```

To stop the container and remove any previous one run:
```sh
docker rm `docker ps --no-trunc -aq` -f
```

To view the logs run:
```sh
docker logs cloudant-developer
```

### Testing with IE Edge using parallels

Download and install Edge VM from https://developer.microsoft.com/en-us/microsoft-edge/tools/vms/
Open http://10.211.55.2:3000/

### Visual regression tests

#### on CI

Be sure `CIRCLE_TOKEN` is set in your `.profile`.

Visual regression tests are run on CircleCI on each commit (to any branch).
To download the result of the test run:

```sh
npm run backstop:download # -- <build_num> can be specified (default to `latest`)
npm run backstop:open # this will open a browser
```

After reviewing the tests,

```sh
npm run backstop:approve # use `-- --filter <filename>` to only approve specific images
```
can be run to selectively approve the new screenshots (next references)

To prevent the testing from being performed on commit, add `[ci skip]` to the end of the commit message.

#### locally

To run the test locally:

First be sure that app-suite is properly seeded and run:

```sh
npm run start-ci
```

Then:

```sh
npm run backstop:test
```

Note:

```sh
npm run backstop:kill
```

kills chrome zombies

#### data-test attributes

- `data-testid="id"`: use to target a specific component during testing

- `data-test-ready="true"`: use to signal that the screen is ready for
  screenshot (typically used at the top level).

- `data-test-now="true"`: use to signal that an element renders data sensitive
  to the value of the current time (break tests). This includes dates and times.

- `data-test-progress="true"`: use to signal that an element contains progress
  animation (break tests). This includes spinners.


### Proxy user authentication


Create an _admin_ user:

```sh
librarian register -u edith -p pass -e test+edith@sci.pe -r admin
```

Create a normal user:

```sh
librarian register -u peter -p pass -e test+peter@sci.pe
```

Create an authentication token for the user you want to login with (e.g. `user:peter`) from an admin account (e.g. `user:edith`):

```sh
librarian create-authentication-token user:peter -u edith -p pass
```

Visit `/login?proxyAuth=true` and enter the token just obtained, you should be redirected to
the dasbhoard logged in as `user:peter`


## License

`@scipe/app-suite` is dual-licensed under commercial and open source licenses
([AGPLv3](https://www.gnu.org/licenses/agpl-3.0.en.html)) based on the intended
use case. Contact us to learn which license applies to your use case.
