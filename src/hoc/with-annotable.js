import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import debounce from 'lodash/debounce';
import {
  setMeasurableRef,
  deleteMeasurableRef,
  repositionAnnotations,
  unfocusAnnotation
} from '../actions/annotation-action-creators';

export default function withAnnotable(ComposedComponent) {
  class WithAnnotable extends React.Component {
    constructor(props) {
      super(props);
      this.measurableRef = this.measurableRef.bind(this);

      this.handleClick = this.handleClick.bind(this);
      this.handleLoad = this.handleLoad.bind(this);
      this.handleResize = debounce(this.handleResize.bind(this), 200);
    }

    measurableRef($el) {
      if ($el !== this.$measurable) {
        this.$measurable = $el;
        this.props.setMeasurableRef(this.$measurable);
      }
    }

    componentDidMount() {
      window.addEventListener('load', this.handleLoad, false);
      window.addEventListener('resize', this.handleResize, true);
      this.props.setMeasurableRef(document.body);
    }

    componentWillUnmount() {
      window.removeEventListener('load', this.handleLoad, false);
      window.removeEventListener('resize', this.handleResize, true);
      this.handleResize.cancel();

      this.props.deleteMeasurableRef();
    }

    handleLoad() {
      this.props.repositionAnnotations(null, {
        caller: 'withAnnotable',
        method: 'handleLoad'
      });
    }

    handleResize() {
      this.props.repositionAnnotations(null, {
        caller: 'withAnnotable',
        method: 'handleResize'
      });
    }

    handleClick(e) {
      // unfocus annotation
      let selection = window.getSelection();
      if (
        !selection.isCollapsed ||
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'A' ||
        (e.target.classList && e.target.classList.contains('select-bar'))
      ) {
        //there is a selection or target is select-bar => we are creating a new annotation
        return;
      }
      this.props.unfocusAnnotation();
    }

    render() {
      return (
        <div style={{ height: '100%' }} onClick={this.handleClick}>
          <ComposedComponent
            {...this.props}
            measurableRef={this.measurableRef}
          />
        </div>
      );
    }
  }

  WithAnnotable.propTypes = {
    unfocusAnnotation: PropTypes.func.isRequired,
    repositionAnnotations: PropTypes.func.isRequired,
    setMeasurableRef: PropTypes.func.isRequired,
    deleteMeasurableRef: PropTypes.func.isRequired
  };

  return connect(
    null,
    {
      unfocusAnnotation,
      setMeasurableRef,
      deleteMeasurableRef,
      repositionAnnotations
    }
  )(WithAnnotable);
}
