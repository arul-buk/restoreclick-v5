import { Suspense } from 'react';
import ProcessingPageClient from './ProcessingPageClient';

export default function ProcessingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProcessingPageClient />
    </Suspense>
  );
}
