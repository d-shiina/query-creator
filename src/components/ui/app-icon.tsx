import React from "react";

interface AppIconProps {
  className?: string;
  size?: number;
}

export const AppIcon: React.FC<AppIconProps> = ({
  className = "",
  size = 24,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* シンプルなクエリ/検索アイコンのデザイン */}
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M3 10h18M7 7h0M11 7h6M7 13h4M13 13h4M7 16h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="17"
        cy="17"
        r="3"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="m21 21-1.5-1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
