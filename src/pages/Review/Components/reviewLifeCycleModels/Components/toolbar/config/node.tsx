import { Node } from '@antv/x6';
import { Card } from 'antd';

export const NodeComponentCard = ({ node }: { node: Node }) => {
  const { title, content, width } = node.getData();
  return (
    <div className='react-node'>
      <Card size='small' title={title} style={{ width: width }}>
        <p>{content}</p>
      </Card>
    </div>
  );
};

// export const initNode = () => {
//   return {
//     id: '',
//     shape: 'rect',
//     x: 200,
//     y: 100,
//     width: 300,
//     height: 40,
//     attrs: {
//       body: {
//         stroke: theme.useToken().token.colorBorder,
//         strokeWidth: 1,
//         fill: theme.useToken().token.colorFill,
//         rx: 6,
//         ry: 6,
//       },
//     },
//     data: {
//       label: [],
//       generalComment: [],
//     },
//     ports: {
//       groups: {
//         group1: {
//           position: 'top',
//           attrs: {
//             circle: {
//               stroke: '#D06269',
//               strokeWidth: 1,
//               r: 4,
//               magnet: true,
//             },
//           },
//         },
//         group2: {
//           position: 'right',
//           attrs: {
//             circle: {
//               stroke: '#D06269',
//               strokeWidth: 1,
//               r: 4,
//               magnet: true,
//             },
//           },
//         },
//         group3: {
//           position: 'bottom',
//           attrs: {
//             circle: {
//               stroke: '#D06269',
//               strokeWidth: 1,
//               r: 4,
//               magnet: true,
//             },
//           },
//         },
//         group4: {
//           position: 'left',
//           attrs: {
//             circle: {
//               stroke: '#D06269',
//               strokeWidth: 1,
//               r: 4,
//               magnet: true,
//             },
//           },
//         },
//       },
//       items: [
//         { id: 'group1', group: 'group1' },
//         { id: 'group2', group: 'group2' },
//         { id: 'group3', group: 'group3' },
//         { id: 'group4', group: 'group4' },
//       ],
//     },
//   };
// };
