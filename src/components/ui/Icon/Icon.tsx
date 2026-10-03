import React from 'react';

import CameraIcon from '../../../assets/icons/camera.svg';
import CheckIcon from '../../../assets/icons/check.svg';
import ChevronRightIcon from '../../../assets/icons/chevron-right.svg';
import CircleIcon from '../../../assets/icons/circle.svg';
import CloseIcon from '../../../assets/icons/close.svg';
import DropHappyIcon from '../../../assets/icons/drop-happy.svg';
import DropSadIcon from '../../../assets/icons/drop-sad.svg';
import EditIcon from '../../../assets/icons/edit.svg';
import FlashOffIcon from '../../../assets/icons/flash-off.svg';
import FlashIcon from '../../../assets/icons/flash.svg';
import GoogleIcon from '../../../assets/icons/google.svg';
import HeartSelectedIcon from '../../../assets/icons/heart-selected.svg';
import HeartIcon from '../../../assets/icons/heart.svg';
import HomeIcon from '../../../assets/icons/home.svg';
import InfoIcon from '../../../assets/icons/info.svg';
import LibraryIcon from '../../../assets/icons/library.svg';
import MinusIcon from '../../../assets/icons/minus.svg';
import MoreIcon from '../../../assets/icons/more.svg';
import PlantIcon from '../../../assets/icons/plant.svg';
import PlusIcon from '../../../assets/icons/plus.svg';
import RepeatIcon from '../../../assets/icons/repeat.svg';
import ScheduleIcon from '../../../assets/icons/schedule.svg';
import SearchIcon from '../../../assets/icons/search.svg';
import SunIcon from '../../../assets/icons/sun.svg';
import TrashIcon from '../../../assets/icons/trash.svg';
import WaterIcon from '../../../assets/icons/water.svg';
import { sizes, useTheme } from '../../../theme';

export type IconName =
  | 'camera'
  | 'check'
  | 'chevronRight'
  | 'circle'
  | 'close'
  | 'dropHappy'
  | 'dropSad'
  | 'edit'
  | 'flash'
  | 'flashOff'
  | 'google'
  | 'heart'
  | 'heartSelected'
  | 'home'
  | 'info'
  | 'library'
  | 'minus'
  | 'more'
  | 'plant'
  | 'plus'
  | 'repeat'
  | 'schedule'
  | 'search'
  | 'sun'
  | 'trash'
  | 'water';

export type IconProps = {
  /** Defaults to the theme's icon colour. Not applied to `heartSelected`: the filled favourite
   * heart is always the favourite colour (docs/dark-mode-spec.md §1), so a control that tints its
   * icons (a button, a nav item) cannot repaint it. */
  color?: string;
  name: IconName;
  size?: IconSize;
};

export type IconSize = keyof typeof sizes.icon | number;

const iconSizes = {
  sm: sizes.icon.sm,
  md: sizes.icon.md,
  lg: sizes.icon.lg,
  xl: sizes.icon.xl,
  xxl: sizes.icon.xxl,
} as const;

type SvgProps = { color?: string; width?: number; height?: number };

const iconComponents: Record<IconName, React.ComponentType<SvgProps>> = {
  camera: CameraIcon,
  check: CheckIcon,
  chevronRight: ChevronRightIcon,
  circle: CircleIcon,
  close: CloseIcon,
  dropHappy: DropHappyIcon,
  dropSad: DropSadIcon,
  edit: EditIcon,
  flash: FlashIcon,
  flashOff: FlashOffIcon,
  google: GoogleIcon,
  heart: HeartIcon,
  heartSelected: HeartSelectedIcon,
  home: HomeIcon,
  info: InfoIcon,
  library: LibraryIcon,
  minus: MinusIcon,
  more: MoreIcon,
  plant: PlantIcon,
  plus: PlusIcon,
  repeat: RepeatIcon,
  schedule: ScheduleIcon,
  search: SearchIcon,
  sun: SunIcon,
  trash: TrashIcon,
  water: WaterIcon,
};

export function Icon({ color, name, size = sizes.icon.md }: IconProps) {
  const theme = useTheme();
  const resolvedColor =
    name === 'heartSelected' ? theme.components.favorite : (color ?? theme.colors.icon.primary);
  const resolvedSize = typeof size === 'number' ? size : iconSizes[size];
  const Component = iconComponents[name];

  return <Component width={resolvedSize} height={resolvedSize} color={resolvedColor} />;
}
