/**
 * Tests for contacts data type definitions
 * Path: src/services/contacts/data.ts
 *
 * This module defines TypeScript types and interfaces for contact data.
 * Since these are type definitions, tests verify type correctness and usage patterns.
 */

import type { ContactDataSetObjectKeys, ContactTable, FormContact } from '@/services/contacts/data';

describe('Contacts Data Types (src/services/contacts/data.ts)', () => {
  describe('ContactTable type', () => {
    it('should have correct structure for table display', () => {
      const mockContactTable: ContactTable = {
        key: 'test-key-1',
        id: 'contact-123',
        version: '1.0.0',
        lang: 'en',
        shortName: 'John Doe',
        name: 'Dr. John Doe',
        classification: 'Academic',
        email: 'john.doe@example.com',
        modifiedAt: new Date('2024-01-01'),
        teamId: 'team-456',
      };

      expect(mockContactTable.key).toBe('test-key-1');
      expect(mockContactTable.id).toBe('contact-123');
      expect(mockContactTable.version).toBe('1.0.0');
      expect(mockContactTable.email).toBe('john.doe@example.com');
      expect(mockContactTable.modifiedAt).toBeInstanceOf(Date);
    });

    it('should allow React.Key types for key property', () => {
      const contactWithStringKey: ContactTable = {
        key: 'string-key',
        id: 'contact-1',
        version: '1.0',
        lang: 'en',
        shortName: 'Test',
        name: 'Test Name',
        classification: 'Test',
        email: 'test@test.com',
        modifiedAt: new Date(),
        teamId: 'team-1',
      };

      const contactWithNumberKey: ContactTable = {
        key: 123,
        id: 'contact-2',
        version: '1.0',
        lang: 'en',
        shortName: 'Test',
        name: 'Test Name',
        classification: 'Test',
        email: 'test@test.com',
        modifiedAt: new Date(),
        teamId: 'team-1',
      };

      expect(typeof contactWithStringKey.key).toBe('string');
      expect(typeof contactWithNumberKey.key).toBe('number');
    });
  });

  describe('FormContact type', () => {
    it('should pick correct properties from Contact contactDataSet', () => {
      // This test verifies the type picks the correct properties
      const mockFormContact: Partial<FormContact> = {
        contactInformation: {
          dataSetInformation: {
            'common:UUID': 'test-uuid',
            'common:shortName': [{ '@xml:lang': 'en', '#text': 'Short Name' }],
            'common:name': [{ '@xml:lang': 'en', '#text': 'Full Name' }],
          } as any,
        } as any,
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2024-01-01T00:00:00Z',
          } as any,
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
          } as any,
        } as any,
      };

      expect(mockFormContact.contactInformation).toBeDefined();
      expect(mockFormContact.administrativeInformation).toBeDefined();
      expect(mockFormContact.contactInformation?.dataSetInformation?.['common:UUID']).toBe(
        'test-uuid',
      );
    });

    it('should allow optional nested properties', () => {
      // Minimal valid FormContact
      const minimalFormContact: Partial<FormContact> = {
        contactInformation: {} as any,
        administrativeInformation: {} as any,
      };

      expect(minimalFormContact.contactInformation).toBeDefined();
      expect(minimalFormContact.administrativeInformation).toBeDefined();
    });
  });

  describe('ContactDataSetObjectKeys type', () => {
    it('should extract only object-type keys from contactDataSet', () => {
      // This test verifies that the type correctly identifies object keys
      // The type should only include keys that have object or undefined values

      // Since this is a type-level test, we verify by ensuring the types compile
      // and match expected structure. In practice, these keys should be:
      // 'contactInformation' | 'administrativeInformation'

      const validKey: ContactDataSetObjectKeys = 'contactInformation';
      const validKey2: ContactDataSetObjectKeys = 'administrativeInformation';

      expect(validKey).toBe('contactInformation');
      expect(validKey2).toBe('administrativeInformation');
    });
  });

  describe('Type compatibility and usage patterns', () => {
    it('should match patterns used in Contacts components', () => {
      // Based on usage in src/pages/Contacts/index.tsx
      const tableData: ContactTable[] = [
        {
          key: '1',
          id: 'contact-1',
          version: '1.0.0',
          lang: 'en',
          shortName: 'Contact 1',
          name: 'Full Contact Name 1',
          classification: 'Industry',
          email: 'contact1@example.com',
          modifiedAt: new Date(),
          teamId: 'team-1',
        },
        {
          key: '2',
          id: 'contact-2',
          version: '2.0.0',
          lang: 'zh',
          shortName: '联系人2',
          name: '完整联系人名称2',
          classification: '学术',
          email: 'contact2@example.com',
          modifiedAt: new Date(),
          teamId: 'team-2',
        },
      ];

      expect(tableData).toHaveLength(2);
      expect(tableData[0].lang).toBe('en');
      expect(tableData[1].lang).toBe('zh');
    });

    it('should support form data structure used in edit/create components', () => {
      // Based on usage in src/pages/Contacts/Components/edit.tsx
      const formData: Partial<FormContact> = {
        contactInformation: {
          dataSetInformation: {
            'common:UUID': 'new-contact-uuid',
            'common:shortName': [
              { '@xml:lang': 'en', '#text': 'New Contact' },
              { '@xml:lang': 'zh', '#text': '新联系人' },
            ],
            'common:name': [
              { '@xml:lang': 'en', '#text': 'New Contact Full Name' },
              { '@xml:lang': 'zh', '#text': '新联系人全名' },
            ],
            contactAddress: [{ '@xml:lang': 'en', '#text': '123 Main St' }],
            telephone: '+1234567890',
            email: 'newcontact@example.com',
          } as any,
        } as any,
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': new Date().toISOString(),
          } as any,
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
          } as any,
        } as any,
      };

      expect(formData.contactInformation?.dataSetInformation?.email).toBe('newcontact@example.com');
      expect(formData.contactInformation?.dataSetInformation?.['common:shortName']).toHaveLength(2);
    });
  });
});
