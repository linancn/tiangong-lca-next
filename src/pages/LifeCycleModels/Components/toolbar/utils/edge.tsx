export const getEdgeLabel = (token: any, unbalancedAmount: number, exchangeAmount: number) => {
  if (unbalancedAmount === undefined || unbalancedAmount === null) {
    return {};
  }
  let text = '';
  let output = 0;
  let input = 0;
  if (unbalancedAmount > 0) {
    text = 'O';
    output = exchangeAmount + unbalancedAmount;
    input = exchangeAmount;
  } else if (unbalancedAmount < 0) {
    text = 'I';
    output = exchangeAmount;
    input = exchangeAmount - unbalancedAmount;
  } else {
    text = 'B';
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
        strokeWidth: 2,
        rx: 5,
        ry: 5,
        title: `(OUTPUT: ${output}) - (INPUT: ${input}) = ${unbalancedAmount}`,
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
