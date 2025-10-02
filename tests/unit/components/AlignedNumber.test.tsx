/**
 * Tests for AlignedNumber component
 * Path: src/components/AlignedNumber/index.tsx
 */

import AlignedNumber, { toSuperscript } from '@/components/AlignedNumber/index';
import { render, screen } from '@testing-library/react';

describe('AlignedNumber Component', () => {
  describe('toSuperscript function', () => {
    it('should convert numbers to superscript', () => {
      expect(toSuperscript('123')).toBe('¹²³');
      expect(toSuperscript('0')).toBe('⁰');
      expect(toSuperscript('9876543210')).toBe('⁹⁸⁷⁶⁵⁴³²¹⁰');
    });

    it('should handle positive and negative signs', () => {
      expect(toSuperscript('+5')).toBe('⁵');
      expect(toSuperscript('-5')).toBe('⁻⁵');
    });

    it('should return empty string for invalid inputs', () => {
      expect(toSuperscript('')).toBe('');
      expect(toSuperscript(null as any)).toBe('');
      expect(toSuperscript(undefined as any)).toBe('');
    });

    it('should handle mixed characters', () => {
      expect(toSuperscript('1+2-3')).toBe('¹²⁻³');
    });
  });

  describe('AlignedNumber component rendering', () => {
    it('should render normal numbers with precision', () => {
      render(<AlignedNumber value={123.456789} precision={4} />);
      const element = screen.getByText(/123\.456/);
      expect(element).toBeInTheDocument();
      expect(element).toHaveClass('decimal-align');
    });

    it('should handle integer values without decimal point', () => {
      render(<AlignedNumber value={100} />);
      const element = screen.getByText('100');
      expect(element).toBeInTheDocument();
    });

    it('should use scientific notation for very large numbers', () => {
      render(<AlignedNumber value={1234567890} precision={2} />);
      const text = screen.getByText(/×10/);
      expect(text).toHaveTextContent('×10');
      expect(text).toHaveTextContent(/⁹/); // Contains superscript
    });

    it('should use scientific notation for very small numbers', () => {
      render(<AlignedNumber value={0.000001} precision={2} />);
      const text = screen.getByText(/×10/);
      expect(text).toHaveTextContent('×10');
      expect(text).toHaveTextContent(/⁻/); // Contains superscript minus
    });

    it('should handle zero', () => {
      render(<AlignedNumber value={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should display "-" for invalid inputs', () => {
      const { rerender } = render(<AlignedNumber value={NaN} />);
      expect(screen.getByText('-')).toBeInTheDocument();

      rerender(<AlignedNumber value='' />);
      expect(screen.getByText('-')).toBeInTheDocument();

      rerender(<AlignedNumber value={null as any} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should handle string number inputs', () => {
      render(<AlignedNumber value='456.789' precision={2} />);
      const element = screen.getByText(/456\.78/);
      expect(element).toBeInTheDocument();
    });

    it('should trim trailing zeros', () => {
      render(<AlignedNumber value={1.5} precision={4} />);
      expect(screen.getByText('1.5')).toBeInTheDocument();
    });

    it('should handle negative numbers', () => {
      render(<AlignedNumber value={-123.456} precision={2} />);
      const element = screen.getByText(/-123\.45/);
      expect(element).toBeInTheDocument();
    });

    it('should handle very small decimals between threshold and 1', () => {
      render(<AlignedNumber value={0.0001} precision={4} />);
      const element = screen.getByText(/0\.0001/);
      expect(element).toBeInTheDocument();
    });

    it('should use default precision of 4 when not specified', () => {
      render(<AlignedNumber value={123.456789} />);
      const element = screen.getByText(/123\.456/);
      expect(element).toBeInTheDocument();
    });

    it('should handle edge case at positive threshold', () => {
      render(<AlignedNumber value={999999} precision={2} />);
      // Should not use scientific notation yet
      const element = screen.getByText(/999/);
      expect(element).toBeInTheDocument();
    });

    it('should handle edge case at negative threshold', () => {
      render(<AlignedNumber value={0.00001} precision={2} />);
      // Should use scientific notation
      const text = screen.getByText(/×10/);
      expect(text).toHaveTextContent('×10');
    });

    it('should apply correct styling for empty values', () => {
      render(<AlignedNumber value='' />);
      const element = screen.getByText('-');
      expect(element).toHaveStyle({ textAlign: 'right' });
    });
  });
});
