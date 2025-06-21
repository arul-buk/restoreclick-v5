import { Suspense } from 'react';
import ProcessingFailedPageClient from './ProcessingFailedPageClient';

export default function ProcessingFailedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProcessingFailedPageClient />
    </Suspense>
  );
}
