import { useEditor, ROOT_NODE } from '@craftjs/core';
import React, { useRef, useEffect, useLayoutEffect } from 'react';

import { LayerContextProvider } from './LayerContextProvider';
import { useLayer } from './useLayer';

import { useLayerManager } from '../manager/useLayerManager';

export const LayerNode = () => {
  const { id, depth, children, expanded } = useLayer((layer) => ({
    expanded: layer.expanded,
  }));

  const { data, shouldBeExpanded } = useEditor((state, query) => {
    // TODO: handle multiple selected elements
    const selected = query.getEvent('selected').first();

    return {
      data: state.nodes[id] && state.nodes[id].data,
      shouldBeExpanded:
        selected && query.node(selected).ancestors(true).includes(id),
    };
  });

  const {
    actions: { registerLayer, setExpandedState },
    renderLayer,
    expandRootOnLoad,
    defaultExpanded,
  } = useLayerManager((state) => ({
    renderLayer: state.options.renderLayer,
    expandRootOnLoad: state.options.expandRootOnLoad,
    defaultExpanded: state.options.defaultExpanded,
  }));

  // Rendering doesn't wait for registration: a layer not yet registered takes the expanded state it
  // will register with, so under defaultExpanded a whole tree mounts in one commit and registers in
  // one batch of layout effects, however deep it is.
  const isExpanded = expanded ?? !!defaultExpanded;

  useLayoutEffect(() => {
    registerLayer(id);
  }, [registerLayer, id]);

  const expandedRef = useRef<boolean>(expanded);
  expandedRef.current = expanded;

  const shouldBeExpandedOnLoad = useRef<boolean>(
    expandRootOnLoad && id === ROOT_NODE
  );

  useEffect(() => {
    if (!expandedRef.current && shouldBeExpanded) {
      setExpandedState(id, true);
    }
  }, [setExpandedState, id, shouldBeExpanded]);

  useEffect(() => {
    if (shouldBeExpandedOnLoad.current) {
      setExpandedState(id, true);
    }
  }, [setExpandedState, id]);

  return data ? (
    <div className={`craft-layer-node ${id}`}>
      {React.createElement(
        renderLayer,
        {},
        children && isExpanded
          ? children.map((id) => (
              <LayerContextProvider key={id} id={id} depth={depth + 1} />
            ))
          : null
      )}
    </div>
  ) : null;
};
