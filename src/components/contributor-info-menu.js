import React from 'react';
import PropTypes from 'prop-types';
import { getAgent } from '@scipe/librarian';
import { Menu, MenuCardItem, UserContactSheet } from '@scipe/ui';

// TODO add author notes (what the author did)...

export default class ContributorInfoMenu extends React.Component {
  static propTypes = {
    role: PropTypes.object,
    align: PropTypes.oneOf(['left', 'right']),
    isPrinting: PropTypes.bool
  };

  static defaultProps = {
    align: 'right',
    role: {}
  };

  render() {
    const { role, align, isPrinting } = this.props;

    const unroled = getAgent(role);

    if (
      isPrinting ||
      !(
        role.roleContactPoint ||
        role.roleAffiliation ||
        unroled.url ||
        unroled.sameAs
      )
    ) {
      return null;
    }

    return (
      <Menu
        className="contributor-info-menu"
        align={align}
        icon={unroled['@type'] !== 'Person' ? 'locationCity' : 'personRound'}
        iconSize={12}
        portal={true}
      >
        <MenuCardItem>
          <UserContactSheet role={role} />
        </MenuCardItem>
      </Menu>
    );
  }
}
