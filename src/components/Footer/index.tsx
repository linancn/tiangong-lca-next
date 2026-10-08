import styles from '@/style/custom.less';
import { GithubOutlined } from '@ant-design/icons';
import { DefaultFooter } from '@ant-design/pro-components';
import React from 'react';
import { brandProfile } from '../../../config/brandProfile';

const Footer: React.FC = () => {
  return (
    <DefaultFooter
      className={styles.app_footer}
      style={{
        background: 'none',
      }}
      links={[
        {
          key: brandProfile.id,
          title: brandProfile.displayName,
          href: brandProfile.links.homepage,
          blankTarget: true,
        },
        {
          key: 'github',
          title: <GithubOutlined />,
          href: brandProfile.links.source,
          blankTarget: true,
        },
      ]}
    />
  );
};

export default Footer;
