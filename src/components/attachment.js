import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { getAgentId } from '@scipe/librarian';
import Iconoclass from '@scipe/iconoclass';
import {
  ActionAudience,
  UserBadgeMenu,
  getDisplayName,
  getUserBadgeLabel
} from '@scipe/ui';
import Counter from '../utils/counter';
import Permalink from './permalink';
import { StyleCardBody } from './annotable-action';
import { NoAccessNotice } from './notice';

export default class Attachment extends React.Component {
  static propTypes = {
    id: PropTypes.string.isRequired,
    className: PropTypes.string,
    user: PropTypes.object.isRequired,
    acl: PropTypes.object.isRequired,
    title: PropTypes.string.isRequired,
    action: PropTypes.object.isRequired,
    authorizeActions: PropTypes.arrayOf(PropTypes.object),
    counter: PropTypes.instanceOf(Counter).isRequired,
    graph: PropTypes.object.isRequired,
    blindingData: PropTypes.object.isRequired,
    children: PropTypes.any.isRequired,
    displayPermalink: PropTypes.bool
  };

  static defaultProps = {
    action: {},
    displayPermalink: true
  };

  render() {
    const {
      id,
      className,
      user,
      graph,
      blindingData,
      action,
      authorizeActions,
      counter,
      acl,
      children,
      title,
      displayPermalink
    } = this.props;

    const canView = !!(
      action &&
      acl.checkPermission(user, 'ViewActionPermission', {
        action
      })
    );

    return (
      <StyleCardBody
        id={id}
        tagName="section"
        className={classNames(className, 'attachment')}
      >
        {!!displayPermalink && <Permalink first={true} counter={counter} />}

        <header className="selectable-indent">
          <h3 className="attachment__title">
            <Iconoclass
              iconName="email"
              className="attachment__title-icon"
              size="20px"
            />
            {title}
          </h3>

          <div className="attachment__agent">
            <UserBadgeMenu
              className="attachment__agent__user-badge"
              anonymous={blindingData.isBlinded(action.agent)}
              userBadgeLabel={getUserBadgeLabel(blindingData, action.agent)}
              userId={getAgentId(blindingData.resolve(action.agent))}
              name={getDisplayName(blindingData, action.agent, {
                addRoleNameSuffix: true
              })}
              roleName={(action.agent && action.agent.roleName) || 'user'}
              size={24}
              align="left"
              displayName={true}
              displayRoleName={true}
              portal={true}
            />
            <Iconoclass iconName="arrowOpenRight" />
            <ActionAudience
              user={user}
              graph={graph}
              audienceProp="participant"
              action={action}
              readOnly={true}
              disabled={true}
              blindingData={blindingData}
              authorizeActions={authorizeActions}
            />
          </div>
        </header>

        <section>
          {canView ? (
            children
          ) : (
            <div className="selectable-indent">
              <NoAccessNotice />
            </div>
          )}
        </section>
      </StyleCardBody>
    );
  }
}
