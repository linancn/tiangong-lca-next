import { genNodeLabel } from '@/services/lifeCycleModels/util';

export const getPortLabelWithAllocation = (label: string, allocations: any, direction: string) => {
  const num = allocations?.allocation?.['@allocatedFraction']?.replace('%', '');
  const allocatedFractionNum = Number(num);

  if (allocatedFractionNum > 0 && direction.toUpperCase() === 'OUTPUT') {
    return `[${allocatedFractionNum}%]${label}`;
  }
  return label;
};

export const getPortTextColor = (quantitativeReference: boolean, allocations: any, token: any) => {
  const num = allocations?.allocation?.['@allocatedFraction']?.replace('%', '');
  const allocatedFractionNum = Number(num);
  if (allocatedFractionNum > 0 || quantitativeReference) {
    return token.colorPrimary;
  }
  return token.colorTextDescription;
};

export const getPortTextStyle = (quantitativeReference: boolean) => {
  if (quantitativeReference) {
    return 'bold';
  }
  return 'normal';
};

export const nodeTitleTool = (width: number, title: string, token: any, lang: string) => {
  return {
    id: 'nodeTitle',
    name: 'button',
    args: {
      markup: [
        {
          tagName: 'rect',
          selector: 'button',
          attrs: {
            width: width,
            height: 26,
            rx: 4,
            ry: 4,
            fill: token.colorPrimary,
            stroke: token.colorPrimary,
            'stroke-width': 1,
            cursor: 'pointer',
          },
        },
        {
          tagName: 'text',
          textContent: genNodeLabel(title ?? '', lang, width),
          selector: 'text',
          attrs: {
            fill: 'white',
            'font-size': 14,
            'text-anchor': 'middle',
            'dominant-baseline': 'middle',
            'pointer-events': 'none',
            x: width / 2,
            y: 13,
          },
        },
        {
          tagName: 'title',
          textContent: title,
        },
      ],
      x: 0,
      y: 0,
      offset: { x: 0, y: 0 },
    },
  };
};
