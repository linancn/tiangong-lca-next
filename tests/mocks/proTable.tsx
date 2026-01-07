import React from 'react';
import { toText } from '../helpers/nodeToText';

export const createProTableMock = () => ({
  __esModule: true,
  TableDropdown: ({ menus = [] }: any) => (
    <div data-testid='table-dropdown'>
      {menus.map((menu: any) => (
        <div key={menu.key}>
          {React.isValidElement(menu.name) || Array.isArray(menu.name)
            ? menu.name
            : toText(menu.name)}
        </div>
      ))}
    </div>
  ),
});
