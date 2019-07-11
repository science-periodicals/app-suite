import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { Acl } from '@scipe/librarian';
import {
  Stepper,
  StepperItem,
  JournalBadge,
  BemTags,
  Divider
} from '@scipe/ui';
import { getId, unprefix, textify } from '@scipe/jsonld';
import { fetchJournal } from '../../actions/journal-action-creators';
import { fetchPeriodicalPublicationTypes } from '../../actions/type-action-creators';
import { fetchPeriodicalWorkflowSpecifications } from '../../actions/workflow-action-creators';

import SettingsJournalMetadata from './settings-journal-metadata';
import SettingsJournalStyle from './settings-journal-style';
import SettingsJournalPublicationTypes from './settings-journal-publication-types';
import SettingsJournalStaff from './settings-journal-staff';
import SettingsJournalAccess from './settings-journal-access';
import SettingsJournalWorkflow from './settings-journal-workflow';
import SettingsJournalIssues from './settings-journal-issues';
import SettingsJournalRfas from './settings-journal-rfas';
import SettingsJournalArticles from './settings-journal-articles';
import SettingsJournalBlockingErrorNotice from './settings-journal-blocking-error-notice';
import {
  getJournalStaffBlockingErrors,
  getJournalWorkflowsBlockingErrors,
  getJournalPublicationTypesBlockingErrors,
  getJournalAccessTypesBlockingErrors
} from '../../utils/settings-utils';

const CATEGORIES = [
  'journal',
  'staff',
  'workflows',
  'types',
  'issues',
  'articles',
  'rfas',
  'access',
  'style'
];

/**
 * NOTE: we prefetch the publication type, issues and workflows here
 */
