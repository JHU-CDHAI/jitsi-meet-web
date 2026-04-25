// JHU-CDHAI B3 — agent picker inside the "Invite more people" dialog.
// Combobox-style: a styled <Input> + a custom-rendered dropdown that
// matches Jitsi's dark theme (avoids the OS-native <select> popup).
// Lists agents from /hai/agents, filters as the user types, invites the
// chosen one via /hai/invite (which proxies to invite-api).
import React, {
    KeyboardEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../../app/types';
import { getRoomName } from '../../../../base/conference/functions';
import Button from '../../../../base/ui/components/web/Button';
import Input from '../../../../base/ui/components/web/Input';
import { BUTTON_TYPES } from '../../../../base/ui/constants.any';

interface IAgent {
    display_name: string;
    id: string;
}

const useStyles = makeStyles()(theme => {
    return {
        container: {
            marginBottom: theme.spacing(4)
        },
        label: {
            display: 'block',
            marginBottom: theme.spacing(2)
        },
        row: {
            alignItems: 'flex-start',
            display: 'flex',
            gap: theme.spacing(2),
            position: 'relative'
        },
        comboWrap: {
            flex: 1,
            position: 'relative'
        },
        menu: {
            backgroundColor: theme.palette.ui02,
            borderRadius: theme.shape.borderRadius,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            left: 0,
            listStyle: 'none',
            margin: `${theme.spacing(1)}px 0 0 0`,
            maxHeight: '220px',
            overflowY: 'auto',
            padding: theme.spacing(1),
            position: 'absolute',
            right: 0,
            top: '100%',
            zIndex: 5
        },
        menuItem: {
            borderRadius: theme.shape.borderRadius,
            color: theme.palette.text01,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 12px',
            ...theme.typography.bodyShortRegular,

            '&:hover': {
                backgroundColor: theme.palette.ui03
            }
        },
        menuItemActive: {
            backgroundColor: theme.palette.ui03
        },
        menuItemEmpty: {
            color: theme.palette.text02,
            padding: '8px 12px',
            ...theme.typography.bodyShortRegular
        },
        menuItemId: {
            color: theme.palette.text02,
            ...theme.typography.labelRegular
        },
        status: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.text02,
            marginTop: theme.spacing(2),
            minHeight: '1em'
        },
        statusError: {
            color: theme.palette.textError
        }
    };
});

/**
 * Section in the AddPeopleDialog that lets the user pick an AI agent from
 * the registry and invite it into the current conference.
 */
