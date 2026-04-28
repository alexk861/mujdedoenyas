import { useTranslation } from 'react-i18next';
import Hero from '../components/Hero';
import Bio from '../components/Bio';
import Archive from '../components/Archive';
import Choice from '../components/Choice';
import Request from '../components/Request';

export default function Home() {
  const { t } = useTranslation();

  return (
    <main>
      <Hero data={t('hero', { returnObjects: true })} />
      <Bio data={t('bio', { returnObjects: true })} />
      <Archive data={t('archive', { returnObjects: true })} />
      <Choice data={t('choices', { returnObjects: true })} />
      <Request data={t('request', { returnObjects: true })} />
    </main>
  );
}
