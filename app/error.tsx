'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import Image from 'next/image';
import { Button } from 'primereact/button';
export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('error =====>', error);
  }, [error]);

  return (
    <div
      style={{ height: '80vh' }}
      className="mt-32    mx-auto flex justify-content-center align-items-center flex-column"
    >
      <div>
        <Image height={200} width={200} src="/nointernet.png" alt="No Internet" />
      </div>
      <h3 className="text-6xl font-semibold text-blue-400 text-center mt-5 p-0">
        OOPS!
      </h3>
      <p className="text-center text-4xl font-[25px] mt-4 text-gray-700 p-0">
        Something went wrong!{' '}
      </p>

      <Button
        label={'Try Again'}
        className="p-button-secondary px-4 py-3"
        onClick={() => () => reset()}
      />
    </div>
  );
}
