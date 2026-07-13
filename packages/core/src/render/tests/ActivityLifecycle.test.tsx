import { render } from '@testing-library/react';
import React, { Activity } from 'react';

import { Editor } from '../../editor/Editor';
import { Element } from '../../nodes/Element';
import { Frame } from '../Frame';

// The `drag` connector sets draggable="true" on attach and draggable="false" on
// cleanup. Hiding an <Activity> subtree destroys its effects (tearing the
// connector down); revealing it re-runs them. This asserts the connector
// lifecycle survives that round-trip — the toolbox-drag regression the Activity
// plan targets. Requires React >= 19.2 for <Activity>.
const Tree = ({ mode }: { mode: 'visible' | 'hidden' }) => (
  <Editor>
    <Activity mode={mode}>
      <Frame>
        <Element canvas is="div">
          <Element is="div">child</Element>
        </Element>
      </Frame>
    </Activity>
  </Editor>
);

describe('CraftJS connector lifecycle under <Activity>', () => {
  it('restores draggable after a hidden subtree is revealed', () => {
    const { getByText, rerender } = render(<Tree mode="visible" />);
    const child = () => getByText('child');

    expect(child().getAttribute('draggable')).toBe('true');

    rerender(<Tree mode="hidden" />);
    // Same DOM node is preserved while hidden, but its connectors are torn down.
    expect(child().getAttribute('draggable')).toBe('false');

    rerender(<Tree mode="visible" />);
    expect(child().getAttribute('draggable')).toBe('true');
  });
});
