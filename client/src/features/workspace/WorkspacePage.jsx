import React, {useLayoutEffect, useRef} from 'react';
import {useLocation, useNavigationType, useViewTransitionState} from 'react-router-dom';
import {observeWorkspaceMotion} from './pageMotion.js';
import './motion.css';

export default function WorkspacePage({className = '', children, ...props}) {
  const main = useRef(null), controller = useRef(null), native = useRef(false);
  const {pathname, search} = useLocation(), action = useNavigationType();
  native.current = useViewTransitionState(pathname);
  useLayoutEffect(() => {
    controller.current = observeWorkspaceMotion(main.current, window.matchMedia?.('(prefers-reduced-motion: reduce)'), {nativeActive: () => native.current});
    return () => {controller.current?.destroy(); controller.current = null;};
  }, []);
  useLayoutEffect(() => {
    document.documentElement.dataset.workspaceDirection = action === 'POP' ? 'back' : 'forward';
    controller.current?.refresh();
  }, [pathname, search, action, native.current]);
  return <main {...props} ref={main} className={`workspace-page ${className}`}>{children}</main>;
}
