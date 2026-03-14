import * as Components from '@/components';
import Footer from '@/components/Footer';
import LcaTaskCenter from '@/components/LcaTaskCenter';
import Notification from '@/components/Notification';
import QuantitativeReferenceIcon from '@/components/QuantitativeReferenceIcon';
import { DarkMode, Question, SelectLang } from '@/components/RightContent';
import { AvatarDropdown, AvatarName } from '@/components/RightContent/AvatarDropdown';

describe('components barrel exports', () => {
  it('re-exports the shared component entry points', () => {
    expect(Components.Footer).toBe(Footer);
    expect(Components.LcaTaskCenter).toBe(LcaTaskCenter);
    expect(Components.Notification).toBe(Notification);
    expect(Components.QuantitativeReferenceIcon).toBe(QuantitativeReferenceIcon);
    expect(Components.DarkMode).toBe(DarkMode);
    expect(Components.Question).toBe(Question);
    expect(Components.SelectLang).toBe(SelectLang);
    expect(Components.AvatarDropdown).toBe(AvatarDropdown);
    expect(Components.AvatarName).toBe(AvatarName);
  });
});
