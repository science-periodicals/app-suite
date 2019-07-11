import React, { Component } from 'react';
import querystring from 'querystring';
import PropTypes from 'prop-types';
import pluralize from 'pluralize';
import createError from '@scipe/create-error';
import {
  xhr,
  escapeLucene,
  CONTACT_POINT_EDITORIAL_OFFICE,
  getAgentId
} from '@scipe/librarian';
import { arrayify, getId, getNodeMap } from '@scipe/jsonld';
import {
  PaperSlug,
  PaperButton,
  JournalAutocomplete,
  JournalBadge,
  ControlPanel,
  WorkflowPicker,
  ContactPointPicker,
  Spinner,
  PublicationTypePicker,
  Hyperlink,
  TextLogo
} from '@scipe/ui';
import Notice from './notice';
import config from '../utils/config';

const FETCH_ERROR_CODE = 490;
const NOT_ACCEPTING_SUBMISSION_ERROR_CODE = 491;
const NO_WORKFLOW_FOR_TYPE_ERROR_CODE = 492;

/**
 * Submission form needs to gather:
 * - Submission info (@id)
 * - workflow template
 * - editorial office
 * - publication type
 */
export default class SubmissionForm extends Component {
  static propTypes = {
    // those ids are used to start the form pre-filled
    presetPeriodicalId: PropTypes.string,
    presetPublicationTypeId: PropTypes.string,
    presetWorkflowId: PropTypes.string,
    presetRoleId: PropTypes.string,

    disabled: PropTypes.bool.isRequired,
    createGraphStatus: PropTypes.oneOf(['active', 'success', 'error']), // create graph action Status
    createGraphError: PropTypes.instanceOf(Error), // error during the create graph action
    onCancel: PropTypes.func,
    onSubmit: PropTypes.func.isRequired,
    user: PropTypes.object.isRequired
  };

  static getDerivedStateFromProps(props, state) {
    if (
      props.createGraphStatus === 'success' &&
      state.lastCreateGraphStatus === 'active'
    ) {
      return {
        slug: '',
        selectedJournal: null,
        publicationTypes: [],
        selectedPublicationType: null,
        workflows: [],
        selectedWorkflow: null,
        editorialOfficeRoles: [],
        selectedEditorialOfficeRole: null,
        error: null,
        fetchStatus: null,
        lastCreateGraphStatus: props.createGraphStatus
      };
    } else if (props.createGraphStatus !== state.lastCreateGraphStatus) {
      return {
        lastCreateGraphStatus: props.createGraphStatus
      };
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      slug: '',
      selectedJournal: null,
      publicationTypes: [],
      selectedPublicationType: null,
      workflows: [],
      selectedWorkflow: null,
      editorialOfficeRoles: [],
      selectedEditorialOfficeRole: null,
      error: null,
      fetchStatus: null,
      lastCreateGraphStatus: props.createGraphStatus
    };
    this._isMounted = null;
    this.xhr = null;
  }

  componentDidMount() {
    this._isMounted = true;
    const { presetPeriodicalId } = this.props;
    if (presetPeriodicalId) {
      this.fetch(presetPeriodicalId);
    }
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.createGraphStatus === 'success' &&
      prevProps.createGraphStatus === 'active'
    ) {
      if (this.xhr) {
        this.xhr.abort();
        this.xhr = null;
      }
      if (this.journalAutocomplete && this.journalAutocomplete.reset) {
        this.journalAutocomplete.reset();
      }
    }

