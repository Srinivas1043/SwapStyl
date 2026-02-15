import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedGestureHandler,
    useAnimatedStyle,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../constants/Colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface SwipeCardProps {
    item: any;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
}

export default function SwipeCard({ item, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
    const translateX = Animated.useSharedValue(0);

    const gestureHandler = useAnimatedGestureHandler({
        onStart: (_, ctx: any) => {
            ctx.startX = translateX.value;
        },
        onActive: (event, ctx) => {
            translateX.value = ctx.startX + event.translationX;
        },
        onEnd: (event) => {
            if (event.translationX > SWIPE_THRESHOLD) {
                translateX.value = withSpring(SCREEN_WIDTH + 100);
                runOnJS(onSwipeRight)();
            } else if (event.translationX < -SWIPE_THRESHOLD) {
                translateX.value = withSpring(-SCREEN_WIDTH - 100);
                runOnJS(onSwipeLeft)();
            } else {
                translateX.value = withSpring(0);
            }
        },
    });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    return (
        <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View style={[styles.card, animatedStyle]}>
                <Image source={{ uri: item.image }} style={styles.image} />
                <View style={styles.infoContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.brand}>{item.brand}</Text>
                    <Text style={styles.details}>{item.size} • {item.condition}</Text>
                </View>
            </Animated.View>
        </PanGestureHandler>
    );
}

const styles = StyleSheet.create({
    card: {
        width: SCREEN_WIDTH * 0.9,
        height: SCREEN_WIDTH * 1.3,
        backgroundColor: Colors.neutrals.white,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        position: 'absolute',
    },
    image: {
        width: '100%',
        height: '75%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    infoContainer: {
        padding: 15,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.secondary.deepMaroon,
    },
    brand: {
        fontSize: 18,
        color: Colors.primary.forestGreen,
        marginTop: 5,
    },
    details: {
        fontSize: 14,
        color: Colors.neutrals.gray,
        marginTop: 5,
    },
});
