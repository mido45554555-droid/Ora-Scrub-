import { use } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/home/Hero';
import { ValueSection } from '@/components/home/ValueSection';
import { CustomizationSection } from '@/components/home/CustomizationSection';
import { ProcessSection } from '@/components/home/ProcessSection';
import { FinalCta } from '@/components/home/FinalCta';

export default function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <>
      <Hero />
      <ValueSection />
      <CustomizationSection />
      <ProcessSection />
      <FinalCta />
    </>
  );
}
