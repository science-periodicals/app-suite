import React, { Component } from 'react';

/**
 * HOC that prevents selection of multiple annotable content blocks
 */
export default function withForceSingleBlockSelection(ComposedComponent) {
  return class WithForceSingleBlockSelection extends Component {
    constructor(props) {
      super(props);
      this.onMouseUp = this.onMouseUp.bind(this);
      this.onMouseDown = this.onMouseDown.bind(this);
      this.onMouseMove = this.onMouseMove.bind(this);
    }

    componentDidMount() {
      document.addEventListener('mouseup', this.onMouseUp, false);
    }

    componentWillUnmount() {
      document.removeEventListener('mouseup', this.onMouseUp);
    }

    onMouseDown(e) {
      let $el = this.$root;
      let $scope = e.target;
      while (
        $scope !== $el &&
        !$scope.classList &&
        !$scope.classList.contains('annotable')
      ) {
        $scope = $scope.parentElement;
        if ($scope === $el) {
          return;
        }
      }
      if ($scope.getElementsByClassName('annotable').length) {
        return;
      }
      let rect = $scope.getBoundingClientRect();
      let scrollTop =
        document.documentElement.scrollTop || document.body.scrollTop;
      let scrollLeft =
        document.documentElement.scrollLeft || document.body.scrollLeft;

      this._selectBoundaries = {
        top: rect.top + scrollTop,
        bottom: rect.bottom + scrollTop,
        left: rect.left + scrollLeft,
        right: rect.right + scrollLeft
      };
    }

    onMouseMove(e) {
      if (this._selectBoundaries) {
        let x =
          e.clientX +
          (document.documentElement.scrollLeft || document.body.scrollLeft);
        let y =
          e.clientY +
          (document.documentElement.scrollTop || document.body.scrollTop);
        if (
          x < this._selectBoundaries.left ||
          x > this._selectBoundaries.right ||
          y < this._selectBoundaries.top ||
          y > this._selectBoundaries.bottom
        ) {
          if (e.preventDefault) e.preventDefault();
          //super aggressive but for e.preventDefault() to be able to
          //prevent the expansion of the selection we would need to
          //call it on mousedown as well which would prevent to start
          //the selection...
          let selection = window.getSelection();
          selection.removeAllRanges();
        }
      }
    }

    onMouseUp(e) {
      delete this._selectBoundaries;
    }

    render() {
      return (
        <div
          ref={$el => {
            this.$root = $el;
          }}
          onMouseDown={this.onMouseDown}
          onMouseMove={this.onMouseMove}
          onMouseUp={this.onMouseUp}
          onTouchStart={this.onMouseDown}
          onTouchMove={this.onMouseMove}
          onTouchEnd={this.onMouseUp}
        >
          <ComposedComponent {...this.props} />
        </div>
      );
    }
  };
}