class SettingsJournal extends Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    history: PropTypes.object.isRequired,
    match: PropTypes.shape({
      params: PropTypes.shape({
        journalId: PropTypes.string.isRequired,
        category: PropTypes.oneOf(CATEGORIES).isRequired // settings category
      })
    }),

    readOnly: PropTypes.bool,
    user: PropTypes.object,

    // redux
    journal: PropTypes.object,
    workflowSpecifications: PropTypes.arrayOf(
      PropTypes.shape({
        '@type': PropTypes.oneOf(['WorkflowSpecification']).isRequired
      })
    ).isRequired,
    publicationTypes: PropTypes.arrayOf(
      PropTypes.shape({
        '@type': PropTypes.oneOf(['PublicationType']).isRequired
      })
    ).isRequired,

    acl: PropTypes.object,
    fetchJournal: PropTypes.func.isRequired,
    fetchPeriodicalPublicationTypes: PropTypes.func.isRequired,
    fetchPeriodicalWorkflowSpecifications: PropTypes.func.isRequired
  };

  static getDerivedStateFromProps(props, state) {
    if (getId(props.journal) !== getId(state.lastJournal)) {
      return {
        lastJournal: props.journal
      };
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = {
      lastJournal: props.journal
    };
  }

  componentDidMount() {
    const {
      match: {
        params: { journalId }
      },
      fetchJournal,
      fetchPeriodicalPublicationTypes,
      fetchPeriodicalWorkflowSpecifications
    } = this.props;
    fetchJournal(`journal:${journalId}`);
    fetchPeriodicalPublicationTypes(`journal:${journalId}`);
    fetchPeriodicalWorkflowSpecifications(`journal:${journalId}`);
  }

  componentDidUpdate(prevProps) {
    const {
      match: {
        params: { journalId }
      },
      fetchJournal,
      fetchPeriodicalPublicationTypes,
      fetchPeriodicalWorkflowSpecifications
    } = this.props;

    if (prevProps.match.params.journalId !== journalId) {
      fetchJournal(`journal:${journalId}`);
      fetchPeriodicalPublicationTypes(`journal:${journalId}`);
      fetchPeriodicalWorkflowSpecifications(`journal:${journalId}`);
    }
  }

  handleChangeActiveStep = activeStep => {
    const { history, journal } = this.props;
    history.push({
      pathname: `/settings/journal/${unprefix(getId(journal))}/${CATEGORIES[
        activeStep
      ] || 'journal'}`
    });
  };

  render() {
    const {
      journal,
      workflowSpecifications,
      publicationTypes,
      user,
      readOnly,
      disabled,
      acl,
      match: {
        params: { category }
      }
    } = this.props;

    if (!journal) return null;

    const bem = BemTags();

    const staffErrors = getJournalStaffBlockingErrors(journal);

    const workflowErrors = getJournalWorkflowsBlockingErrors(
      workflowSpecifications
    );

    const publicationTypeErrors = getJournalPublicationTypesBlockingErrors(
      publicationTypes,
      workflowSpecifications
    );

    const accessErrors = getJournalAccessTypesBlockingErrors(journal);

    return (
      <section className={bem`settings-journal`}>
        <h2 className={bem`journal-title`}>
          <JournalBadge journal={journal} link={true} size={32} />{' '}
          {`${unprefix(getId(journal))} - ${textify(journal.name) ||
            'unnamed'}`}
        </h2>
        <Divider />

        <div className={bem`body`}>
          <Stepper
            direction="horizontal"
            activeStep={CATEGORIES.findIndex(
              _category => _category === category
            )}
            onChange={this.handleChangeActiveStep}
          >
            <StepperItem title="Journal" icon="journal">
              <SettingsJournalMetadata
                user={user}
                acl={acl}
                disabled={disabled}
                readOnly={readOnly}
                journal={journal}
              />
            </StepperItem>

            <StepperItem
              title="Staff"
              icon="personAdd"
              statusIconName={staffErrors ? 'warning' : undefined}
            >
              {!!staffErrors && (
                <SettingsJournalBlockingErrorNotice errors={staffErrors} />
              )}

              <SettingsJournalStaff
                user={user}
                acl={acl}
                disabled={disabled}
                readOnly={readOnly}
                journal={journal}
              />
            </StepperItem>

            <StepperItem
              title="Workflows"
              icon="dispatch"
              statusIconName={workflowErrors ? 'warning' : undefined}
            >
              {!!workflowErrors && (
                <SettingsJournalBlockingErrorNotice errors={workflowErrors} />
              )}

              <SettingsJournalWorkflow
                user={user}
                acl={acl}
                disabled={disabled}
                readOnly={readOnly}
                journal={journal}
              />
            </StepperItem>

            <StepperItem
              title="Types"
              icon="label"
              statusIconName={publicationTypeErrors ? 'warning' : undefined}
            >
              {!!publicationTypeErrors && (
                <SettingsJournalBlockingErrorNotice
                  errors={publicationTypeErrors}
                />
              )}
              <SettingsJournalPublicationTypes
                user={user}
                acl={acl}
                disabled={disabled}
                readOnly={readOnly}
                journal={journal}
              />
            </StepperItem>

            <StepperItem title="Issues" icon="layers">
              <SettingsJournalIssues
                user={user}
                acl={acl}
                disabled={disabled}
                readOnly={readOnly}
                journal={journal}
              />
            </StepperItem>

            <StepperItem title="Articles" icon="manuscript">
              <SettingsJournalArticles
                user={user}
                acl={acl}
                disabled={disabled}
                readOnly={readOnly}
                journal={journal}
              />
            </StepperItem>

            <StepperItem title="RFAs" icon="rfa">
              <SettingsJournalRfas
                user={user}
                acl={acl}
                disabled={disabled}
                readOnly={readOnly}
                journal={journal}
              />
            </StepperItem>

            <StepperItem
              title="Access"
              icon="accessClosed"
              statusIconName={accessErrors ? 'warning' : undefined}
            >
              {!!accessErrors && (
                <SettingsJournalBlockingErrorNotice errors={accessErrors} />
              )}

              <SettingsJournalAccess
                user={user}
                acl={acl}
                disabled={disabled}
                readOnly={readOnly}
                journal={journal}
              />
            </StepperItem>

            <StepperItem title="Style" icon="palette">
              <SettingsJournalStyle
                user={user}
                acl={acl}
                disabled={disabled}
                readOnly={readOnly}
                journal={journal}
              />
            </StepperItem>
          </Stepper>
        </div>
      </section>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => state.droplets[`journal:${props.match.params.journalId}`],
    state => state.workflowSpecificationMap,
    state => state.publicationTypeMap,
    (journal, workflowSpecificationMap, publicationTypeMap) => {
      const journalId = getId(journal);

      const workflowSpecifications = Object.keys(workflowSpecificationMap || {})
        .map(workflowId => workflowSpecificationMap[workflowId])
        .filter(workflow => {
          return (
            getId(workflow.isPotentialWorkflowOf) === journalId &&
            workflow.workflowSpecificationStatus !==
              'ArchivedWorkflowSpecificationStatus'
          );
        });

      const publicationTypes = Object.values(publicationTypeMap).filter(
        publicationType => {
          return (
            getId(publicationType.isPublicationTypeOf) === getId(journal) &&
            publicationType.publicationTypeStatus !==
              'ArchivedPublicationTypeStatus'
          );
        }
      );

      return {
        journal,
        workflowSpecifications,
        publicationTypes,
        acl: new Acl(journal)
      };
    }
  ),
  {
    fetchJournal,
    fetchPeriodicalPublicationTypes,
    fetchPeriodicalWorkflowSpecifications
  }
)(SettingsJournal);
