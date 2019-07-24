import React from 'react';
import PropTypes from 'prop-types';
import querystring from 'querystring';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId, unprefix } from '@scipe/jsonld';
import { getScopeId, getVersion } from '@scipe/librarian';
import { Value, Version } from '@scipe/ui';
import Counter from '../../utils/counter';
import TableObject from '../table-object';
import ResourceContent from '../resource-content';
import Notice from '../notice';
import ScrollLink from '../scroll-link';
import {
  createActionMapSelector,
  createGraphAclSelector
} from '../../selectors/graph-selectors';
import { getWorkflowAction } from '../../utils/workflow';
import {
  getSelectorGraphParam,
  prettifyLocation
} from '../../utils/annotations';

class ShellLocation extends React.Component {
  static propTypes = {
    hash: PropTypes.string.isRequired,
    graphId: PropTypes.string.isRequired, // Note that redux may rewrite the `graphId` prop to set the right version
    blindingData: PropTypes.object,
    counter: PropTypes.instanceOf(Counter),
    renderingContextActionId: PropTypes.string.isRequired,
    renderingContextPathname: PropTypes.string.isRequired,
    renderingContextSearch: PropTypes.string.isRequired,

    // redux
    shortVersion: PropTypes.string.isRequired,
    version: PropTypes.string.isRequired,
    renderingContextVersion: PropTypes.string.isRequired,
    contentNode: PropTypes.object,
    contentResource: PropTypes.object
  };

  static defaultProps = {
    counter: new Counter(),
    contentNode: {}
  };

  renderBody() {
    const {
      graphId,
      counter,
      blindingData,
      contentNode: { $node },
      contentResource
    } = this.props;

    if (!$node) {
      return (
        <p className="shell-location__content--padded">No preview available</p>
      );
    }

    // TODO handle back matter sections + citations (special cases)
    // TODO handle front matter sections (more work, need document-worker cleanups)

    switch ($node.localName) {
      case 'li': {
        // just render the specific item but wrapped in a generic <ul> to have valid markup
        return (
          <ul className="shell-location__content--padded">
            <Value
              escHtml={false}
              tagName="li"
              className="sa__serif-body-user-type"
            >
              {$node.innerHTML || $node.textContent}
            </Value>
          </ul>
        );
      }

      case 'figure': {
        const figureResourceId = $node.getAttribute('resource');
        const figureResourceType = unprefix($node.getAttribute('typeof'));

        if (!figureResourceId || !figureResourceType || !contentResource) {
          return (
            <p className="shell-location__content--padded">
              No preview available
            </p>
          );
        }

        return (
          <ResourceContent
            graphId={graphId}
            shellified={true}
            resourceId={getId(contentResource)}
            readOnly={true}
            disabled={true}
            counter={counter}
            annotable={false}
            displayAnnotations={false}
            displayPermalink={false}
            blindingData={blindingData}
          />
        );
      }

      case 'aside': {
        const asideResourceId = $node.getAttribute('resource');
        const asideResourceType = unprefix($node.getAttribute('typeof'));
        if (!asideResourceId) {
          return (
            <p className="shell-location__content--padded">
              No preview available
            </p>
          );
        }

        if (
          asideResourceId &&
          asideResourceType === 'TextBox' &&
          contentResource
        ) {
          return (
            <ResourceContent
              graphId={graphId}
              shellified={true}
              resource={contentResource}
              readOnly={true}
              disabled={true}
              counter={counter}
              annotable={false}
              displayAnnotations={false}
              displayPermalink={false}
              blindingData={blindingData}
            />
          );
        } else {
          return (
            <Value
              escHtml={false}
              className="shell-location__content--padded sa__serif-body-user-type"
            >
              {$node.outerHTML || $node.innerHTML || $node.textContent}
            </Value>
          );
        }
      }

      case 'table': {
        return <TableObject content={{ html: $node.outerHTML }} />;
      }

      default:
        return (
          <Value
            escHtml={false}
            className="shell-location__content--padded sa__serif-body-user-type"
          >
            {$node.outerHTML || $node.innerHTML || $node.textContent}
          </Value>
        );
    }
  }

  handleScrollLinkClick = e => {
    e.stopPropagation();
  };

  render() {
    const {
      shortVersion,
      version,
      renderingContextVersion,
      hash,
      renderingContextSearch,
      renderingContextPathname
    } = this.props;

    const search = `?${querystring.stringify(
      Object.assign(querystring.parse(renderingContextSearch.substring(1)), {
        version
      })
    )}`;

    return (
      <div className="shell-location">
        <Notice>
          <span>
            You are viewing location{' '}
            <ScrollLink
              to={{
                pathname: renderingContextPathname,
                search,
                hash
              }}
              onClick={this.handleScrollLinkClick}
            >
              {prettifyLocation(hash)}
            </ScrollLink>
            of version{' '}
            <Version
              type={renderingContextVersion === version ? 'current' : 'prev'}
            >
              {shortVersion}
            </Version>{' '}
            of the submission.
          </span>
        </Notice>

        <div className="shell-location__content">{this.renderBody()}</div>
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    (state, props) => {
      return props.graphId;
    },
    (state, props) => {
      return props.renderingContextActionId;
    },
    (state, props) => {
      return props.hash;
    },
    (state, props) => {
      return state.scopeMap[getScopeId(props.graphId)].graphMap;
    },
    state => state.contentMap,
    createActionMapSelector(),
    createGraphAclSelector(),
    (
      user,
      graphId,
      actionId,
      hash,
      graphMap = {},
      contentMap,
      actionMap,
      acl
    ) => {
      const [shortVersion, identifier] = hash.substring(2).split(':');

      const action = getWorkflowAction(actionId, { actionMap, user, acl });
      const renderingContextVersion = getVersion(getSelectorGraphParam(action));

      const version = `${shortVersion}.0-0`;
      const scopeId = getScopeId(graphId);
      const releaseId = `${scopeId}?version=${version}`;

      const { graph, nodeMap = {} } =
        graphMap[releaseId] || graphMap[scopeId] || {};

      const mainEntity = nodeMap[getId(graph.mainEntity)];
      let contentNode, contentResource;
      if (mainEntity) {
        let content;
        for (let encoding of mainEntity.encoding) {
          const encodingId = getId(encoding);
          if (encodingId in contentMap && contentMap[encodingId].byLocationId) {
            content = contentMap[encodingId];
            break;
          }
        }

        if (content) {
          const { byLocationId } = content;

          const [prefix, locIndex] = identifier.split('.');

          contentNode = byLocationId[`${prefix}.${locIndex}`];

          if (contentNode) {
            const resourceId = contentNode.$node.getAttribute('resource');
            if (resourceId) {
              contentResource = nodeMap[resourceId];
            }
          }
        }
      }

      return {
        graphId: getId(graph),
        contentNode,
        contentResource,
        shortVersion,
        version,
        renderingContextVersion
      };
    }
  )
)(ShellLocation);
