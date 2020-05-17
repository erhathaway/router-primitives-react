/* eslint-disable react/prop-types */
/* eslint-disable  @typescript-eslint/no-explicit-any */

import React, {useState, useEffect} from 'react';
import {IOutputLocation, RouterInstance, IRouterTemplates} from 'router-primitives';

import {Animate as BaseAnimate, AnimationBinding, When} from '../src_animated_components';

interface DefaultProps<R> {
    children?: <P, T extends string>(router: R) => React.ReactElement<P, T> | null;
    uncontrolled?: boolean;
}

interface LinkProps {
    action: 'show' | 'hide';
    data?: any;
    pathData?: Record<string, any>;
    replaceLocation?: boolean;
    disableCaching?: boolean;
    addCacheToLocation?: boolean;
    children?: React.ReactNode;
    includeTitle?: boolean;
    includeCacheInTitle?: boolean;
}

interface RouterAnimateProps {
    when?: When;
    children?: React.ReactElement;
    unMountOnHide?: boolean;
    unMountOnShow?: boolean;
    id?: string;
    animationBinding?: AnimationBinding;
    enterAfterParentStart?: boolean;
    enterAfterParentFinish?: boolean;
    exitAfterChildStart?: string[];
    exitAfterChildFinish?: string[];
}

type RouterT<R> = React.FC<DefaultProps<R>> & {
    Link: React.FC<LinkProps>;
    ToggleLink: React.FC<LinkProps>;

    Animate: React.FC<RouterAnimateProps>;
};

const removeCacheFromTitle = (link: string, cacheKey: string): string => {
    const regex = new RegExp(`${cacheKey}=([^&]*)&|${cacheKey}=([^&]*)`);
    return link.replace(regex, '');
};

export const createRouterComponents = <CustomTemplates extends IRouterTemplates>(
    routers: Record<string, RouterInstance<CustomTemplates>> // eslint-disable-line
): Record<string, RouterT<RouterInstance<CustomTemplates>>> => {
    return Object.keys(routers).reduce((acc, routerName) => {
        const r = routers[routerName];

        // eslint-disable-next-line
        const component: React.FC<DefaultProps<typeof r>> = ({children, uncontrolled}) => {
            const [state, setState] = useState(r.state);
            useEffect(() => {
                if (r && r.subscribe) {
                    // return disposer
                    return r.subscribe(all => setState(all.current));
                }
                return;
            }, ['startup']);
            if (uncontrolled) {
                return children ? children(r) : null;
            }
            return state.visible ? <>{children}</> : null;
        };
        // eslint-disable-next-line
        const Link: React.FC<LinkProps> = ({
            children,
            action,
            includeCacheInTitle,
            includeTitle,
            ...actionOptions
        }) => {
            if (includeCacheInTitle && !includeTitle) {
                throw new Error(
                    `The 'includeTitle' prop must be used when using the 'includeCacheInTitle' prop`
                );
            }
            if (includeCacheInTitle && !actionOptions.addCacheToLocation) {
                throw new Error(
                    `The 'addCacheToLocation' prop must be used when using the 'includeCacheInTitle' prop`
                );
            }
            /**
             * Subscribe to all state changes
             */
            // eslint-disable-next-line
            const [_, setRouterState] = useState<IOutputLocation>();
            useEffect(() => {
                if (r.manager.serializedStateStore) {
                    // return disposer
                    return r.manager.serializedStateStore.subscribeToStateChanges(all =>
                        setRouterState(all)
                    );
                }
                return;
            }, ['startup']);

            const link = r.link(action, actionOptions);
            const title = includeTitle
                ? includeCacheInTitle
                    ? link
                    : removeCacheFromTitle(link, r.manager.cacheKey)
                : undefined;
            return (
                <a
                    href={link}
                    title={title}
                    onClick={e => {
                        // prevent the link event from working b/c it does an app reload
                        e.preventDefault();
                        r[action](actionOptions);
                    }}
                >
                    {children}
                </a>
            );
        };

        // eslint-disable-next-line
        const ToggleLink: React.FC<LinkProps> = ({children, ...actionOptions}) => {
            /**
             * Subscribe to all state changes
             */
            // eslint-disable-next-line
            const [_, setRouterState] = useState<IOutputLocation>();
            useEffect(() => {
                if (r.manager.serializedStateStore) {
                    // return disposer
                    return r.manager.serializedStateStore.subscribeToStateChanges(all =>
                        setRouterState(all)
                    );
                }
                return;
            }, ['startup']);

            const action = r.state.visible ? 'hide' : 'show';
            const link = r.link(action, actionOptions);
            return (
                <a
                    href={link}
                    title={link}
                    onClick={e => {
                        // prevent link event from working b/c it does an app reload
                        e.preventDefault();
                        r[action](actionOptions);
                    }}
                >
                    {children}
                </a>
            );
        };

        // eslint-disable-next-line
        const Animate: React.FC<RouterAnimateProps> = ({
            when,
            children,
            unMountOnHide,
            id,

            enterAfterParentStart,
            enterAfterParentFinish,
            exitAfterChildStart,
            exitAfterChildFinish,

            animationBinding
        }) => {
            const [_triggerState, setTriggerState] = useState<typeof r.state>({
                visible: r.state.visible,
                data: r.state.data,
                actionCount: r.state.actionCount
            });

            useEffect(() => {
                if (r && r.subscribe) {
                    // return disposer
                    return r.subscribe(all => {
                        const state = all.current;
                        setTriggerState({
                            visible: state.visible,
                            data: state.data,
                            actionCount: state.actionCount
                        });
                    });
                }
                return;
            }, ['startup']);

            return (
                <BaseAnimate
                    name={r.name}
                    visible={_triggerState.visible}
                    triggerState={_triggerState}
                    predicateState={r}
                    when={when}
                    unMountOnHide={unMountOnHide}
                    id={id}
                    enterAfterParentStart={enterAfterParentStart}
                    enterAfterParentFinish={enterAfterParentFinish}
                    exitAfterChildStart={exitAfterChildStart}
                    exitAfterChildFinish={exitAfterChildFinish}
                    animationBinding={animationBinding}
                >
                    {children}
                </BaseAnimate>
            );
        };
        const updated = Object.assign(component, {Link, ToggleLink, Animate});
        return {...acc, [routerName]: updated};
    }, {} as Record<string, RouterT<RouterInstance<CustomTemplates>>>);
};
