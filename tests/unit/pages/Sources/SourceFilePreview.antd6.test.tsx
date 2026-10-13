import { SourceForm } from '@/pages/Sources/Components/form';
import { getOriginalFileUrl } from '@/services/supabase/storage';
import { render, screen, waitFor } from '@testing-library/react';
import { Form } from 'antd';
import userEvent from '@testing-library/user-event';
import React from 'react';

jest.mock('umi', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  }),
}));
jest.mock('@/pages/Utils/validation/formSupport', () => ({
  useDatasetSdkValidationFormSupport: () => ({ sdkValidationCountsByTab: {} }),
}));
jest.mock('@/pages/Utils', () => ({ getRules: () => [] }));
jest.mock('@/components/LangTextItem/form', () => () => null);
jest.mock('@/components/LevelTextItem/form', () => () => null);
jest.mock('@/components/RequiredMark', () => () => null);
jest.mock('@/components/DatasetCreateVersionFormItem', () => () => null);
jest.mock('@/pages/Contacts/Components/select/form', () => () => null);
jest.mock('@/pages/Sources/Components/select/form', () => () => null);
jest.mock('@/services/supabase/storage', () => ({
  getOriginalFileUrl: jest.fn(),
  getBase64: jest.fn(),
  isImage: (file: { name: string }) => /\.(png|jpg)$/iu.test(file.name),
}));

type PreviewFile = import('@/services/supabase/storage').StorageFilePreview;

const original = jest.mocked(getOriginalFileUrl);

function Harness({ initialFile }: { initialFile: PreviewFile }) {
  const formRef = React.useRef<import('@ant-design/pro-components').ProFormInstance | undefined>(
    undefined,
  );
  const [files, setFiles] = React.useState<import('antd').UploadFile[]>([initialFile]);
  return (
    <Form>
      <SourceForm
        lang='en'
        activeTabKey='sourceInformation'
        formRef={formRef}
        onData={() => {}}
        onTabChange={() => {}}
        loadFiles={[]}
        setLoadFiles={() => {}}
        fileList={files}
        setFileList={setFiles}
      />
    </Form>
  );
}

describe('Source files with the real Ant Design 6 Upload', () => {
  it.each([
    {
      uid: '../external_docs/doc.pdf',
      name: '1.pdf',
      url: '',
      previewState: 'unchecked' as const,
      action: 'Open file',
    },
    {
      uid: '../external_docs/missing.png',
      name: '2.png',
      url: '',
      status: 'error' as const,
      previewState: 'unavailable' as const,
      action: 'Retry preview',
    },
  ])('keeps $name reachable without a thumbnail or fabricated URL', async (file) => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    original.mockResolvedValueOnce({
      uid: file.uid,
      name: file.name,
      url: '',
      status: 'error',
      previewState: 'unavailable',
    });
    const { container } = render(<Harness initialFile={file} />);
    const action = await screen.findByRole('button', { name: `${file.action}: ${file.name}` });
    const nativeItem = container.querySelector('.ant-upload-list-item')!;
    const footer = action.parentElement!;
    expect(nativeItem).toBeTruthy();
    expect(nativeItem.contains(action)).toBe(false);
    expect(footer.style.position).toBe('relative');
    expect(footer.style.zIndex).toBe('2');
    expect(container.querySelectorAll('.ant-upload-list-item-actions .anticon-eye')).toHaveLength(
      0,
    );
    expect(action).not.toBeDisabled();
    action.focus();
    expect(action).toHaveFocus();
    await userEvent.setup().click(action);
    await waitFor(() => expect(original).toHaveBeenCalledWith(file.uid, file.name));
    expect(await screen.findByText('File preview unavailable')).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('opens an unchecked managed document through keyboard activation and preserves its locator', async () => {
    const file = {
      uid: '../external_docs/doc.pdf',
      name: '1.pdf',
      url: '',
      previewState: 'unchecked' as const,
    };
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    original.mockResolvedValueOnce({
      ...file,
      url: 'blob:resolved',
      status: 'done',
      previewState: 'resolved',
    });
    const { container } = render(<Harness initialFile={file} />);
    const action = await screen.findByRole('button', { name: 'Open file: 1.pdf' });
    action.focus();
    await userEvent.setup().keyboard('{Enter}');
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith('blob:resolved', '_blank', 'noopener,noreferrer'),
    );
    expect(original).toHaveBeenCalledWith(file.uid, file.name);
    expect(await screen.findByText('File preview ready')).toBeInTheDocument();
    expect(container.querySelector('.ant-upload-list-item-name')).toHaveAttribute(
      'href',
      'blob:resolved',
    );
    open.mockRestore();
  });

  it.each(['https://example.org/doc.pdf', 'javascript:alert(1)'])(
    'does not add an authenticated Storage action for %s',
    async (uri) => {
      const state = uri.startsWith('https:') ? 'unchecked' : 'unsupported';
      render(
        <Harness
          initialFile={{
            uid: uri,
            name: 'reference',
            url: state === 'unchecked' ? uri : '',
            previewState: state,
          }}
        />,
      );
      expect(
        screen.queryByRole('button', { name: 'Open file: reference' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Retry preview: reference' }),
      ).not.toBeInTheDocument();
      expect(original).not.toHaveBeenCalled();
    },
  );
});
