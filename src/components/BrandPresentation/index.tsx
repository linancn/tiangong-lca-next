import { ArrowRightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Link, useIntl } from 'umi';
import { brandProfile } from '../../../config/brandProfile';
import {
  DEFAULT_BROWSER_APP_LOCALE,
  normalizeSupportedAppLocale,
} from '@/services/general/localeRegistry';
import './style.less';

export function useBrandPresentation() {
  const { locale } = useIntl();
  const appLocale = normalizeSupportedAppLocale(locale) ?? DEFAULT_BROWSER_APP_LOCALE;
  return brandProfile.presentation?.copy[appLocale];
}

export function AtlasLoginIntroduction({
  logo = brandProfile.theme.light.logo,
}: {
  logo?: string;
}) {
  const copy = useBrandPresentation();
  if (!copy) return null;
  return (
    <aside className='atlas-introduction'>
      <div className='atlas-wordmark'>
        <img src={logo} alt='' width={48} height={48} />
        <span>{brandProfile.displayName}</span>
      </div>
      <div className='atlas-introduction-copy'>
        <p className='atlas-eyebrow'>{copy.eyebrow}</p>
        <h1>{copy.headline}</h1>
        <p className='atlas-introduction-description'>{copy.introduction}</p>
      </div>
      <div className='atlas-coordinate-art' aria-hidden='true'>
        <svg viewBox='0 0 500 250' fill='none'>
          <ellipse cx='250' cy='130' rx='222' ry='100' />
          <ellipse cx='250' cy='130' rx='150' ry='100' />
          <ellipse cx='250' cy='130' rx='64' ry='100' />
          <path d='M28 130h444M50 85h400M50 175h400M250 30v200' />
          <path className='atlas-coordinate-path' d='M93 175 190 85 314 130 405 85' />
          <g className='atlas-coordinate-points'>
            <circle cx='93' cy='175' r='4' />
            <circle cx='190' cy='85' r='4' />
            <circle cx='314' cy='130' r='4' />
            <circle cx='405' cy='85' r='4' />
          </g>
        </svg>
      </div>
    </aside>
  );
}

export function AtlasWorkspace({
  onGuide,
  onData,
  onStandard,
  standardLabel,
  dataLabel,
}: {
  onGuide: () => void;
  onData: () => void;
  onStandard: () => void;
  standardLabel: string;
  dataLabel: string;
}) {
  const copy = useBrandPresentation();
  if (!copy) return null;
  return (
    <section className='atlas-workspace'>
      <header className='atlas-workspace-heading'>
        <p className='atlas-eyebrow'>
          {brandProfile.displayName} / {copy.eyebrow}
        </p>
        <h1>{copy.workspaceTitle}</h1>
        <p>{copy.workspaceDescription}</p>
      </header>
      <div className='atlas-workspace-actions'>
        <Link to='/mydata/processes' className='atlas-workspace-action'>
          <span className='atlas-action-index' aria-hidden='true'>
            01
          </span>
          <h2>{copy.dataTitle}</h2>
          <p>{copy.dataDescription}</p>
          <ArrowRightOutlined aria-hidden />
        </Link>
        <Link to='/mydata/models' className='atlas-workspace-action'>
          <span className='atlas-action-index' aria-hidden='true'>
            02
          </span>
          <h2>{copy.modelTitle}</h2>
          <p>{copy.modelDescription}</p>
          <ArrowRightOutlined aria-hidden />
        </Link>
        <button type='button' onClick={onGuide} className='atlas-workspace-action'>
          <span className='atlas-action-index' aria-hidden='true'>
            03
          </span>
          <h2>{copy.guideTitle}</h2>
          <p>{copy.guideDescription}</p>
          <ArrowRightOutlined aria-hidden />
        </button>
      </div>
      <div className='atlas-workspace-reference'>
        <p>{copy.introduction}</p>
        <div>
          <Button onClick={onStandard}>{standardLabel}</Button>
          <Button onClick={onData}>{copy.dataSourcesLabel || dataLabel}</Button>
        </div>
      </div>
    </section>
  );
}
