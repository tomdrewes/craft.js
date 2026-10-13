import { NodeId, Indicator } from '@craftjs/core';

export type Layer = {
  id: NodeId;
  dom: HTMLElement;
  headingDom: HTMLElement;
  expanded: boolean;
  event: LayerRefEvents;
};

export type LayerRefEvents = Record<LayerEvents, boolean>;

export type LayerEvents = 'selected' | 'hovered';

export type LayerOptions = {
  expandRootOnLoad: boolean;
  renderLayer: React.ElementType;
  // Drops only onto layers: leaving the Layers panel during a drag clears the indicator, so a
  // release outside it commits nothing
  dropOnLayersOnly?: boolean;
};

export type LayerIndicator = Indicator & {
  onCanvas: boolean;
};

export type LayerState = {
  layers: Record<NodeId, Layer>;
  events: Record<LayerEvents, NodeId | null> & {
    indicator: LayerIndicator;
  };

  options: LayerOptions;
};
