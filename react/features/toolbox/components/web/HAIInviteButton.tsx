// JHU-CDHAI L5.10b — toolbar button to summon the HAI voice assistant.
// Standalone: POSTs to /hai/invite, which nginx proxies to invite-api.
// Embedded (inside JitsiMeetExternalAPI): also fires toolbar-button-clicked
// so a host page can observe the click.
import { connect } from 'react-redux';

import { createToolbarEvent } from '../../../analytics/AnalyticsEvents';
import { sendAnalytics } from '../../../analytics/functions';
import { IReduxState } from '../../../app/types';
import { getRoomName } from '../../../base/conference/functions';
import { translate } from '../../../base/i18n/functions';
import { IconPhoneRinging } from '../../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';

interface IProps extends AbstractButtonProps {
    _roomName?: string;
}

class HAIInviteButton extends AbstractButton<IProps> {
    override accessibilityLabel = 'Invite HAI assistant';
    override icon = IconPhoneRinging;
    override label = 'Invite HAI';
    override tooltip = 'Summon HAI voice assistant';

    override _handleClick() {
        const { _roomName } = this.props;

        sendAnalytics(createToolbarEvent('hai.invite'));

        if (!_roomName) {
            return;
        }

        fetch('/hai/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room: _roomName })
        })
        .then(r => r.json())
        .then(j => {
            // eslint-disable-next-line no-console
            console.log('[HAI] invite response', j);
        })
        .catch(e => {
            // eslint-disable-next-line no-console
            console.warn('[HAI] invite failed', e);
        });
    }
}

const mapStateToProps = (state: IReduxState) => ({
    _roomName: getRoomName(state)
});

export default translate(connect(mapStateToProps)(HAIInviteButton));
