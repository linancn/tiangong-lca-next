import ExportTidasPackage from '@/components/ExportTidasPackage';
import ImportTidasPackage from '@/components/ImportTidasPackage';
import type { FC } from 'react';

type Props = {
  onImported?: () => void;
};

const TidasPackageActions: FC<Props> = ({ onImported = () => {} }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <ExportTidasPackage />
      <ImportTidasPackage onImported={onImported} />
    </div>
  );
};

export default TidasPackageActions;
