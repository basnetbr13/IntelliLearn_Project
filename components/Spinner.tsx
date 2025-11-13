
import React from 'react';

interface SpinnerProps {
    small?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = ({ small = false }) => {
  const sizeClass = small ? 'h-5 w-5' : 'h-8 w-8';
  return (
    <div
      className={`${sizeClass} animate-spin rounded-full border-4 border-solid border-sky-500 border-t-transparent`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
