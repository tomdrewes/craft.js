import { NodeId } from '@craftjs/core';
import { EventHandlerConnectors, EventHandlers } from '@craftjs/utils';
import React from 'react';

export type LayerContextType = {
  id: NodeId;
  depth: number;
  // TODO: Use LayerHandlers from ../events/LayerHandlers instead of EventHandlers
  // in the EventHandlerConnectors type.
  // This is a temporary solution to avoid TypeScript errors
  connectors: EventHandlerConnectors<EventHandlers, React.ReactElement>;
};

export const LayerContext = React.createContext<LayerContextType>(
  {} as LayerContextType
);