function InviteAgentSection() {
    const { classes, cx } = useStyles();
    const { t } = useTranslation();
    const roomName = useSelector((state: IReduxState) => getRoomName(state));

    const [ agents, setAgents ] = useState<IAgent[]>([]);
    const [ loading, setLoading ] = useState(true);
    const [ query, setQuery ] = useState('');
    const [ selectedId, setSelectedId ] = useState('');
    const [ menuOpen, setMenuOpen ] = useState(false);
    const [ activeIndex, setActiveIndex ] = useState(0);
    const [ inviting, setInviting ] = useState(false);
    const [ status, setStatus ] = useState('');
    const [ isError, setIsError ] = useState(false);

    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        fetch('/hai/agents')
            .then(r => r.json())
            .then((j: { agents?: IAgent[]; }) => {
                if (cancelled) {
                    return;
                }
                setAgents(j?.agents ?? []);
            })
            .catch(() => {
                if (cancelled) {
                    return;
                }
                setIsError(true);
                setStatus(t('addPeople.haiAgent.loadFailed'));
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [ t ]);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', onDocClick);

        return () => {
            document.removeEventListener('mousedown', onDocClick);
        };
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        if (!q) {
            return agents;
        }

        return agents.filter(a =>
            a.id.toLowerCase().includes(q)
            || (a.display_name ?? '').toLowerCase().includes(q));
    }, [ agents, query ]);

    useEffect(() => {
        if (activeIndex >= filtered.length) {
            setActiveIndex(0);
        }
    }, [ filtered, activeIndex ]);

    const onChange = useCallback((value: string) => {
        setQuery(value);
        setSelectedId('');
        setMenuOpen(true);
        setActiveIndex(0);
        setStatus('');
        setIsError(false);
    }, []);

    const pick = useCallback((agent: IAgent) => {
        setSelectedId(agent.id);
        setQuery(agent.display_name || agent.id);
        setMenuOpen(false);
        setStatus('');
        setIsError(false);
    }, []);

    const doInvite = useCallback((agentId: string) => {
        if (!roomName || !agentId || inviting) {
            return;
        }
        setInviting(true);
        setIsError(false);
        setStatus(t('addPeople.haiAgent.inviting', { name: agentId }));

        fetch('/hai/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent_id: agentId,
                room: roomName })
        })
            .then(r => r.json())
            .then((j: { agent_id?: string | null; error?: string; ok?: boolean; }) => {
                if (j?.ok) {
                    setStatus(t('addPeople.haiAgent.invited',
                        { name: j.agent_id ?? agentId }));
                    setIsError(false);
                } else {
                    setIsError(true);
                    setStatus(t('addPeople.haiAgent.failed',
                        { error: j?.error ?? 'unknown error' }));
                }
            })
            .catch(() => {
                setIsError(true);
                setStatus(t('addPeople.haiAgent.failed',
                    { error: 'network error' }));
            })
            .finally(() => {
                setInviting(false);
            });
    }, [ roomName, inviting, t ]);

    const onKeyPress = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setMenuOpen(true);
            setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (menuOpen && filtered[activeIndex]) {
                pick(filtered[activeIndex]);
            } else if (selectedId) {
                doInvite(selectedId);
            }
        } else if (e.key === 'Escape') {
            setMenuOpen(false);
        }
    }, [ filtered, menuOpen, activeIndex, selectedId, pick, doInvite ]);

    const onFocus = useCallback(() => {
        setMenuOpen(true);
    }, []);

    const inviteDisabled = loading || inviting || !selectedId || !roomName;

    return (
        <div className = { classes.container }>
            <p className = { classes.label }>{t('addPeople.haiAgent.title')}</p>
            <div className = { classes.row }>
                <div
                    className = { classes.comboWrap }
                    ref = { wrapRef }>
                    <Input
                        autoComplete = 'off'
                        disabled = { loading }
                        id = 'invite-hai-agent-input'
                        onChange = { onChange }
                        onFocus = { onFocus }
                        onKeyPress = { onKeyPress }
                        placeholder = { t('addPeople.haiAgent.placeholder') }
                        value = { query } />
                    {menuOpen && (
                        <ul className = { classes.menu }>
                            {filtered.length === 0 ? (
                                <li className = { classes.menuItemEmpty }>
                                    {t('addPeople.haiAgent.noMatch')}
                                </li>
                            ) : filtered.map((a, idx) => (
                                <li
                                    className = { cx(
                                        classes.menuItem,
                                        idx === activeIndex && classes.menuItemActive
                                    ) }
                                    key = { a.id }
                                    onClick = { () => pick(a) }
                                    onMouseEnter = { () => setActiveIndex(idx) }>
                                    <span>{a.display_name || a.id}</span>
                                    <span className = { classes.menuItemId }>{a.id}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <Button
                    accessibilityLabel = { t('addPeople.haiAgent.invite') }
                    disabled = { inviteDisabled }
                    label = { t('addPeople.haiAgent.invite') }
                    onClick = { () => doInvite(selectedId) }
                    type = { BUTTON_TYPES.PRIMARY } />
            </div>
            {status && (
                <div className = { cx(classes.status, isError && classes.statusError) }>
                    {status}
                </div>
            )}
        </div>
    );
}

export default InviteAgentSection;
