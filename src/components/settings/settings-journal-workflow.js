import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import Iconoclass from '@scipe/iconoclass';
import {
  PaperSwitch,
  Spinner,
  PaperActionButton,
  BemTags,
  Tooltip
} from '@scipe/ui';
import { getId } from '@scipe/jsonld';
import WorkflowEditor from '../workflow-editor';
import {
  createWorkflowSpecification,
  archiveWorkflowSpecification,
  toggleWorkflowSpecificationStatus
} from '../../actions/workflow-action-creators';
import {
  StyleSectionHeader,
  StyleSectionTitle,
  StyleFormSetList,
  StyleFormSetListItem,
  StyleFormSetListItemGroup
} from './settings';
import { compareDefinedNames } from '../../utils/sort';

// NOTE: the workflow are pre-fetched upstream by settings-journal.js

class SettingsJournalWorkflow extends Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    user: PropTypes.object,
    acl: PropTypes.object.isRequired,
    journal: PropTypes.object,
    workflows: PropTypes.arrayOf(PropTypes.object),
    crudWorkflowSpecificationStatus: PropTypes.object,
    createWorkflowSpecification: PropTypes.func.isRequired,
    archiveWorkflowSpecification: PropTypes.func.isRequired,
    toggleWorkflowSpecificationStatus: PropTypes.func.isRequired
  };

  static defaultProps = {
    workflows: []
  };

  static getDerivedStateFromProps(props, state) {
    if (getId(props.journal) !== getId(state.lastJournal)) {
      return {
        openWorkflowId: null,
        lastJournal: props.journal
      };
    }

    return null;
  }

  constructor(props) {
    super(props);
    this.state = {
      openWorkflowId: null,
      lastJournal: props.journal
    };
  }

  handleClose = workflowId => {
    this.setState({ openWorkflowId: null });
  };

  handleToggleWorkflow(openWorkflowId, e) {
    e.preventDefault();
    this.setState({
      openWorkflowId:
        this.state.openWorkflowId === openWorkflowId ? null : openWorkflowId
    });
  }

  handleArchive(workflowId, e) {
    e.preventDefault();
    this.props.archiveWorkflowSpecification(
      getId(this.props.journal),
      workflowId
    );
  }

  handleToggleActivate(workflowId, isActive, e) {
    e.preventDefault();
    this.props.toggleWorkflowSpecificationStatus(
      getId(this.props.journal),
      workflowId,
      isActive
    );
  }

  handleAdd = e => {
    e.preventDefault();
    this.props.createWorkflowSpecification(getId(this.props.journal));
  };

  render() {
    const bem = BemTags();

    const {
      journal,
      user,
      acl,
      workflows,
      crudWorkflowSpecificationStatus,
      disabled: _disabled,
      readOnly
    } = this.props;
    const { openWorkflowId } = this.state;
    if (!journal) return null;

    const disabled = _disabled || !acl.checkPermission(user, 'AdminPermission');

    return (
      <section className={bem`settings-journal-workflow`}>
        <StyleSectionHeader>
          <StyleSectionTitle>Workflow Editor</StyleSectionTitle>
        </StyleSectionHeader>

        <StyleFormSetList>
          {workflows.map((workflow, i) => {
            const isActive =
              crudWorkflowSpecificationStatus[getId(workflow)] &&
              crudWorkflowSpecificationStatus[getId(workflow)].status ===
                'active';

            return (
              <StyleFormSetListItem
                active={getId(workflow) === openWorkflowId}
                key={getId(workflow)}
              >
                <StyleFormSetListItemGroup>
                  <Spinner progressMode={isActive ? 'spinUp' : 'none'}>
                    <Iconoclass
                      iconName={
                        getId(workflow) === openWorkflowId
                          ? workflow.actionStatus === 'PotentialActionStatus'
                            ? 'pencil'
                            : 'eye'
                          : 'none'
                      }
                      behavior="button"
                      onClick={this.handleToggleWorkflow.bind(this, workflow)}
                      size="16px"
                    />
                  </Spinner>
                  <a
                    href="#"
                    className={bem`__workflow-link`}
                    onClick={this.handleToggleWorkflow.bind(
                      this,
                      getId(workflow)
                    )}
                  >
                    {workflow.name || 'Untitled workflow'}
                  </a>
                </StyleFormSetListItemGroup>

                <StyleFormSetListItemGroup align="right">
                  <Tooltip displayText="Activate workflow.">
                    <PaperSwitch
                      id={`check-${getId(workflow)}`}
                      disabled={disabled || isActive}
                      checked={
                        workflow.workflowSpecificationStatus ===
                        'ActiveWorkflowSpecificationStatus'
                      }
                      onClick={this.handleToggleActivate.bind(
                        this,
                        getId(workflow)
                      )}
                    />
                  </Tooltip>
                  <Tooltip displayText="Archive Workflow">
                    <Iconoclass
                      iconName="trash"
                      disabled={disabled || isActive}
                      behavior="button"
                      onClick={this.handleArchive.bind(this, getId(workflow))}
                    />
                  </Tooltip>
                </StyleFormSetListItemGroup>
              </StyleFormSetListItem>
            );
          })}
        </StyleFormSetList>

        {!readOnly && (
          <div className={bem`__add-workflow`}>
            <PaperActionButton
              large={false}
              onClick={this.handleAdd}
              disabled={disabled}
            />
          </div>
        )}

        {openWorkflowId && (
          <WorkflowEditor
            journal={journal}
            disabled={disabled}
            workflow={workflows.find(
              workflow => getId(workflow) === openWorkflowId
            )}
            updateStatus={crudWorkflowSpecificationStatus[openWorkflowId]}
            onClose={this.handleClose}
          />
        )}
      </section>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => getId(props.journal),
    state => state.workflowSpecificationMap,
    state => state.crudWorkflowSpecificationStatus,
    (journalId, workflowSpecificationMap, crudWorkflowSpecificationStatus) => {
      const workflows = Object.keys(workflowSpecificationMap || {})
        .map(workflowId => workflowSpecificationMap[workflowId])
        .filter(workflow => {
          return (
            getId(workflow.isPotentialWorkflowOf) === journalId &&
            workflow.workflowSpecificationStatus !==
              'ArchivedWorkflowSpecificationStatus'
          );
        })
        .sort(compareDefinedNames);

      return {
        crudWorkflowSpecificationStatus,
        workflows
      };
    }
  ),
  {
    createWorkflowSpecification,
    archiveWorkflowSpecification,
    toggleWorkflowSpecificationStatus
  }
)(SettingsJournalWorkflow);
