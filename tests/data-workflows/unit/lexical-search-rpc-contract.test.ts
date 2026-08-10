import { CONTACT_FULL_TEXT_SEARCH_CONFIG } from '../workflows/contacts/contacts-full-text-search-workflow-lib';
import { FLOWPROPERTY_FULL_TEXT_SEARCH_CONFIG } from '../workflows/flowproperties/flowproperties-full-text-search-workflow-lib';
import { FLOW_FULL_TEXT_SEARCH_CONFIG } from '../workflows/flows/flows-full-text-search-workflow-lib';
import { SOURCE_FULL_TEXT_SEARCH_CONFIG } from '../workflows/sources/sources-full-text-search-workflow-lib';
import { UNITGROUP_FULL_TEXT_SEARCH_CONFIG } from '../workflows/unitgroups/unitgroups-full-text-search-workflow-lib';

describe('shared lexical data-workflow RPC contracts', () => {
  it.each([
    ['contacts', CONTACT_FULL_TEXT_SEARCH_CONFIG, 'search_contacts'],
    ['flowproperties', FLOWPROPERTY_FULL_TEXT_SEARCH_CONFIG, 'search_flowproperties'],
    ['flows', FLOW_FULL_TEXT_SEARCH_CONFIG, 'search_flows'],
    ['sources', SOURCE_FULL_TEXT_SEARCH_CONFIG, 'search_sources'],
    ['unitgroups', UNITGROUP_FULL_TEXT_SEARCH_CONFIG, 'search_unitgroups'],
  ] as const)('%s uses its formal suffixless RPC', (_table, config, rpcName) => {
    expect(config.rpcName).toBe(rpcName);
    expect(config.rpcName).not.toMatch(/_latest(?:_v2)?$/);
  });
});
