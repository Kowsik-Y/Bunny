import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Dimensions,
    StyleSheet,
    Platform,
    Keyboard,
    BackHandler,
    DeviceEventEmitter
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolate,
    interpolate,
    runOnJS,
    runOnUI,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

import { MINI_PLAYER_HEIGHT } from '@/constants/layout';
import { useAppTheme } from '@/contexts/app-theme-context';
import { usePlayerAnimation } from '@/contexts/player-animation-context';
import MiniPlayerControls from './Miniplayercontrols';
import TrackContent from './Trackcontent';
import { type AppTrack } from './Tracks';

const { width, height } = Dimensions.get('window');

const DRAG_THRESHOLD = height / 5;             // drag distance to trigger snap

const SPRING_CONFIG = {
    damping: 25,
    mass: 1,
    stiffness: 200,
    overshootClamping: true,
    restSpeedThreshold: 0.1,
    restDisplacementThreshold: 0.1,
};

type Props = {
    track: AppTrack | null;
    queue: AppTrack[];
    isPlaying: boolean;
    isBuffering: boolean;
    position: number;
    duration: number;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeek: (pos: number) => void;
    onSkipToTrack: (id: string) => void;
};

const MusicPlayerModal = ({
    track, queue, isPlaying, isBuffering,
    position, duration, onPlayPause, onNext, onPrev, onSeek, onSkipToTrack,
}: Props) => {
    const { colors, colorScheme } = useAppTheme();
    const isDark = colorScheme === 'dark';
    const miniOuterColors: [string, string] = isDark 
        ? [colors.border, colors.background] 
        : ['#FFFFFF', colors.border];
    const miniInnerColors: [string, string] = isDark 
        ? [colors.card, colors.card] 
        : [colors.secondary, '#FFFFFF'];
    const fallbackTrack: AppTrack = {
        id: 'no-track',
        url: '',
        title: 'Not Playing',
        artist: 'Select a song to play',
        album: 'Single',
        duration: 0,
        artwork: '',
    };
    const activeTrack = track || fallbackTrack;
    const { translateY, snapCollapsed, bottomOffset, expand: contextExpand, collapse: contextCollapse } = usePlayerAnimation();
    const [shuffleOn, setShuffleOn] = useState(false);
    const [repeatOn, setRepeatOn] = useState(false);

    const [isExpandedJS, setIsExpandedJS] = useState(false);
    // SharedValue mirror of isExpandedJS so worklets can read it on the UI thread
    const isExpanded = useSharedValue(false);

    // Holds the correct play/pause handler for whichever player is currently
    // active (audio = TrackPlayer, video = expo-video).  Updated by TrackContent
    // via onVideoModeChange whenever the user switches modes.
    const videoPlayPauseRef = useRef<(() => void) | null>(null);

    const handleMiniPlayPause = useCallback(() => {
        if (videoPlayPauseRef.current) {
            videoPlayPauseRef.current();
        } else {
            onPlayPause();
        }
    }, [onPlayPause]);

    const handleVideoModeChange = useCallback(
        ({ isVideo, playPause }: { isVideo: boolean; playPause: () => void }) => {
            videoPlayPauseRef.current = isVideo ? playPause : null;
        },
        []
    );

    // On first mount and any real track change, snap to collapsed position.
    useEffect(() => {
        if (!track) return; // ignore undefined flashes during track resolution swap
        const snap = () => {
            const currentHeight = Dimensions.get('window').height;
            const newSnap = currentHeight - MINI_PLAYER_HEIGHT - bottomOffset.value;
            snapCollapsed.value = newSnap;
            if (!isExpanded.value) {
                translateY.value = withSpring(newSnap, SPRING_CONFIG);
            }
        };

        // Try immediately (works on reload when bottomOffset is already set)
        snap();

        // Also after a brief delay so bottomOffset has time to be initialised on cold start
        const timer = setTimeout(snap, 100);

        // Listen for keyboard events to re-adjust and snap the collapsed player modal
        const showSub = Keyboard.addListener('keyboardDidShow', snap);
        const hideSub = Keyboard.addListener('keyboardDidHide', snap);

        return () => {
            clearTimeout(timer);
            showSub.remove();
            hideSub.remove();
        };
    }, [track]);

    // Keep snapCollapsed and translateY in sync with bottomOffset (fires on every change)
    useAnimatedReaction(
        () => bottomOffset.value,
        (offset) => {
            const newSnap = height - MINI_PLAYER_HEIGHT - offset;
            snapCollapsed.value = newSnap;
            if (!isExpanded.value) {
                translateY.value = withSpring(newSnap, SPRING_CONFIG);
            }
        }
    );

    const expand = useCallback(() => {
        contextExpand();
        runOnUI(() => {
            'worklet';
            isExpanded.value = true;
        })();
        setIsExpandedJS(true);
    }, [contextExpand]);

    const collapse = useCallback(() => {
        contextCollapse();
        runOnUI(() => {
            'worklet';
            isExpanded.value = false;
        })();
        setIsExpandedJS(false);
    }, [contextCollapse]);

    // Intercept hardware back button on Android to collapse player if expanded
    useEffect(() => {
        const handleBackPress = () => {
            if (isExpandedJS) {
                collapse();
                return true;
            }
            return false;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => {
            subscription.remove();
        };
    }, [isExpandedJS, collapse]);

    // Listen for collapse-player-modal event to close player
    useEffect(() => {
        const collapseSub = DeviceEventEmitter.addListener('collapse-player-modal', () => {
            collapse();
        });
        return () => {
            collapseSub.remove();
        };
    }, [collapse]);

    // const SNAP_EXPANDED = 0; // already defined implicitly as 0 target in expand

    // ─── Gesture handler ───────────────────────────────────────────────
    const startY = useSharedValue(0);

    const createPanGesture = useCallback(() => Gesture.Pan()
        .activeOffsetY([-15, 15])
        .onStart(() => {
            startY.value = translateY.value;
        })
        .onUpdate((event) => {
            const next = startY.value + event.translationY;
            translateY.value = Math.max(0, Math.min(snapCollapsed.value, next));
        })
        .onEnd((event) => {
            const movedDown = event.translationY > DRAG_THRESHOLD;
            const movedUp = event.translationY < -DRAG_THRESHOLD;
            const flickDown = event.velocityY > 800;
            const flickUp = event.velocityY < -800;

            if (movedDown || flickDown) {
                translateY.value = withSpring(snapCollapsed.value, SPRING_CONFIG);
                isExpanded.value = false;
                runOnJS(setIsExpandedJS)(false);
            } else if (movedUp || flickUp) {
                translateY.value = withSpring(0, SPRING_CONFIG);
                isExpanded.value = true;
                runOnJS(setIsExpandedJS)(true);
            } else {
                // Snap to nearest
                const mid = snapCollapsed.value / 2;
                if (translateY.value > mid) {
                    translateY.value = withSpring(snapCollapsed.value, SPRING_CONFIG);
                    isExpanded.value = false;
                    runOnJS(setIsExpandedJS)(false);
                } else {
                    translateY.value = withSpring(0, SPRING_CONFIG);
                    isExpanded.value = true;
                    runOnJS(setIsExpandedJS)(true);
                }
            }
        }), []);

    const headerPanGesture = useMemo(() => createPanGesture(), []);
    const artworkPanGesture = useMemo(() => createPanGesture(), []);
    const controlsPanGesture = useMemo(() => createPanGesture(), []);
    const miniPanGesture = useMemo(() => createPanGesture(), []);

    // ─── Animated styles ──────────────────────────────────────────────
    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        height: height,
    }));

    const fullOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateY.value,
            [snapCollapsed.value - 300, snapCollapsed.value - 30],
            [1, 0],
            Extrapolate.CLAMP,
        ),
    }));

    const miniOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateY.value,
            [snapCollapsed.value - 40, snapCollapsed.value],
            [0, 1],
            Extrapolate.CLAMP,
        ),
    }));

    return (
        <>
            {isExpandedJS && <StatusBar style="light" animated />}
            <Animated.View
                style={[styles.sheet, sheetStyle]}
                pointerEvents="box-none"
            >

                {/* Full player */}
                <Animated.View
                    style={[styles.fullPlayer, fullOpacity, { backgroundColor: colors.background }]}
                    pointerEvents={isExpandedJS ? 'auto' : 'none'}
                >
                    <TrackContent
                        track={activeTrack}
                        queue={queue}
                        isPlaying={isPlaying}
                        isBuffering={isBuffering}
                        position={position}
                        duration={duration}
                        onPlayPause={onPlayPause}
                        onNext={onNext}
                        onPrev={onPrev}
                        onSeek={onSeek}
                        onSkipToTrack={onSkipToTrack}
                        onShuffle={() => setShuffleOn((s) => !s)}
                        onRepeat={() => setRepeatOn((s) => !s)}
                        shuffleOn={shuffleOn}
                        repeatOn={repeatOn}
                        panGesture={{ header: headerPanGesture, artwork: artworkPanGesture, controls: controlsPanGesture }}
                        onCollapse={collapse}
                        onVideoModeChange={handleVideoModeChange}
                    />
                </Animated.View>

                {/* Mini bar */}
                <GestureDetector gesture={miniPanGesture}>
                    <Animated.View
                        style={[
                            styles.miniBar,
                            miniOpacity,
                            {
                                top: 0,
                            }
                        ]}
                        pointerEvents={isExpandedJS ? 'none' : 'auto'}
                    >
                        <LinearGradient
                            colors={miniOuterColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.miniBarOuter}
                        >
                            <LinearGradient
                                colors={miniInnerColors}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.miniBarInner}
                            >
                                <MiniPlayerControls
                                    track={activeTrack}
                                    isPlaying={isPlaying}
                                    isBuffering={isBuffering}
                                    onPlayPause={handleMiniPlayPause}
                                    onNext={onNext}
                                    onExpand={expand}
                                />
                            </LinearGradient>
                        </LinearGradient>
                    </Animated.View>
                </GestureDetector>

            </Animated.View>
        </>
    );
};

export default MusicPlayerModal;

const styles = StyleSheet.create({
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 0,
        overflow: 'visible',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
        }),
    },
    handleWrap: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 2,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ddd',
    },
    fullPlayer: {
        flex: 1,
        overflow: 'hidden',
    },
    miniBar: {
        position: 'absolute',
        left: 24,
        right: 24,
        top: 0,
        borderRadius: 32,
    },
    miniBarOuter: {
        borderRadius: 32,
        padding: 1.2,
        overflow: 'hidden',
    },
    miniBarInner: {
        borderRadius: 30.8,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
});
