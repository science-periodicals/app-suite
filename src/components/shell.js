import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import classNames from 'classnames';
import { getId, unrole, arrayify } from '@scipe/jsonld';
import {
  getResourceInfo,
  Card,
  RdfaCitation,
  RdfaRoleContactPoints
} from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import Annotation from './annotation';
import ResourceContent from './resource-content';
import Footnote from './footnote';
import ContributeAction from './contribute-action';
import RoleAffiliation from './role-affiliation';
import Node from './node';
import {
  createGraphAclSelector,
  createGraphDataSelector,
  createActionMapSelector,
  createCommentMapSelector
} from '../selectors/graph-selectors';
import { getOverwriteNodeMap } from '../utils/workflow';
import { closeShell } from '../actions/ui-action-creators';
import ShellEditor from './shell-editor';
import Counter from '../utils/counter';
import ShellAttachment from './shell/shell-attachment';
import ShellComments from './shell/shell-comments';
import ShellLocation from './shell/shell-location';
import ShellSubmission from './shell/shell-submission';
import ScrollLink from './scroll-link';

const KEY_ESC = 27;

class Shell extends Component {
  static propTypes = {
    className: PropTypes.string,
    journalId: PropTypes.string.isRequired,
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the action providing the rendering context
    blindingData: PropTypes.object,
    counter: PropTypes.instanceOf(Counter),

    renderingContextPathname: PropTypes.string,
    renderingContextSearch: PropTypes.string,

    // redux
    selector: PropTypes.object, // injected from the ui reducer state
    type: PropTypes.oneOf([
      'submission',
      'comments',
      'edit',
      'roleAction',
      'roleAffiliation',
      'roleContactPoint',
      'requirement', // resource or citation
      'resource',
      'citation',
      'annotation',
      'footnote',
      'attachment',
      'location' // full scholarly article
    ]),
    body: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    connectedComponent: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.element,
      PropTypes.func
    ]),
    nodeMap: PropTypes.object,
    params: PropTypes.object,
    hash: PropTypes.string, // the hash (id) of the content being edited (to provide scroll back link)
    disabled: PropTypes.bool, // injected from the ui reducer state
    readOnly: PropTypes.bool,
    isOpen: PropTypes.bool,
    closeShell: PropTypes.func.isRequired
  };

  static defaultProps = {
    counter: new Counter(),
    params: {}
  };

  componentDidMount() {
    document.addEventListener('keydown', this.handlePressEsc, false);
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.rafId);
    document.removeEventListener('keydown', this.handlePressEsc, false);
  }

  handleShellClick(e) {}

  handlePressEsc = e => {
    if (e.keyCode === KEY_ESC) {
      this.props.closeShell();
    }
  };

  handleCloseShell = e => {
    this.props.closeShell();
  };

  shouldComponentUpdate(nextProps, nextState) {
    // if the shell was close and is still close do not update as we can't see what's inside!
    if (!this.props.isOpen && !nextProps.isOpen) {
      return false;
    }
    return true;
  }

  componentDidUpdate(prevProps, prevState) {
    const { isOpen } = this.props;
    const $shell = this.$shell;
    if ($shell && isOpen) {
      //if shell has been resized, maxHeigh has been fixed in JS we remove that so that the shell can be closed
      $shell.style.maxHeight = '';

      const $content = this.$content;
      $content.style.maxHeight = '';
      $content.scrollTop = 0;
    }
  }

  handleResizeShell = e => {
    e.preventDefault();
    e.stopPropagation();

    const $shell = this.$shell;
    const $content = this.$content;

    const viewportHeight =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight;

    // disable transition while we resize the shell
    $shell.classList.add('shell--no-transition');

    let isDragging = true;
    let p;
    const resize = () => {
      if (isDragging) {
        this.rafId = window.requestAnimationFrame(resize);
      }
      if (p != null) {
        $shell.style.maxHeight = p * 100 + 'vh';
        $content.style.maxHeight = p * viewportHeight - 128 + 'px';
      }
    };
    this.rafId = window.requestAnimationFrame(resize);

    function handleMove(e) {
      const y = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
      p = Math.max(
        112 / viewportHeight,
        Math.min(1 - y / viewportHeight, 0.75)
      );
    }

    function stopDrag(e) {
      isDragging = false;
      window.removeEventListener('mousemove', handleMove, false);
      window.removeEventListener('mouseup', stopDrag, false);
      window.removeEventListener('touchmove', handleMove, false);
      window.removeEventListener('touchend', stopDrag, false);
      $shell.classList.remove('shell--no-transition');
    }

    window.addEventListener('mousemove', handleMove, false);
    window.addEventListener('mouseup', stopDrag, false);
    window.addEventListener('touchmove', handleMove, false);
    window.addEventListener('touchend', stopDrag, false);
  };

  renderContent() {
    const {
      journalId,
      graphId,
      actionId,
      type,
      body,
      disabled,
      readOnly,
      blindingData,
      counter,
      hash,
      connectedComponent,
      params,
      nodeMap,
      renderingContextPathname,
      renderingContextSearch
    } = this.props;

    switch (type) {
      case 'comments':
        return (
          <ShellComments
            journalId={journalId}
            graphId={graphId}
            actionId={getId(body)}
            counter={counter}
            blindingData={blindingData}
            disabled={disabled}
            readOnly={readOnly}
            search={params.search}
          />
        );

      case 'citation':
        // TODO improve and keep the role citation to display the point citation in shell
        return (
          <Node graphId={graphId} node={body} embed="*">
            {citation => {
              return (
                <div className="shell__content__citation scholarly-css">
                  <RdfaCitation
                    object={unrole(citation, 'citation')}
                    predicate="schema:citation"
                  />
                </div>
              );
            }}
          </Node>
        );

      case 'footnote':
        return (
          <Footnote
            graphId={graphId}
            comment={body}
            shellified={true}
            resourceId={getId(body.about)}
            nodeMap={nodeMap}
            counter={counter}
            annotable={false}
            displayAnnotations={false}
            displayPermalink={false}
            blindingData={blindingData}
            backlink={params.backlink}
            backlinkTextContent={params.backlinkTextContent}
          />
        );

      case 'roleAffiliation': {
        return (
          <RoleAffiliation
            graphId={graphId}
            blindingData={blindingData}
            nodeMap={nodeMap}
            affiliation={body}
            backlink={params.backlink}
            backlinkTextContent={params.backlinkTextContent}
          />
        );
      }

      case 'roleContactPoint': {
        return (
          <Node graphId={graphId} node={body} embed="*">
            {role => (
              <div className="shell__content__role-contact-point">
                {!!params.backlink && (
                  <ScrollLink
                    className="role-affiliation__symbol"
                    to={params.backlink}
                    preventLinkInterceptor={true}
                  >
                    {params.backlinkTextContent}
                  </ScrollLink>
                )}
                <span>Contact information</span>

                <RdfaRoleContactPoints object={role} />
              </div>
            )}
          </Node>
        );
      }

      case 'roleAction': {
        return (
          <ContributeAction
            graphId={graphId}
            action={body}
            nodeMap={nodeMap}
            backlink={params.backlink}
            backlinkTextContent={params.backlinkTextContent}
          />
        );
      }

      case 'resource':
        return (
          <ResourceContent
            graphId={graphId}
            shellified={true}
            resourceId={getId(body)}
            nodeMap={nodeMap}
            readOnly={true}
            disabled={true}
            counter={counter}
            annotable={false}
            displayAnnotations={false}
            displayPermalink={false}
            blindingData={blindingData}
          />
        );

      case 'annotation':
        return (
          <Annotation
            shellified={true}
            journalId={journalId}
            graphId={graphId}
            annotation={body}
            blindingData={blindingData}
          />
        );

      case 'edit':
        return (
          <ShellEditor
            params={params}
            hash={hash}
            connectedComponent={connectedComponent}
            disabled={disabled}
            readOnly={readOnly}
          />
        );

      case 'attachment':
        return (
          <ShellAttachment
            journalId={journalId}
            graphId={graphId}
            actionId={body}
            blindingData={blindingData}
          />
        );

      case 'location':
        return (
          <ShellLocation
            journalId={journalId}
            graphId={graphId}
            renderingContextActionId={actionId}
            renderingContextPathname={renderingContextPathname}
            renderingContextSearch={renderingContextSearch}
            hash={hash}
            blindingData={blindingData}
          />
        );

      case 'submission':
        return <ShellSubmission journalId={journalId} graphId={graphId} />;

      default:
        return null;
    }
  }

  render() {
    const { isOpen, body, type, className } = this.props;
    if (!type || (type !== 'edit' && !body)) return null;

    return (
      <div
        className={classNames('shell', className, `shell--${type}`, {
          'shell--close': !isOpen
        })}
        onClick={this.handleShellClick.bind(this)}
        ref={$el => {
          this.$shell = $el;
        }}
      >
        <div className="shell__card-container">
          <Card className="shell__card" bevel={true}>
            <div className="shell__controls">
              <Iconoclass
                className="shell__controls--drag"
                iconName="drag"
                elementType="button"
                behavior="button"
                color="grey"
                onMouseDown={this.handleResizeShell}
                onTouchStart={this.handleResizeShell}
              />
              <Iconoclass
                className="shell__controls--delete"
                iconName="delete"
                elementType="button"
                color="grey"
                behavior="button"
                onClick={this.handleCloseShell}
              />
            </div>
            <div
              className="shell__content"
              ref={$content => (this.$content = $content)}
            >
              {this.renderContent()}
            </div>
          </Card>
        </div>
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    state => state.shell,
    (state, props) => props.actionId,
    state => state.annotations,
    createGraphAclSelector(),
    createGraphDataSelector(),
    createActionMapSelector(),
    createCommentMapSelector(),
    (
      user,
      shell = {},
      actionId,
      annotations = {},
      acl,
      graphData = {},
      actionMap = {},
      commentMap = {}
    ) => {
      let type, id, body;

      const overwriteNodeMap = getOverwriteNodeMap(actionId, {
        user,
        actionMap,
        acl
      });

      if (shell.isOpen) {
        type = shell.type;
        id = shell.id;

        if (type === 'attachment' || type === 'submission') {
          body = id;
        } else if (type === 'location') {
          body = id;
        } else if (type === 'annotation') {
          body = arrayify(annotations.annotations).find(
            annotation => annotation.id === id
          );
        } else {
          const nodeMap = overwriteNodeMap || graphData.nodeMap;
          if (nodeMap) {
            body = nodeMap[id];
          }

          if (!body) {
            body =
              (actionMap && actionMap[id]) || (commentMap && commentMap[id]);
          }

          if (body && type === 'requirement') {
            // either a resource or a citation, we resolve it here
            const resourceInfo = getResourceInfo(graphData.graph, nodeMap);
            type = resourceInfo.resourceIds.some(_id => _id === id)
              ? 'resource'
              : 'citation';
          }
        }
      }

      return {
        nodeMap: overwriteNodeMap,
        type,
        body,
        selector: shell.selector,
        isOpen: shell.isOpen,
        disabled: shell.disabled,
        readOnly: shell.readOnly,
        hash: shell.hash,
        connectedComponent: shell.connectedComponent,
        params: shell.params
      };
    }
  ),
  {
    closeShell
  }
)(Shell);
