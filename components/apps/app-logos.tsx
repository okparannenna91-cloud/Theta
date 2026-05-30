
interface LogoProps { className?: string; size?: number; }

export function GitHubLogo({ className, size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 98 96" className={className} xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" fill="currentColor"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
    </svg>
  );
}

export function BitbucketLogo({ className, size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 257 257" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bb-grad" x1="108.633" y1="147.574" x2="54.576" y2="264.316" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0052cc" />
          <stop offset="1" stopColor="#2684ff" />
        </linearGradient>
      </defs>
      <path fill="#2684ff" d="M101.272 152.561H155.69l14.571-85.37H86.7Z" />
      <path fill="url(#bb-grad)" d="m6.945 0C3.078 0 .108 3.227.447 7.08l34.786 208.35a4.722 4.722 0 0 0 4.634 3.9h185.352a3.543 3.543 0 0 0 3.512-2.997l34.786-209.2a3.543 3.543 0 0 0-3.509-4.133ZM155.69 152.561H101.272L86.7 67.191h83.557Z" />
    </svg>
  );
}

export function SlackLogo({ className, size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 124 124" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M26.3 78.9c0 7.2-5.9 13.1-13.1 13.1S0 86.1 0 78.9s5.9-13.1 13.1-13.1H26.3v13.1zM32.9 78.9c0-7.2 5.9-13.1 13.1-13.1s13.1 5.9 13.1 13.1v32.9C59.1 119 53.2 124 46 124s-13.1-5.9-13.1-13.1V78.9z" fill="#e01e5a" />
      <path d="M46 26.3c-7.2 0-13.1-5.9-13.1-13.1S38.8 0 46 0s13.1 5.9 13.1 13.1V26.3H46zM46 32.9c7.2 0 13.1 5.9 13.1 13.1s-5.9 13.1-13.1 13.1H13.1C5.9 59.1 0 53.2 0 46s5.9-13.1 13.1-13.1H46z" fill="#36c5f0" />
      <path d="M98.7 46c0-7.2 5.9-13.1 13.1-13.1S124 38.8 124 46s-5.9 13.1-13.1 13.1H98.7V46zM92.1 46c0 7.2-5.9 13.1-13.1 13.1S65.9 53.2 65.9 46V13.1C65.9 5.9 71.8 0 79 0s13.1 5.9 13.1 13.1V46z" fill="#2eb67d" />
      <path d="M79 98.7c7.2 0 13.1 5.9 13.1 13.1S86.2 124 79 124s-13.1-5.9-13.1-13.1V98.7H79zM79 92.1c-7.2 0-13.1-5.9-13.1-13.1s5.9-13.1 13.1-13.1h32.9c7.2 0 13.1 5.9 13.1 13.1s-5.9 13.1-13.1 13.1H79z" fill="#ecb22e" />
    </svg>
  );
}

export function AsanaLogo({ className, size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="asana-g" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#FFB900" />
          <stop offset="100%" stopColor="#F06A6A" />
        </radialGradient>
      </defs>
      <circle cx="128" cy="88" r="56" fill="url(#asana-g)" />
      <circle cx="48" cy="188" r="56" fill="url(#asana-g)" />
      <circle cx="208" cy="188" r="56" fill="url(#asana-g)" />
    </svg>
  );
}

export function TrelloLogo({ className, size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" rx="25" fill="#0079BF" />
      <rect x="144" y="32" width="80" height="112" rx="12" fill="white" />
      <rect x="32" y="32" width="80" height="176" rx="12" fill="white" />
    </svg>
  );
}

export function FigmaLogo({ className, size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 300" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M50 300c27.6 0 50-22.4 50-50v-50H50c-27.6 0-50 22.4-50 50s22.4 50 50 50z" fill="#0ACF83" />
      <path d="M0 150c0-27.6 22.4-50 50-50h50v100H50c-27.6 0-50-22.4-50-50z" fill="#A259FF" />
      <path d="M0 50C0 22.4 22.4 0 50 0h50v100H50C22.4 100 0 77.6 0 50z" fill="#F24E1E" />
      <path d="M100 0h50c27.6 0 50 22.4 50 50s-22.4 50-50 50h-50V0z" fill="#FF7262" />
      <path d="M200 150c0 27.6-22.4 50-50 50s-50-22.4-50-50 22.4-50 50-50 50 22.4 50 50z" fill="#1ABCFE" />
    </svg>
  );
}

export function CanvaLogo({ className, size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="20" fill="#00C4CC" />
      <path d="M60 20c-22.1 0-40 17.9-40 40s17.9 40 40 40 40-17.9 40-40-17.9-40-40-40zm0 65c-13.8 0-25-11.2-25-25s11.2-25 25-25c7.3 0 13.8 3.1 18.4 8l-7.2 7.2c-2.9-3.1-7-5.1-11.2-5.1-8.8 0-16 7.2-16 16s7.2 16 16 16c4.4 0 8.4-1.8 11.3-4.7l7.1 7.1C74 81.8 67.4 85 60 85z" fill="white" />
    </svg>
  );
}

export function WooCommerceLogo({ className, size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 500 500" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="500" height="500" rx="50" fill="#96588A" />
      <path d="M 46.4,82.4 C 52.7,74.4 62.7,70.4 76.4,70.4 L 423.6,70.4 C 437.3,70.4 447.3,74.4 453.6,82.4 C 459.9,90.4 460.5,101.4 455.5,115.4 L 361.4,354.4 C 355.8,368.4 348.5,378.1 339.5,383.7 C 330.5,389.3 319.2,392.1 305.5,392.1 C 291.8,392.1 280.8,389 272.5,382.9 C 264.2,376.8 258.5,368.6 255.4,358.4 L 245.4,358.4 L 229.4,358.4 L 213.4,358.4 C 210.3,368.6 204.6,376.8 196.3,382.9 C 188,389 177,392.1 163.3,392.1 C 149.6,392.1 138.3,389.3 129.3,383.7 C 120.3,378.1 113,368.4 107.4,354.4 L 46.4,115.4 C 41.4,101.4 40.1,90.4 46.4,82.4 z" fill="white" />
      <path d="M 104.7,115.4 L 154.7,300.4 C 157.3,310.1 160.8,317 165.2,321.2 C 169.6,325.4 175.5,327.5 182.8,327.5 C 190.1,327.5 196.2,325 201,320.1 C 205.8,315.2 210.2,306 214.2,292.7 L 244.2,185.4 L 274.2,292.7 C 278.2,306 282.6,315.2 287.4,320.1 C 292.2,325 298.3,327.5 305.6,327.5 C 312.9,327.5 318.8,325.4 323.2,321.2 C 327.6,317 331.1,310.1 333.7,300.4 L 383.7,115.4 z" fill="#96588A" />
    </svg>
  );
}
