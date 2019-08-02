import React from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';
import { getId } from '@scipe/jsonld';
import { RichTextarea } from '@scipe/ui';
import { getVersion, getLocationIdentifier } from '@scipe/librarian';
import Annotable from './annotable';
import Counter from '../utils/counter';
import { ERROR_MISSING_VALUE } from '../constants';
import {
  getSelectorGraphParam,
  getRelativeLocationLink
} from '../utils/annotations';

export default class ReleaseNotesEditor extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    graph: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,

    action: PropTypes.shape({
      '@type': PropTypes.oneOf(['CreateReleaseAction']),
      releaseNotes: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
    }).isRequired,

    isBlocked: PropTypes.bool,
    canComment: PropTypes.bool,
    canPerform: PropTypes.bool,

    // for suggestion autocomplete
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    ),

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    saveWorkflowAction: PropTypes.func
  };

  static defaultProps = {
    action: {},
    saveWorkflowAction: noop
  };

  handleSubmit = e => {
    const { action, graph, saveWorkflowAction } = this.props;
    const upd = {
      '@id': getId(action),
      [e.target.name]: e.target.value
    };

    saveWorkflowAction(getId(graph), upd);
  };

  suggestionMapper = location => {
    const { action } = this.props;

    return getRelativeLocationLink(
      getVersion(getSelectorGraphParam(action)),
      location
    );
  };

  render() {
    const {
      graphId,
      counter,
      action,
      readOnly,
      disabled,
      annotable,
      displayAnnotations,
      displayPermalink,
      canComment,
      canPerform,
      isBlocked,
      createSelector,
      matchingLevel,
      locationOptions
    } = this.props;

    return (
      <div className="release-notes-editor">
        <section className="selectable-indent reverse-z-index">
          <h4 className="annotable-action__sub-title">Release notes</h4>

          <Annotable
            graphId={graphId}
            selector={createSelector(
              {
                '@type': 'NodeSelector',
                graph: getSelectorGraphParam(action),
                node: getId(action),
                selectedProperty: 'releaseNotes'
              },
              `release-notes-editor-${getId(action)}-releaseNotes`
            )}
            counter={counter.increment({
              value: getLocationIdentifier(action['@type'], 'releaseNotes'),
              level: 3,
              key: `release-notes-editor-${getId(action)}-releaseNotes`
            })}
            info={
              !disabled &&
              canPerform &&
              !isBlocked &&
              (action.releaseNotes == null || action.releaseNotes == '')
                ? ERROR_MISSING_VALUE
                : undefined
            }
            selectable={false}
            annotable={annotable && canComment}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
            matchingLevel={matchingLevel}
          >
            {(id, onResize) => (
              <div className="release-notes-editor__text-editor" id={id}>
                <RichTextarea
                  onResize={onResize}
                  name="releaseNotes"
                  label="body"
                  readOnly={readOnly}
                  disabled={disabled || !canPerform || isBlocked}
                  defaultValue={action.releaseNotes}
                  options={locationOptions}
                  onSubmit={this.handleSubmit}
                  suggestionMapper={this.suggestionMapper}
                />
              </div>
            )}
          </Annotable>
        </section>
      </div>
    );
  }
}
