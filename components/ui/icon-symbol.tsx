import { OpaqueColorValue, type StyleProp, type ViewStyle } from 'react-native';
import * as BunnyIcons from './BunnyIcons';

export type IconSymbolName =
  | 'house.fill'
  | 'paperplane.fill'
  | 'chevron.left.forwardslash.chevron.right'
  | 'chevron.right'
  | 'chevron.down'
  | 'chevron.up'
  | 'gearshape.fill'
  | 'forward.fill'
  | 'backward.fill'
  | 'play.fill'
  | 'pause.fill'
  | 'repeat'
  | 'shuffle'
  | 'heart'
  | 'quote.bubble'
  | 'airplayaudio'
  | 'list.bullet'
  | 'magnifyingglass'
  | 'paintbrush.fill'
  | 'textformat'
  | 'moon.fill'
  | 'xmark'
  | 'antenna.radiowaves.left.and.right'
  | 'music.note'
  | 'music.note.list'
  | 'person.fill';

const MAPPING: Record<IconSymbolName, React.ComponentType<any>> = {
  'house.fill':                             BunnyIcons.HomeBunny,
  'paperplane.fill':                        BunnyIcons.ExploreBunny,
  'chevron.left.forwardslash.chevron.right':BunnyIcons.CodeBunny,
  'chevron.right':                          BunnyIcons.ChevronRightBunny,
  'chevron.down':                           BunnyIcons.ChevronDownBunny,
  'chevron.up':                             BunnyIcons.ChevronUpBunny,
  'gearshape.fill':                         BunnyIcons.SettingsBunny,
  'forward.fill':                           BunnyIcons.SkipForwardBunny,
  'backward.fill':                          BunnyIcons.SkipBackBunny,
  'play.fill':                              BunnyIcons.PlayBunny,
  'pause.fill':                             BunnyIcons.PauseBunny,
  'repeat':                                 BunnyIcons.RepeatBunny,
  'shuffle':                                BunnyIcons.ShuffleBunny,
  'heart':                                  BunnyIcons.HeartBunny,
  'quote.bubble':                           BunnyIcons.LyricsBunny,
  'airplayaudio':                           BunnyIcons.CastBunny,
  'list.bullet':                            BunnyIcons.ListBunny,
  'music.note':                             BunnyIcons.MusicNoteBunny,
  'music.note.list':                        BunnyIcons.ListBunny,
  'magnifyingglass':                        BunnyIcons.SearchBunny,
  'paintbrush.fill':                        BunnyIcons.PaletteBunny,
  'textformat':                             BunnyIcons.FontBunny,
  'moon.fill':                              BunnyIcons.MoonBunny,
  'xmark':                                  BunnyIcons.XBunny,
  'antenna.radiowaves.left.and.right':      BunnyIcons.RadioBunny,
  'person.fill':                            BunnyIcons.ProfileBunny,
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  active,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}) {
  const Icon = MAPPING[name];
  if (!Icon) return null;
  return <Icon color={color} size={size} style={style} active={active} />;
}
