import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import moment from 'moment';
import {
  embed,
  arrayify,
  getId,
  getValue,
  createValue,
  getNodeMap
} from '@scipe/jsonld';
import {
  escapeLucene,
  DEFAULT_CREATE_WORKFLOW_STAGE_ACTION,
  DEFAULT_SINGLE_STAGE_CREATE_WORKFLOW_STAGE_ACTION,
  TYPESETTING_SERVICE_TYPE,
  DOI_REGISTRATION_SERVICE_TYPE,
  getDefaultGraphDigitalDocumentPermissions
} from '@scipe/librarian';
import {
  CreateGraphActionEditor,
  ViewIdentityPermissionEditor,
  PublicViewIdentityPermissionEditor,
  PaperButton,
  PaperTextarea,
  PaperInput,
  ControlPanel,
  BemTags,
  CSS_TABLET,
  withOnSubmit,
  PaperCheckbox
} from '@scipe/ui';
import { updateWorkflowSpecification } from '../actions/workflow-action-creators';
import Search from './search';

const ControledPaperTextarea = withOnSubmit(PaperTextarea);
const ControledPaperInput = withOnSubmit(PaperInput);

class WorkflowEditor extends Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    journal: PropTypes.object,
    workflow: PropTypes.shape({
      '@type': PropTypes.oneOf(['WorkflowSpecification'])
    }), // a WorkflowSpecification
    updateStatus: PropTypes.object,
    onClose: PropTypes.func,
    updateWorkflowSpecification: PropTypes.func.isRequired,

    // redux
    screenWidth: PropTypes.string.isRequired
  };

  static defaultProps = {
    updateStatus: {}
  };

  handleChangeMetadata = e => {
    e.preventDefault();
    const { journal, workflow, updateWorkflowSpecification } = this.props;

    let value;
    if (e.target.name === 'expectedDuration') {
      const days = parseInt(e.target.value, 10);
      value = moment.duration(isNaN(days) ? 60 : days, 'days').toISOString();
    } else {
      value = createValue(e.target.value);
    }

    const upd = {
      [e.target.name]: value
    };

    updateWorkflowSpecification(getId(journal), getId(workflow), upd);
  };

  handleChangePermissions = nextPermissions => {
    const { journal, workflow, updateWorkflowSpecification } = this.props;

    const createGraphAction = arrayify(workflow.potentialAction)[0];

    const nodes = arrayify(
      createGraphAction &&
        createGraphAction.result &&
        createGraphAction.result['@graph']
    );
    const graphNodes = nodes.filter(
      node => node['@type'] === 'Graph' && node.version == null
    );
    // root graph
    const graph = graphNodes.filter(
      graphNode => !nodes.some(node => getId(node.result) === getId(graphNode))
    )[0];
    const nodeMap = getNodeMap(nodes);

    const upd = {
      potentialAction: Object.assign({}, createGraphAction, {
        result: {
          '@graph': nodes.map(node => {
            if (getId(node) !== getId(graph)) {
              return node;
            }

            return Object.assign({}, node, {
              hasDigitalDocumentPermission: arrayify(
                node.hasDigitalDocumentPermission
              )
                .filter(permissionId => {
                  const permission = nodeMap[getId(permissionId)];
                  return (
                    !permission ||
                    permission.permissionType !== 'ViewIdentityPermission'
                  );
                })
                .concat(nextPermissions)
            });
          })
        }
      })
    };

    updateWorkflowSpecification(getId(journal), getId(workflow), upd);
  };

  handleChangeCreateGraphAction = nextCreateGraphAction => {
    const { journal, workflow, updateWorkflowSpecification } = this.props;
    const upd = { potentialAction: nextCreateGraphAction };
    updateWorkflowSpecification(getId(journal), getId(workflow), upd);
  };

  handleChangePublicAudiences = nextAudiences => {
    const { journal, workflow, updateWorkflowSpecification } = this.props;

    const createGraphAction = arrayify(workflow.potentialAction)[0];

    const nodes = arrayify(
      createGraphAction &&
        createGraphAction.result &&
        createGraphAction.result['@graph']
    );

    const upd = {
      potentialAction: Object.assign({}, createGraphAction, {
        result: {
          '@graph': nodes.map(node => {
            if (node['@type'] === 'PublishAction') {
              return Object.assign({}, node, {
                publishIdentityOf: nextAudiences
              });
            }

            return node;
          })
        }
      })
    };

    updateWorkflowSpecification(getId(journal), getId(workflow), upd);
  };

  handleToggleIsSingleStage = e => {
    const { journal, workflow, updateWorkflowSpecification } = this.props;

    const nextChecked = e.target.checked;

    const createGraphAction = arrayify(workflow.potentialAction)[0];

    // we completely reset the graph
    const upd = {
      potentialAction: Object.assign({}, createGraphAction, {
        result: {
          '@type': 'Graph',
          hasDigitalDocumentPermission: getDefaultGraphDigitalDocumentPermissions(),
          potentialAction: nextChecked
            ? DEFAULT_SINGLE_STAGE_CREATE_WORKFLOW_STAGE_ACTION
            : DEFAULT_CREATE_WORKFLOW_STAGE_ACTION
        }
      })
    };

    updateWorkflowSpecification(getId(journal), getId(workflow), upd);
  };

  render() {
    const {
      workflow,
      journal,
      onClose,
      updateStatus,
      disabled,
      screenWidth
    } = this.props;

    if (!journal || !workflow) {
      return null;
    }

    const readOnly = disabled;

    const bem = BemTags();

    const createGraphAction = arrayify(workflow.potentialAction)[0];

    const nodes = arrayify(
      createGraphAction &&
        createGraphAction.result &&
        createGraphAction.result['@graph']
    );
    const graphNodes = nodes.filter(
      node => node['@type'] === 'Graph' && node.version == null
    );
    // root graph
    const graph = graphNodes.filter(
      graphNode => !nodes.some(node => getId(node.result) === getId(graphNode))
    )[0];
    const nodeMap = getNodeMap(nodes);

    const permissions = arrayify(graph.hasDigitalDocumentPermission)
      .map(permissionId => {
        const permission = nodeMap[permissionId];
        if (
          permission &&
          permission.permissionType === 'ViewIdentityPermission'
        ) {
          return embed(permission, nodeMap);
        }
      })
      .filter(Boolean);

    const publishAction = nodes.find(node => node['@type'] === 'PublishAction');
    const publicAudiences = arrayify(
      publishAction && publishAction.publishIdentityOf
    )
      .map(id => nodeMap[getId(id)])
      .filter(Boolean);

    const isSingleStageWorkflow =
      nodes.filter(node => node['@type'] === 'StartWorkflowStageAction')
        .length === 1;

    const layout = screenWidth > CSS_TABLET ? 'multiColumn' : 'singleColumn';

    return (
      <div className={bem`workflow-editor`}>
        <section className={bem`section`}>
          <div className={bem`form-group --metadata`}>
            <ControledPaperInput
              label="Name"
              name="name"
              autoComplete="off"
              value={getValue(workflow.name) || ''}
              onSubmit={this.handleChangeMetadata}
              disabled={disabled}
              readOnly={readOnly}
              large={true}
            />

            <ControledPaperTextarea
              label="Description"
              name="description"
              value={getValue(workflow.description || '')}
              onSubmit={this.handleChangeMetadata}
              disabled={disabled}
              readOnly={readOnly}
              large={true}
            />

            <ControledPaperInput
              label="Expected time to publication or rejection (in days)"
              name="expectedDuration"
              autoComplete="off"
              type="number"
              min={0}
              step={1}
              value={moment
                .duration(workflow.expectedDuration || 'P60D')
                .asDays()}
              onSubmit={this.handleChangeMetadata}
              disabled={disabled}
              readOnly={readOnly}
              large={true}
            />
          </div>
        </section>

        <section className={bem`section`}>
          <header className={bem`header`}>
            <h3 className={bem`title`}>Submission anonymity settings</h3>
          </header>
          <ViewIdentityPermissionEditor
            disabled={disabled}
            readOnly={readOnly}
            defaultExpanded={false}
            viewIdentityPermission={permissions}
            onChange={this.handleChangePermissions}
          />
        </section>

        <section className={bem`section`}>
          <header className={bem`header`}>
            <h3 className={bem`title`}>Post-publication anonymity settings</h3>
          </header>

          <div className={bem`__public-audience-matrix-wrapper`}>
            <PublicViewIdentityPermissionEditor
              disabled={disabled}
              readOnly={readOnly}
              audiences={publicAudiences}
              onChange={this.handleChangePublicAudiences}
            />
          </div>
        </section>

        <section className={bem`section --stages-editor`}>
          <header className={bem`header`}>
            <h3 className={bem`title`}>Editorial workflow stages</h3>
          </header>

          <div className={bem`__single-stage-control`}>
            <PaperCheckbox
              name="isSingleStage"
              checked={isSingleStageWorkflow}
              onChange={this.handleToggleIsSingleStage}
            >
              Single stage workflow (combined submission and production stage)
            </PaperCheckbox>
          </div>

          {journal && (
            <Search
              index="service"
              query={`(audienceAudienceScope:"${escapeLucene(
                getId(journal.publisher)
              )}" AND serviceType:"${TYPESETTING_SERVICE_TYPE}" AND serviceStatus:"ActiveServiceStatus") OR (serviceType:"${DOI_REGISTRATION_SERVICE_TYPE}" AND serviceStatus:"ActiveServiceStatus")`}
              hydrate="provider"
            >
              {({ items, droplets, error, isActive }) => {
                const potentialServices = items.map(item => {
                  if (getId(item.provider) in droplets) {
                    Object.assign({}, item, {
                      provider: droplets[getId(item.provider)]
                    });
                  }
                  return item;
                });

                return (
                  <CreateGraphActionEditor
                    readOnly={readOnly}
                    disabled={disabled}
                    periodical={journal}
                    layout={layout}
                    potentialServices={potentialServices}
                    createGraphAction={createGraphAction}
                    onChange={this.handleChangeCreateGraphAction}
                  />
                );
              }}
            </Search>
          )}
        </section>

        <section className={bem`section --controls`}>
          <ControlPanel>
            <PaperButton
              disabled={updateStatus.status === 'active'}
              onClick={onClose}
            >
              Close
            </PaperButton>
          </ControlPanel>
        </section>
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.screenWidth,
    screenWidth => {
      return { screenWidth };
    }
  ),
  {
    updateWorkflowSpecification
  }
)(WorkflowEditor);
