import { Router } from 'express';
import csurf from 'csurf';
import url from 'url';
import bodyParser from 'body-parser';
import querystring from 'querystring';
import createError from '@scipe/create-error';
import {
  escJSON,
  getAgentId,
  getObjectId,
  getRootPartId,
  RE_LOCAL_HOST_OR_DEV
} from '@scipe/librarian';
import { unprefix, getId } from '@scipe/jsonld';
import { addDbVersion, addLibrarian, addCsrfToken } from '@scipe/api';
import bundlePaths from '../utils/bundle-paths';

const jsonParser = bodyParser.json();
const csrf = csurf({ cookie: false });
const router = new Router({ caseSensitive: true });

/**
 * Note: this also handle a successful registration (as user end up here by
 * clicking on the "confirm registration" email link)
 *
 * We redirect to `/settings` or `next` (inferred from the `RegisterAction` `purpose`)
 * on succesfful registration & login
 */
router.get(
  '/:username?',
  addDbVersion,
  addLibrarian,
  csrf,
  addCsrfToken,
  (req, res, next) => {
    res.header('Vary', 'Accept');

    if (req.params.username && req.accepts('json') && !req.accepts('html')) {
      // we sent the active register action
      req.librarian.getActiveRegisterActionByUserId(
        `user:${req.params.username}`,
        (err, action) => {
          if (err) {
            if (err.code === 404) {
              err.message = `No active registration can be found for user ${
                req.params.username
              }. If you have already activated your registration try to log in otherwise try to register again.`;
              return res.status(404).json({
                '@type': 'Error',
                statusCode: 404,
                description: err.message
              });
            }
            return next(err);
          }

          res.json(action);
        }
      );
    } else {
      if (!req.accepts('html')) {
        return next(createError(406, 'Not Acceptable'));
      }

      if (
        (req.query.token && !req.query.action) ||
        (req.query.action && !req.query.token)
      ) {
        return next(createError(400, 'Invalid activation link'));
      }

      if (req.query.token && req.query.action) {
        // complete the register action & redirect to /login?next=..
        req.librarian.get(
          `action:${req.query.action}`,
          { acl: false },
          (err, action) => {
            if (err) {
              return next(
                err.code === 404
                  ? createError(400, 'Invalid activation link')
                  : err
              );
            }

            req.librarian.post(
              Object.assign({}, action, {
                actionStatus: 'CompletedActionStatus',
                instrument: {
                  '@id': `token:${req.query.token}`,
                  '@type': 'Token',
                  tokenType: 'registrationToken'
                }
              }),
              { acl: false },
              (err, action) => {
                if (err) {
                  return next(
                    createError(
                      err.code || 400,
                      `Invalid or expired activation link (${err.message ||
                        'no message'})`
                    )
                  );
                }

                // We reconstruct the `nextUrl` based on `action.purpose` (itself an `Action`)
                let nextUrl = '/settings'; // default
                if (action.purpose && action.purpose['@type']) {
                  const { purpose } = action;
                  switch (purpose['@type']) {
                    case 'ApplyAction': {
                      // apply to journal
                      const journalId = getObjectId(purpose);
                      if (journalId) {
                        const hostname = `${unprefix(journalId)}}.sci.pe`;
                        nextUrl = RE_LOCAL_HOST_OR_DEV.test(req.hostname)
                          ? `/about/staff?hostname=${hostname}&join=true`
                          : `https://${hostname}/about/staff?join=true`;
                      }
                      break;
                    }

                    case 'SubscribeAction': {
                      // buy a plan
                      const offerId = getId(purpose.expectsAcceptanceOf);
                      if (offerId) {
                        nextUrl = `/settings?plan=${offerId.replace(
                          'offer:scipe-',
                          ''
                        )}`;
                      }
                      break;
                    }

                    case 'CreateGraphAction': {
                      // submit a ms
                      const qs = {};
                      const graph = purpose.result;
                      if (graph) {
                        const journalId = getRootPartId(graph);
                        if (journalId) {
                          qs.journal = unprefix(journalId);
                        }

                        const roleId = getId(purpose.participant);
                        if (roleId) {
                          qs.role = unprefix(roleId);
                        }

                        const typeId = getId(graph.additionalType);
                        if (typeId) {
                          qs.type = unprefix(typeId);
                        }

                        const workflowId = getId(graph.additionalWorkflow);
                        if (workflowId) {
                          qs.workflow = unprefix(workflowId);
                        }

                        const rfaId = getId(graph.isInResponseTo);
                        if (rfaId) {
                          qs.rfa = unprefix(rfaId);
                        }
                      }

                      nextUrl = '/new/submission';
                      if (Object.keys(qs).length) {
                        nextUrl += `?${querystring.stringify(qs)}`;
                      }
                      break;
                    }

                    default:
                      break;
                  }
                }

                res.redirect(
                  301,
                  `/login?username=${unprefix(
                    getAgentId(action)
                  )}&next=${encodeURIComponent(nextUrl)}`
                );
              }
            );
          }
        );
      } else {
        bundlePaths(['main'], (err, bundles) => {
          if (err) return next(err);

          res.render('index', {
            escJSON,
            bundles
          });
        });
      }
    }
  }
);

