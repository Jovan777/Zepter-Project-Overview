import React, {forwardRef, useCallback, useSyncExternalStore} from 'react';
import {Link as RouterLink, useNavigate as useRouterNavigate} from 'react-router-dom';
import {nativeMotionAvailable, watchMotionPreference} from './pageMotion.js';

const subscribe = notify => typeof window === 'undefined' ? () => {} : watchMotionPreference(window.matchMedia?.('(prefers-reduced-motion: reduce)'), notify);
const prefersReduced = () => typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches !== false;
export const Link = forwardRef(function MotionLink({viewTransition, ...props}, ref) {
  const reduced = useSyncExternalStore(subscribe, prefersReduced, () => true);
  return <RouterLink {...props} ref={ref} viewTransition={viewTransition ?? (!reduced && nativeMotionAvailable())}/>;
});
export function useNavigate() {
  const navigate = useRouterNavigate();
  return useCallback((to, options) => typeof to === 'number' ? navigate(to) : navigate(to, {viewTransition: nativeMotionAvailable(), ...options}), [navigate]);
}
