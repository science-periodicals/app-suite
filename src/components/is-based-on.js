import React from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';
import { connect } from 'react-redux';
import { getId } from '@scipe/jsonld';
import { Value, RdfaCite, API_LABELS } from '@scipe/ui';
import { getScopeId, schema } from '@scipe/librarian';
import Iconoclass from '@scipe/iconoclass';
import Thumbnail from './thumbnail';
import Node from './node';
import { openShell } from '../actions/ui-action-creators';

export default connect(null, {
  openShell
})(
  class IsBasedOn extends React.Component {
    static propTypes = {
      id: PropTypes.string,
      graphId: PropTypes.string.isRequired,
      router: PropTypes.any,
      isBasedOn: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
      readOnly: PropTypes.bool.isRequired,
      disabled: PropTypes.bool.isRequired,
      onDelete: PropTypes.func,
      openShell: PropTypes.func.isRequired
    };

    static defaultProps = {
      onDelete: noop
    };

    constructor(props) {
      super(props);
      this.handleDelete = this.handleDelete.bind(this);
    }

    handleDelete(e) {
      const { isBasedOn } = this.props;
      this.props.onDelete(getId(isBasedOn), e);
    }

    handleClick(resource = {}, e) {
      const { graphId } = this.props;

      // if proper resource or citation from the graph, we open the shell
      let shellType;
      if (
        graphId &&
        getScopeId(getId(resource.resourceOf)) === getScopeId(graphId)
      ) {
        shellType = 'resource';
      } else if (schema.is(resource, 'CreativeWork')) {
        shellType = 'citation';
      }

      if (shellType) {
        e.preventDefault();
        this.props.openShell(shellType, getId(resource));
      }
    }

    render() {
      const { id, isBasedOn, readOnly, disabled, graphId } = this.props;

      const uri = getId(isBasedOn);

      return (
        <Node graphId={graphId} node={uri} embed="*">
          {resource => (
            <div id={id} className="is-based-on">
              <div className="is-based-on__primary-info">
                <div className="is-based-on__primary-info__thumbnail-container">
                  <Thumbnail
                    popUpPreview={true}
                    resource={isBasedOn !== uri ? isBasedOn : undefined}
                    fallback={isBasedOn !== uri ? 'icon' : 'link'}
                  />
                </div>

                <div className="is-based-on__primary-info__name">
                  <RdfaCite
                    object={resource}
                    predicate="schema:isBasedOn"
                    onClick={this.handleClick.bind(this, resource)}
                  />
                </div>
              </div>

              <div className="is-based-on__title">
                <Value>
                  {resource.name ||
                    resource.description ||
                    resource.caption ||
                    resource.transcript}
                </Value>
              </div>

              <div className="is-based-on__file-type">
                {API_LABELS[resource['@type']] || resource['@type'] || 'URL'}
              </div>

              {!readOnly ? (
                <Iconoclass
                  iconName="delete"
                  behavior="button"
                  disabled={disabled}
                  onClick={this.handleDelete}
                />
              ) : (
                <div style={{ width: '32px', minWidth: '32px' }} />
              )}
            </div>
          )}
        </Node>
      );
    }
  }
);
