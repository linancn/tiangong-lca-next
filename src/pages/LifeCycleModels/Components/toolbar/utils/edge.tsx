import type { LifeCycleModelThemeToken } from '@/services/lifeCycleModels/data';

export type EdgeLabelText = {
  balanced: string;
  deficit: string;
  surplus: string;
  input: string;
  output: string;
};

const DEFAULT_EDGE_LABEL_TEXT: EdgeLabelText = {
  balanced: 'Bal',
  deficit: 'Def',
  surplus: 'Sur',
  input: 'Input',
  output: 'Output',
};

export const getEdgeLabel = (
  token: LifeCycleModelThemeToken,
  unbalancedAmount: number,
  exchangeAmount: number,
  edgeLabelText: EdgeLabelText = DEFAULT_EDGE_LABEL_TEXT,
) => {
  if (unbalancedAmount === undefined || unbalancedAmount === null) {
    return {};
  }
  let text = '';
  let output = 0;
  let input = 0;
  if (unbalancedAmount > 0) {
    text = edgeLabelText.surplus;
    output = exchangeAmount + unbalancedAmount;
    input = exchangeAmount;
  } else if (unbalancedAmount < 0) {
    text = edgeLabelText.deficit;
    output = exchangeAmount;
    input = exchangeAmount - unbalancedAmount;
  } else {
    text = edgeLabelText.balanced;
    output = exchangeAmount;
    input = exchangeAmount;
  }
  return {
    markup: [
      {
        tagName: 'rect',
        selector: 'labelBody',
      },
      {
        tagName: 'text',
        selector: 'labelText',
      },
    ],
    attrs: {
      labelText: {
        text: text,
        fill: token.colorText,
        textAnchor: 'middle',
        textVerticalAnchor: 'middle',
      },
      labelBody: {
        ref: 'labelText',
        refX: -8,
        refY: -5,
        refWidth: '100%',
        refHeight: '100%',
        refWidth2: 16,
        refHeight2: 10,
        stroke: token.colorPrimary,
        fill: token.colorBgBase,
        strokeWidth: 1,
        rx: 5,
        ry: 5,
        title: `(${edgeLabelText.output}: ${output}) - (${edgeLabelText.input}: ${input}) = ${unbalancedAmount}`,
      },
    },
    position: {
      distance: 0.5,
      args: {
        keepGradient: true,
        ensureLegibility: true,
      },
    },
  };
};
