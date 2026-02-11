import React from 'react';

interface TidyHomeLogoProps {
  size?: number;
  className?: string;
}

const TidyHomeLogo: React.FC<TidyHomeLogoProps> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* House body */}
    <path
      d="M8 24V40C8 41.1 8.9 42 10 42H20V32H28V42H38C39.1 42 40 41.1 40 40V24"
      fill="currentColor"
      opacity="0.15"
    />
    <path
      d="M8 24V40C8 41.1 8.9 42 10 42H20V32C20 31.45 20.45 31 21 31H27C27.55 31 28 31.45 28 32V42H38C39.1 42 40 41.1 40 40V24"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Roof */}
    <path
      d="M4 26L24 8L44 26"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Chimney */}
    <path
      d="M34 14V10H38V18"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Sparkle - large */}
    <path
      d="M38 4L39.2 7.8L43 9L39.2 10.2L38 14L36.8 10.2L33 9L36.8 7.8L38 4Z"
      fill="currentColor"
    />
    {/* Sparkle - small */}
    <path
      d="M44 16L44.8 18.2L47 19L44.8 19.8L44 22L43.2 19.8L41 19L43.2 18.2L44 16Z"
      fill="currentColor"
      opacity="0.6"
    />
  </svg>
);

export default TidyHomeLogo;
