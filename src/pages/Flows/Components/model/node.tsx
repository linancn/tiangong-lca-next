// import { Handle, Position } from '@ant-design/pro-flow';
// import { FC } from 'react';
// import { nodeStyles } from './css';

// export const StringRender: FC = (node: any) => {
//   const { handles, id, selected } = node;
//   const { styles, cx } = nodeStyles();

//   return (
//     <div className={cx(styles.stringNode, selected && styles.selected)}>
//       <Handle
//         id={typeof handles?.target === 'string' ? handles?.target : id}
//         type={'target'}
//         position={Position.Left}
//       />
//       {node.data.title}
//       <Handle
//         id={typeof handles?.source === 'string' ? handles?.source : id}
//         type={'source'}
//         position={Position.Right}
//       />
//     </div>
//   );
// };
