import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Animated, PanResponder } from 'react-native';
import { Colors } from '../constants/Colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface SwipeCardProps {
    item: any;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
}

export default function SwipeCard({ item, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
    const position = useRef(new Animated.ValueXY()).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gesture) => {
                position.setValue({ x: gesture.dx, y: gesture.dy });
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx > SWIPE_THRESHOLD) {
                    forceSwipe('right');
                } else if (gesture.dx < -SWIPE_THRESHOLD) {
                    forceSwipe('left');
                } else {
                    resetPosition();
                }
            },
        })
    ).current;

    const forceSwipe = (direction: 'left' | 'right') => {
        const x = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
        Animated.timing(position, {
            toValue: { x, y: 0 },
            duration: 250,
            useNativeDriver: false,
        }).start(() => onSwipeComplete(direction));
    };

    const onSwipeComplete = (direction: 'left' | 'right') => {
        // Actually props are available in scope.
        direction === 'right' ? onSwipeRight() : onSwipeLeft();
        // Reset position not strictly needed if component unmounts, but good practice if recycled
        // position.setValue({ x: 0, y: 0 }); 
    };

    const resetPosition = () => {
        Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
        }).start();
    };

    const getCardStyle = () => {
        const rotate = position.x.interpolate({
            inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
            outputRange: ['-120deg', '0deg', '120deg'],
        });

        return {
            ...position.getLayout(),
            transform: [{ rotate }],
        };
    };

    return (
        <Animated.View
            style={[styles.card, getCardStyle()]}
            {...panResponder.panHandlers}
        >
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.infoContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.brand}>{item.brand}</Text>
                <Text style={styles.details}>{item.size} • {item.condition}</Text>
            </View>
        </Animated.View>
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
