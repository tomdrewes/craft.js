import { act, render } from '@testing-library/react';
import React from 'react';

import { useEditor } from '../../hooks/useEditor';
import { Element } from '../../nodes/Element';
import { Frame } from '../../render/Frame';
import { Editor } from '../Editor';

describe('Editor onNodesChange', () => {
  let actions;

  const Capture = () => {
    actions = useEditor().actions;
    return null;
  };

  const tree = (
    <>
      <Capture />
      <Frame>
        <Element canvas is="div" id="root-div" />
      </Frame>
    </>
  );

  it('calls onNodesChange when the nodes change', () => {
    const onNodesChange = jest.fn();
    render(<Editor onNodesChange={onNodesChange}>{tree}</Editor>);
    onNodesChange.mockClear();

    act(() => {
      actions.setProp('ROOT', (props) => (props.className = 'changed'));
    });

    expect(onNodesChange).toHaveBeenCalledTimes(1);
  });

  it('calls an onNodesChange set later through setOptions', () => {
    const onNodesChange = jest.fn();
    render(<Editor>{tree}</Editor>);

    act(() => {
      actions.setOptions((options) => (options.onNodesChange = onNodesChange));
    });
    onNodesChange.mockClear();

    act(() => {
      actions.setProp('ROOT', (props) => (props.className = 'changed'));
    });

    expect(onNodesChange).toHaveBeenCalledTimes(1);
  });

  it('does not serialize the page when onNodesChange is not given', () => {
    let query;
    const CaptureQuery = () => {
      query = useEditor().query;
      return null;
    };
    render(
      <Editor>
        <CaptureQuery />
        {tree}
      </Editor>
    );
    const serialize = jest.spyOn(query, 'serialize');

    act(() => {
      actions.setProp('ROOT', (props) => (props.className = 'changed'));
    });

    expect(serialize).not.toHaveBeenCalled();
  });
});
