import React from 'react';
import PropTypes from 'prop-types';
import { CSS_LARGE_DESKTOP } from '@scipe/ui';

export default function withShowPanel(
  ComposedComponent,
  {
    // default show function:
    // it should be overwritten to specify minimal width where a 3 columns layout is OK
    show = function(screenWidth) {
      return screenWidth >= CSS_LARGE_DESKTOP;
    }
  } = {}
) {
  class WithShowPanel extends React.Component {
    static propTypes = {
      screenWidth: PropTypes.string
    };

    constructor(props) {
      super(props);

      this.state = {
        showPanel: show(props.screenWidth),
        wasIntentionallyOpened: false
      };
    }

    componentDidUpdate(prevProps, prevState) {
      if (
        this.state.showPanel &&
        !this.state.wasIntentionallyOpened &&
        show(prevProps.screenWidth) &&
        !show(this.props.screenWidth)
      ) {
        this.setState({ showPanel: false });
      } else if (
        !this.state.showPanel &&
        !show(prevProps.screenWidth) &&
        show(this.props.screenWidth)
      ) {
        this.setState({ showPanel: true });
      }
    }

    handlePanelClick = e => {
      // This closes the panel when the user click on it
      // This is typically used so that clicking on a table of content on mobile close the panel before navigating
      // Note: Menu, expansion panels etc. are special cases as we don't want to close the panel if user click on a them (e.g clicking on a menu should just open it)
      const { screenWidth } = this.props;

      if (!show(screenWidth)) {
        const target = e && e.target;
        const targetClassName = (target && target.className) || '';

        const isMenuClick = targetClassName.includes('menu');
        const isCollapsibleClick = targetClassName.includes('expansion-panel');

        if (!isMenuClick && !isCollapsibleClick) {
          this.setState({ showPanel: false });
        }
      }
    };

    handleTogglePanel = e => {
      const nextShowPanel = !this.state.showPanel;
      this.setState({
        showPanel: nextShowPanel,
        wasIntentionallyOpened: nextShowPanel
      });
    };

    render() {
      return (
        <ComposedComponent
          {...this.props}
          {...this.state}
          onPanelClick={this.handlePanelClick}
          onTogglePanel={this.handleTogglePanel}
        />
      );
    }
  }

  return WithShowPanel;
}
