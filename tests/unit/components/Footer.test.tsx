/**
 * Tests for Footer component
 * Path: src/components/Footer/index.tsx
 */

import Footer from '@/components/Footer';
import { render, screen } from '@testing-library/react';

type FooterLink = {
  key: string;
  title: React.ReactNode;
  href: string;
  blankTarget?: boolean;
};

type DefaultFooterProps = {
  className?: string;
  links?: FooterLink[];
  style?: React.CSSProperties;
};

const mockFooterProps: DefaultFooterProps[] = [];

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: {
    app_footer: 'app-footer',
  },
}));

jest.mock('@ant-design/pro-components', () => ({
  DefaultFooter: ({ className, links, style }: DefaultFooterProps) => {
    mockFooterProps.push({ className, links, style });
    return (
      <footer data-testid='default-footer' className={className}>
        {(links ?? []).map((link) => (
          <a
            key={link.key}
            href={link.href}
            target={link.blankTarget ? '_blank' : undefined}
            rel={link.blankTarget ? 'noreferrer' : undefined}
          >
            {link.title}
          </a>
        ))}
      </footer>
    );
  },
}));

describe('Footer Component', () => {
  it('renders footer links with external targets', () => {
    render(<Footer />);

    const props = mockFooterProps.pop();
    expect(props).toBeDefined();
    expect(props?.className).toBe('app-footer');
    expect(props?.style).toMatchObject({ background: 'none' });
    expect(props?.links).toHaveLength(2);

    expect(screen.getByRole('link', { name: 'TianGong LCA' })).toHaveAttribute(
      'href',
      'https://www.tiangong.earth',
    );
    expect(screen.getByRole('link', { name: 'github' })).toHaveAttribute(
      'href',
      'https://github.com/linancn/tiangong-lca-next',
    );
    screen.getAllByRole('link').forEach((anchor) => {
      expect(anchor).toHaveAttribute('target', '_blank');
      expect(anchor).toHaveAttribute('rel', 'noreferrer');
    });
  });
});
