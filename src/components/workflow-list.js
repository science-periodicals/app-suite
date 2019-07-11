import React from 'react';
import PropTypes from 'prop-types';
import { getId, getNodeMap, arrayify, embed } from '@scipe/jsonld';
import {
  ExpansionPanelGroup,
  ExpansionPanel,
  ExpansionPanelPreview,
  CreateGraphActionEditor,
  ViewIdentityPermissionEditor,
  Value,
  AccessBadge,
  PeerReviewBadge,
  BemTags
} from '@scipe/ui';

export default class WorkflowList extends React.Component {
  static propTypes = {
    workflows: PropTypes.arrayOf(PropTypes.object), // workflow specifications
    journal: PropTypes.object.isRequired
  };

  static defaultProps = {
    workflows: []
  };

  render() {
    const { workflows, journal } = this.props;

    const bem = BemTags();

    return (
      <ExpansionPanelGroup className={bem`workflow-list`}>
        {workflows.map(workflow => {
          return (
            <ExpansionPanel
              key={getId(workflow)}
              className={bem`__item__`}
              hasNestedCollapse={true}
            >
              <ExpansionPanelPreview className={bem`__preview-row`}>
                <div className={bem`__preview-content`}>
                  <Value className={bem`__preview-content-text`} tagName="span">
                    {workflow.name || 'workflow'}
                  </Value>
                  <div className={bem`__badges`}>
                    <AccessBadge workflowSpecification={workflow} />
                    <PeerReviewBadge
                      workflowSpecification={workflow}
                      className={bem`__badge`}
                    />
                  </div>
                </div>
              </ExpansionPanelPreview>

              <div>
                <Value className={bem`__description`}>
                  {workflow.description}
                </Value>

                <section>
                  <ViewIdentityPermissionEditor
                    readOnly={true}
                    viewIdentityPermission={getViewIdentityPermission(workflow)}
                  />
                </section>
                <section>
                  {/* TODO MQL to set the `layout` prop */}
                  <CreateGraphActionEditor
                    disabled={true}
                    readOnly={true}
                    periodical={journal}
                    createGraphAction={arrayify(workflow.potentialAction)[0]}
                  />
                </section>
              </div>
            </ExpansionPanel>
          );
        })}
      </ExpansionPanelGroup>
    );
  }
}

function getViewIdentityPermission(workflow) {
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

  return arrayify(graph.hasDigitalDocumentPermission)
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
}