/**
 * User to POST an active RegisterAction
 * if a `next` query string parameter is present we turn into into a `purpose`
 */
router.post(
  '/',
  addDbVersion,
  addLibrarian,
  csrf,
  addCsrfToken,
  jsonParser,
  (req, res, next) => {
    if (!req.accepts('json')) {
      return next(createError(406, 'Not Acceptable'));
    }

    const { username, email, password } = req.body;

    // Generate a `purpose` from the `next` qs
    let purpose;
    if (req.query.next) {
      const [pathname = '', qs = ''] = req.query.next.split('?');
      const query = querystring.parse(qs);

      if (pathname.startsWith('/new/submission')) {
        // start a submission
        let journalId, workflowId, typeId, roleId, rfaId;
        if (query.journal) {
          journalId = `journal:${query.journal}`;
        }
        if (query.workflow) {
          workflowId = `workflow:${query.workflow}`;
        }
        if (query.type) {
          typeId = `type:${query.type}`;
        }
        if (query.role) {
          roleId = `role:${query.role}`;
        }
        if (query.rfa) {
          rfaId = `action:${query.rfa}`;
        }

        purpose = {
          '@type': 'CreateGraphAction',
          result: {
            '@type': 'Graph'
          }
        };

        if (workflowId) {
          purpose.object = workflowId;
        }

        if (roleId) {
          purpose.participant = roleId;
        }

        if (typeId) {
          purpose.result.additionalType = typeId;
        }

        if (journalId) {
          purpose.result.additionalType = journalId;
        }

        if (rfaId) {
          purpose.result.isInResponseTo = rfaId;
        }
      } else if (pathname.startsWith('/settings') && query.plan) {
        // subscribe
        purpose = {
          '@type': 'SubscribeAction',
          expectsAcceptanceOf: `offer:scipe-${query.plan}`
        };
      } else if (pathname.includes('/about/staff')) {
        // apply
        const hostname = query.hostname || url.parse(pathname).hostname;
        if (hostname) {
          const journalId = `journal:${hostname.replace('.sci.pe', '')}`;

          purpose = {
            '@type': 'ApplyAction',
            object: journalId
          };
        }
      }
    }

    const user = {
      '@id': `user:${username}`,
      '@type': 'Person',
      email: `mailto:${email}`
    };

    req.librarian.post(
      {
        '@type': 'RegisterAction',
        agent: user,
        purpose, // will be validated by librarian
        actionStatus: 'ActiveActionStatus',
        instrument: {
          '@type': 'Password',
          value: password
        },
        potentialAction: {
          '@type': 'InformAction',
          actionStatus: 'CompletedActionStatus',
          recipient: user,
          instrument: {
            '@type': 'EmailMessage',
            description: '[sci.pe] registration',
            text: {
              '@type': 'sa:ejs',
              '@value': `<% var recipient = hydrate(unrole(hydrate(arrayify(emailMessage.recipient)[0]), 'recipient')) %>
<% var displayName = recipient.name || unprefix(getId(recipient)) || recipient.email %>
<p>
  Hello,
</p>
<p>
  You recently signed up for <a href="https://sci.pe">sci.pe</a> as <em><%= displayName %></em>.
</p>
<p>
  To confirm (and activate) your registration, visit:
  <a href="${
    req.headers.referer
  }?action=<%= unprefix(getId(object)) %>&token=<%= unprefix(getId(registrationToken)) %>">${
                req.headers.referer
              }?action=<%= unprefix(getId(object)) %>&token=<%= unprefix(getId(registrationToken))  %></a>.
</p>
<p>
  Thank you.
</p>
`
            }
          }
        }
      },
      (err, action) => {
        if (err) {
          return res.status(err.code).json({
            '@type': 'Error',
            statusCode: err.code,
            description: err.message
          });
        }

        res.json(action);
      }
    );
  }
);

export default router;
