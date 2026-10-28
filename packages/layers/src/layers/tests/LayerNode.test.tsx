import { Editor, Element, Frame } from '@craftjs/core';
import { render } from '@testing-library/react';
import React, { ReactNode } from 'react';

import { Layers } from '../..';
import { useLayer } from '../useLayer';

// The default layer imports SVGs, which jest has no transform for; the test renders its own layer.
jest.mock('../DefaultLayer', () => ({}));

// Well past React's limit of 50 nested updates, which a tree that mounted a level per commit
// exceeded.
const depth = 60;

const TestLayer = ({ children }: { children?: ReactNode }) => {
  const { id } = useLayer();
  return <div data-layer={id}>{children}</div>;
};

const chain = (level: number): ReactNode =>
  level === 0 ? null : (
    <Element canvas is="div">
      {chain(level - 1)}
    </Element>
  );

describe('LayerNode', () => {
  it('mounts a deep tree under defaultExpanded without exceeding the nested update limit', () => {
    // React reports the error through console.error or, uncaught under jsdom, console.warn
    const errors: Array<string> = [];
    const collect = (...args: Array<unknown>) => {
      errors.push(args.map(String).join(' '));
    };
    // eslint-disable-next-line no-console
    (console.error as jest.Mock).mockImplementation(collect);
    const warn = jest.spyOn(console, 'warn').mockImplementation(collect);

    const { container } = render(
      <Editor>
        <Frame>{chain(depth)}</Frame>
        <Layers defaultExpanded renderLayer={TestLayer} />
      </Editor>
    );
    warn.mockRestore();

    expect(
      errors.filter((error) => error.includes('Maximum update depth'))
    ).toEqual([]);
    expect(container.querySelectorAll('[data-layer]').length).toBe(depth);
  });
});
