import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Line icons from the website's mobile design (AtzIcon.jsx), plus a few the app needs.
const paths = {
  home: (
    <>
      <Path d="m3 10 9-7 9 7v10H3Z" />
      <Path d="M9 20v-7h6v7" />
    </>
  ),
  search: (
    <>
      <Circle cx="10.5" cy="10.5" r="6.5" />
      <Path d="m16 16 5 5" />
    </>
  ),
  grid: (
    <>
      <Rect x="3" y="3" width="7" height="7" rx="2" />
      <Rect x="14" y="3" width="7" height="7" rx="2" />
      <Rect x="3" y="14" width="7" height="7" rx="2" />
      <Rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  bag: (
    <>
      <Path d="M4 8h16l1 13H3Z" />
      <Path d="M8 9V6a4 4 0 0 1 8 0v3" />
    </>
  ),
  user: (
    <>
      <Circle cx="12" cy="7" r="4" />
      <Path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  heart: <Path d="M12 21 3.5 12.5C-2 6 6 0 12 6c6-6 14 0 8.5 6.5Z" />,
  bell: (
    <>
      <Path d="M5 17h14l-2-3V9A5 5 0 0 0 7 9v5Z" />
      <Path d="M10 21h4M12 2v2" />
    </>
  ),
  pin: (
    <>
      <Path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" />
      <Circle cx="12" cy="10" r="2" />
    </>
  ),
  arrow: <Path d="m9 5 7 7-7 7" />,
  back: <Path d="m15 5-7 7 7 7" />,
  spark: (
    <>
      <Path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />
      <Path d="m20 2 1 2 2 1" />
    </>
  ),
  truck: (
    <>
      <Path d="M2 5h12v12H2ZM14 9h4l4 5v3h-8" />
      <Circle cx="6" cy="19" r="2" />
      <Circle cx="18" cy="19" r="2" />
    </>
  ),
  mic: (
    <>
      <Rect x="9" y="2" width="6" height="12" rx="3" />
      <Path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
    </>
  ),
  close: <Path d="m6 6 12 12M6 18 18 6" />,
  check: <Path d="m5 12 5 5 9-10" />,
  wallet: (
    <>
      <Rect x="3" y="6" width="18" height="14" rx="3" />
      <Path d="M3 10h18M16 15h2M6 6l9-3 2 3" />
    </>
  ),
  location: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <Circle cx="12" cy="12" r="7" />
    </>
  ),
  logout: (
    <>
      <Path d="M15 4h4v16h-4" />
      <Path d="M10 8l-4 4 4 4M6 12h11" />
    </>
  ),
  edit: <Path d="M4 20h4L19 9l-4-4L4 16Z" />,
  trash: (
    <>
      <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  tag: (
    <>
      <Path d="M3 12V3h9l9 9-9 9Z" />
      <Circle cx="8" cy="8" r="1.5" />
    </>
  ),
  box: (
    <>
      <Path d="m3 7 9-4 9 4v10l-9 4-9-4Z" />
      <Path d="m3 7 9 4 9-4M12 11v10" />
    </>
  ),
  info: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 11v6M12 7.5v.5" />
    </>
  ),
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 20,
  color = 'currentColor',
  fill = 'none',
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round">
      {paths[name]}
    </Svg>
  );
}
