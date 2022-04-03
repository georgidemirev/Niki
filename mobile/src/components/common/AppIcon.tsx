import React from 'react';
import { Path, Svg } from 'react-native-svg';

export type IconType = 
| 'profile'
| 'more'
| 'chat'

interface SVGProp {
  icon: IconType
  size?: number
  color?: string
  opacity?: number
  viewBox?: string
}

const AppIcon: React.FC<SVGProp> = ({
  icon = 'alert',
  size = 24,
  color = '#000000',
  opacity = 1,
  viewBox = '0 0 24 24',
}) => {
	const iconPaths = {
		profile: '',
		chat: '',
		more: '',
	}
	return (
    <Svg
      viewBox={viewBox}
      width={size}
      height={size}
      opacity={opacity}
      fill={color}>
      <Path d={iconPaths[icon]} />
    </Svg>
  );
}

export default AppIcon