    if (
      this.props.presetPeriodicalId &&
      this.props.presetPeriodicalId !== prevProps.presetPeriodicalId
    ) {
      this.fetch(this.props.presetPeriodicalId);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleCancel = e => {
    e.preventDefault();
    this.setState({
      slug: '',
      selectedJournal: null,
      publicationTypes: [],
      selectedPublicationType: null,
      workflows: [],
      selectedWorkflow: null,
      editorialOfficeRoles: [],
      selectedEditorialOfficeRole: null,
      error: null,
      fetchStatus: null
    });
    if (this.xhr) {
      this.xhr.abort();
      this.xhr = null;
    }
    if (this.journalAutocomplete && this.journalAutocomplete.reset) {
      this.journalAutocomplete.reset();
    }
    if (this.props.onCancel) {
      this.props.onCancel();
    }
  };

  handleSubmit = e => {
    e.preventDefault();
    const {
      slug,
      selectedJournal,
      selectedWorkflow,
      selectedEditorialOfficeRole,
      selectedPublicationType
    } = this.state;

    this.props.onSubmit(
      {
        '@id': `graph:${slug}`,
        '@type': 'Graph'
      },
      getId(selectedJournal),
      getId(selectedWorkflow),
      getId(selectedEditorialOfficeRole),
      getId(selectedPublicationType)
    );
  };

  handleChange = e => {
    e.preventDefault();
    this.setState({
      [e.target.name]: e.target.value
    });
  };

  preventSubmit(e) {
    if (e.keyCode === 13) {
      e.preventDefault();
    }
  }

  handleJournalAutocompleteChange = value => {
    this.setState({
      selectedJournal: null
    });
  };

  handleSelectJournal = (value, selectedJournal) => {
    if (selectedJournal) {
      this.setState({ selectedJournal });
      this.fetch(getId(selectedJournal));
    }
  };

  handleSelectPublicationType = selectedPublicationTypeId => {
    const { publicationTypes, workflows, selectedWorkflow } = this.state;

    const nextSelectedPublicationType = publicationTypes.find(
      publicationType =>
        getId(publicationType) === getId(selectedPublicationTypeId)
    );

    // Reset selectedWorkflow if currently selected workflow is not compatible with the eligibleWorkflow of the type
    let nextSelectedWorkflow;
    if (
      selectedWorkflow &&
      arrayify(nextSelectedPublicationType.eligibleWorkflow).some(
        eligibleWorkflow => getId(eligibleWorkflow) === getId(selectedWorkflow)
      )
    ) {
      nextSelectedWorkflow = selectedWorkflow;
    } else {
      nextSelectedWorkflow = workflows.find(workflow =>
        arrayify(nextSelectedPublicationType.eligibleWorkflow).some(
          eligibleWorkflow => getId(eligibleWorkflow) === getId(workflow)
        )
      );
    }

    let nextError;
    if (!nextSelectedWorkflow) {
      nextError = createError(
        NO_WORKFLOW_FOR_TYPE_ERROR_CODE,
        'No workflow available at this time, select a different publication type or check back later'
      );
    } else {
      nextError = null;
    }

    this.setState({
      selectedPublicationType: nextSelectedPublicationType,
      selectedWorkflow: nextSelectedWorkflow,
      error: nextError
    });
  };

  handleSelectWorkflow = selectedWorkflowId => {
    const { workflows } = this.state;
    const selectedWorkflow = workflows.find(
      workflow => getId(workflow) === getId(selectedWorkflowId)
    );
    this.setState({ selectedWorkflow });
  };

  handleSelectEditorialOffice = selectedEditorialOfficeRoleId => {
    const { editorialOfficeRoles } = this.state;
    const selectedEditorialOfficeRole = editorialOfficeRoles.find(
      editorialOfficeRole =>
        getId(editorialOfficeRole) === getId(selectedEditorialOfficeRoleId)
    );
    this.setState({ selectedEditorialOfficeRole });
  };

  fetch(periodicalIdOrHostnameToFech) {
    const {
      presetPeriodicalId,
      presetWorkflowId,
      presetRoleId,
      presetPublicationTypeId
    } = this.props;

    if (this.xhr) {
      this.xhr.abort();
    }

    this.setState({
      fetchStatus: 'active',
      error: null
    });

    const r = xhr({
      url: `/periodical?${querystring.stringify({
        limit: 1,
        query: `(@id:"${escapeLucene(
          periodicalIdOrHostnameToFech
        )}" OR hostname:"${escapeLucene(
          periodicalIdOrHostnameToFech
        )}") AND createGraphPermission:true`,
        hydrate: JSON.stringify([
          'publisher', // we need the organization
          'producer', // we need the profiles with contact points
          'editor', // we need the profiles with contact points
          'publicationTypeCoverage', // we need the publication types
          'potentialWorkflow' // we need the workflows
        ]),
        includeDocs: true
      })}`,
      method: 'GET',
      json: true
    });
    this.xhr = r.xhr;

    r.then(({ body }) => {
      if (this._isMounted) {
        const { item: fetchedPeriodical } =
          (body.mainEntity || body).itemListElement[0] || {};

        if (!fetchedPeriodical) {
          throw createError(
            FETCH_ERROR_CODE,
            `Could not find ${periodicalIdOrHostnameToFech}`
          );
        }

        const error = createError(
          NOT_ACCEPTING_SUBMISSION_ERROR_CODE,
          'The journal is currently not accepting submissions. Check back later.'
        );
        let displayError = null;

        const droplets = getNodeMap(arrayify(body['@graph']));

        // Journal published by an organization must be on a paid plan
        const publisherId = getId(fetchedPeriodical.publisher);
        if (publisherId && publisherId.startsWith('org:')) {
          const org = droplets[getId(fetchedPeriodical.publisher)] || {};

          const isPaidUp =
            !config.restrictFreeAccounts ||
            org.customerAccountStatus === 'ValidCustomerAccountStatus';

          if (!isPaidUp) {
            throw error;
          }
        }

        const now = new Date().toISOString();
        const editorialOfficeRoles = arrayify(fetchedPeriodical.editor)
          .filter(role => {
            return (
              // restrict to active roles
              (!role.endDate || role.endDate > now) &&
              (!role.startDate || role.startDate <= now) &&
              arrayify(role.roleContactPoint).some(
                contactPoint =>
                  contactPoint.contactType === CONTACT_POINT_EDITORIAL_OFFICE
              )
            );
          })
          .map(role => {
            // hydrate roles with the profile
            const editorId = getAgentId(role);
            const profile = droplets[editorId];
            if (profile) {
              return Object.assign({}, role, { editor: profile });
            }

            return role;
          });

        if (!editorialOfficeRoles.length) {
          throw error;
        }

        const selectedEditorialOfficeRole =
          (presetRoleId &&
            editorialOfficeRoles.find(role => getId(role) === presetRoleId)) ||
          editorialOfficeRoles[0];

        const publicationTypes = arrayify(
          fetchedPeriodical.publicationTypeCoverage
        )
          .map(publicationType => {
            publicationType = droplets[getId(publicationType)];
            if (
              publicationType &&
              publicationType.publicationTypeStatus ===
                'ActivePublicationTypeStatus'
            ) {
              return publicationType;
            }
          })
          .filter(Boolean);

        if (!publicationTypes.length) {
          throw error;
        }

        const selectedPublicationType =
          (presetPublicationTypeId &&
            publicationTypes.find(
              publicationType =>
                getId(publicationType) === presetPublicationTypeId
            )) ||
          publicationTypes[0];

        // Note we store all the active workflow in state so that we can handle change of types without refetching
        const workflows = arrayify(fetchedPeriodical.potentialWorkflow)
          .map(workflow => {
            return droplets[getId(workflow)];
          })
          .filter(workflow => {
            return (
              workflow &&
              workflow.workflowSpecificationStatus ===
                'ActiveWorkflowSpecificationStatus'
            );
          });

        // we restrict workflows to eligible workflows of the publication type
        const eligibleWorkflows = workflows.filter(workflow =>
          arrayify(selectedPublicationType.eligibleWorkflow).some(
            eligibleWorkflow => getId(eligibleWorkflow) === getId(workflow)
          )
        );

        if (!workflows.length) {
          throw error;
        }

        const selectedWorkflow =
          (presetWorkflowId &&
            eligibleWorkflows.find(
              workflow => getId(workflow) === presetWorkflowId
            )) ||
          eligibleWorkflows[0];

        if (!selectedWorkflow) {
          displayError = createError(
            NO_WORKFLOW_FOR_TYPE_ERROR_CODE,
            'No workflow available at this time, select a different publication type or check back later'
          );
        }

        const isPresetPeriodical =
          presetPeriodicalId && getId(fetchedPeriodical) === presetPeriodicalId;

        this.setState({
          selectedJournal: isPresetPeriodical
            ? fetchedPeriodical
            : this.state.selectedJournal,
          fetchStatus: 'success',
          error: displayError,
          publicationTypes,
          selectedPublicationType,
          workflows,
          selectedWorkflow,
          editorialOfficeRoles,
          selectedEditorialOfficeRole
        });
      }
    }).catch(err => {
      if (this._isMounted) {
        this.setState({
          fetchStatus: 'error',
          error: err
        });
      }
    });
  }

  render() {
    const {
      disabled: _disabled,
      createGraphStatus,
      onCancel,
      presetPeriodicalId,
      createGraphError
    } = this.props;

    const {
      slug,
      selectedJournal,
      workflows,
      fetchStatus,
      selectedWorkflow,
      editorialOfficeRoles,
      selectedEditorialOfficeRole,
      publicationTypes,
      selectedPublicationType,
      error
    } = this.state;

    const eligibleWorkflows = selectedPublicationType
      ? workflows.filter(workflow =>
          arrayify(selectedPublicationType.eligibleWorkflow).some(
            eligibleWorkflow => getId(eligibleWorkflow) === getId(workflow)
          )
        )
      : workflows;

    const disabled = _disabled || createGraphStatus === 'active';
    const cancelable = !!onCancel;
    const submitable =
      !!selectedJournal &&
      !!slug &&
      !!selectedWorkflow &&
      !!selectedEditorialOfficeRole &&
      !!selectedPublicationType &&
      !error;

    return (
      <form
        className="submission-form"
        onSubmit={e => {
          e.preventDefault();
        }}
        autoComplete="off"
      >
        <header>
          <h2 className="submission-form__title">Start New Submission</h2>
          <div className="submission-form__title__badge">
            {selectedJournal ? (
              <JournalBadge journal={selectedJournal} />
            ) : (
              <Spinner
                size={24}
                progressMode={fetchStatus === 'active' ? 'bounce' : 'none'}
              />
            )}
          </div>
        </header>

        <PaperSlug
          name="slug"
          label="Identifier"
          placeholder="influenza-h1"
          disabled={disabled}
          large={true}
          required
          onChange={this.handleChange}
          onKeyDown={this.preventSubmit}
          value={slug}
          className="submission-form__input"
        />

        <Notice>
          <span>
            The submission identifier will be used in the URL and must be unique
            accross all <TextLogo /> submissions. A good identifier can usually
            be made by taking 3 keywords unique to your submission.
          </span>
        </Notice>

        {!presetPeriodicalId ? (
          <JournalAutocomplete
            defaultQuery="createGraphPermission:true"
            defaultValue={
              presetPeriodicalId && selectedJournal
                ? selectedJournal.name || selectedJournal.alternateName
                : undefined
            }
            andQuery="createGraphPermission:true"
            disabled={disabled}
            ref={el => (this.journalAutocomplete = el)}
            onSubmit={this.handleSelectJournal}
            onChange={this.handleJournalAutocompleteChange}
            large={true}
            name="journal"
            label="Journal"
            placeholder={'Search for a journal'}
            className="submission-form__input"
          />
        ) : !selectedJournal && (!error || error.code !== FETCH_ERROR_CODE) ? (
          <Spinner size={40} progressMode="bounce" label="Loading..." />
        ) : null}

        {!!selectedJournal &&
          (!error || error.code === NO_WORKFLOW_FOR_TYPE_ERROR_CODE) && (
            <div className="submission-form__options">
              {/* We make it look like that workflows are being loaded, but everything is actually being fetched */}

              <p>
                {`Available publication ${pluralize(
                  'type',
                  publicationTypes.length
                )} for: `}
                <Hyperlink
                  reset={true}
                  page="journal"
                  periodical={selectedJournal}
                  target="_blank"
                >
                  {(selectedJournal &&
                    (selectedJournal.name || selectedJournal.alternateName)) ||
                    'journal'}
                </Hyperlink>
              </p>

              {fetchStatus === 'active' ? (
                <Spinner size={40} progressMode="bounce" label="Loading..." />
              ) : (
                <div>
                  {/* Select the publication type */}
                  <div className="submission-form__options__publication-type">
                    <PublicationTypePicker
                      periodical={selectedJournal}
                      publicationTypes={publicationTypes}
                      value={getId(selectedPublicationType)}
                      onChange={this.handleSelectPublicationType}
                      disabled={disabled}
                    />
                  </div>

                  {/* Select the workflow */}
                  {!!eligibleWorkflows.length && (
                    <div className="submission-form__options__workflows">
                      <p>{`Eligible ${pluralize(
                        'workflow',
                        eligibleWorkflows.length
                      )}`}</p>

                      <WorkflowPicker
                        workflows={eligibleWorkflows}
                        value={getId(selectedWorkflow)}
                        onChange={this.handleSelectWorkflow}
                        disabled={disabled}
                      />
                    </div>
                  )}

                  {/* Select the editorial office */}
                  <div className="submission-form__options__editorial-office">
                    <p>
                      {`Contact ${pluralize(
                        'editor',
                        editorialOfficeRoles.length
                      )}: `}
                    </p>

                    <ContactPointPicker
                      roles={editorialOfficeRoles}
                      value={getId(selectedEditorialOfficeRole)}
                      onChange={this.handleSelectEditorialOffice}
                      disabled={disabled}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

        <ControlPanel error={error || createGraphError}>
          {cancelable ? (
            <PaperButton
              disabled={
                createGraphStatus ===
                'active' /* need to be able to cancel for readOnlyUser */
              }
              onClick={this.handleCancel}
            >
              cancel
            </PaperButton>
          ) : null}
          <PaperButton
            disabled={!submitable || disabled}
            type="submit"
            onClick={this.handleSubmit}
          >
            Start submission
          </PaperButton>
        </ControlPanel>
      </form>
    );
  }
}
