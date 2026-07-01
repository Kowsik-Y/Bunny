import { ChevronDown, ChevronRight, Code, Home, Pause, Play, Send, Settings, SkipBack, SkipForward, ListMusic, Music, User } from 'lucide-react-native';
import { StyleProp, ViewStyle } from 'react-native';

export type IconSymbolName =
  | 'house.fill'
  | 'paperplane.fill'
  | 'chevron.left.forwardslash.chevron.right'
  | 'chevron.right'
  | 'gearshape.fill'
  | 'forward.fill'
  | 'backward.fill'
  | 'play.fill'
  | 'pause.fill'
  | 'chevron.down'
  | 'music.note'
  | 'music.note.list'
  | 'person.fill';

const MAPPING: Record<IconSymbolName, typeof Home> = {
  'house.fill': Home,
  'paperplane.fill': Send,
  'chevron.left.forwardslash.chevron.right': Code,
  'chevron.right': ChevronRight,
  'gearshape.fill': Settings,
  'forward.fill': SkipForward,
  'backward.fill': SkipBack,
  'play.fill': Play,
  'pause.fill': Pause,
  'chevron.down': ChevronDown,
  'music.note': Music,
  'music.note.list': ListMusic,
  'person.fill': User,
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const Icon = MAPPING[name];
  return <Icon color={color} size={size} style={style} />;
}
