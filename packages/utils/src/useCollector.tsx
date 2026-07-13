import { useState, useCallback, useRef, useEffect } from 'react';
import shallowEqual from 'shallowequal';

import { SubscriberAndCallbacksFor } from './useMethods';
import { ConditionallyMergeRecordTypes } from './utilityTypes';

type CollectorMethods<S extends SubscriberAndCallbacksFor<any, any>> = {
  actions: S['actions'];
  query: S['query'];
};

export type useCollectorReturnType<
  S extends SubscriberAndCallbacksFor<any, any>,
  C = null
> = ConditionallyMergeRecordTypes<C, CollectorMethods<S>>;
export function useCollector<S extends SubscriberAndCallbacksFor<any, any>, C>(
  store: S,
  collector?: (state: ReturnType<S['getState']>, query: S['query']) => C
): useCollectorReturnType<S, C> {
  const { subscribe, getState, actions, query } = store;

  const initial = useRef(true);
  const collected = useRef<any>(null);
  const collectorRef = useRef(collector);
  collectorRef.current = collector;

  const onCollect = useCallback(
    (collected) => {
      return { ...collected, actions, query };
    },
    [actions, query]
  );

  // Collect states for initial render
  if (initial.current && collector) {
    collected.current = collector(
      getState() as ReturnType<S['getState']>,
      query
    );
    initial.current = false;
  }

  const [renderCollected, setRenderCollected] = useState(
    onCollect(collected.current)
  );

  // Collect states on state change
  useEffect(() => {
    let unsubscribe;
    if (collectorRef.current) {
      unsubscribe = subscribe(
        (current) =>
          collectorRef.current(current as ReturnType<S['getState']>, query),
        (collected) => {
          setRenderCollected(onCollect(collected));
        }
      );

      // Re-collect immediately on (re)subscribe. `renderCollected` was seeded at
      // the initial render; when this effect re-runs after the tree was hidden
      // and revealed (e.g. an <Activity> boundary), the store may have changed
      // in the meantime and nothing else would re-notify us. Guard with a
      // shallow compare so the normal mount path, where nothing changed, does
      // not incur an extra commit.
      const recollected = onCollect(
        collectorRef.current(getState() as ReturnType<S['getState']>, query)
      );
      setRenderCollected((prev) =>
        shallowEqual(prev, recollected) ? prev : recollected
      );
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [onCollect, query, subscribe, getState]);

  return renderCollected;
}
