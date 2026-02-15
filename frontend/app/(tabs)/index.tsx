import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../../constants/Colors';
import SwipeCard from '../../components/SwipeCard';
import { useState } from 'react';

const MOCK_ITEMS = [
    {
        id: '1',
        title: 'Vintage Denim Jacket',
        brand: 'Levi\'s',
        size: 'M',
        condition: 'Good',
        image: 'https://images.unsplash.com/photo-1542272617-08f086303542?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    },
    {
        id: '2',
        title: 'Floral Summer Dress',
        brand: 'Zara',
        size: 'S',
        condition: 'New',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    },
    {
        id: '3',
        title: 'Black Leather Boots',
        brand: 'Dr. Martens',
        size: '39',
        condition: 'Used',
        image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    },
];

export default function HomeScreen() {
    const [items, setItems] = useState(MOCK_ITEMS);

    const handleSwipeLeft = (id: string) => {
        console.log('Swiped Left on', id);
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleSwipeRight = (id: string) => {
        console.log('Swiped Right on', id);
        setItems((prev) => prev.filter((item) => item.id !== id));
        // TODO: Create Match Logic
    };

    return (
        <View style={styles.container}>
            {items.length > 0 ? (
                items.map((item, index) => {
                    // Only render the top 2 cards for performance, but reverse order so first is on top?
                    // Actually map renders in order, so last element is on top if absolute positioned.
                    // We want the first element in array to be on top? 
                    // Usually stack: index 0 is at bottom.
                    // Let's reverse? Or just render all (if small list).
                    // If we want MOCK_ITEMS[0] to be the visible one, it should be rendered LAST in the stack logic 
                    // OR we use zIndex.
                    // Let's render in reverse order so MOCK_ITEMS[0] is on top.

                    // Simple approach: Use matching mechanics. Only the top card is interactive.
                    const isTop = index === 0;
                    if (!isTop) return null; // Only show one card for simplicity or render stack.

                    // If we want a stack, we need advanced layout.
                    // For MVP, let's just show top card.
                    return (
                        <SwipeCard
                            key={item.id}
                            item={item}
                            onSwipeLeft={() => handleSwipeLeft(item.id)}
                            onSwipeRight={() => handleSwipeRight(item.id)}
                        />
                    );
                })
            ) : (
                <Text style={styles.noItemsText}>No more items to swap!</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.neutrals.beige,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noItemsText: {
        fontSize: 20,
        color: Colors.primary.forestGreen,
        fontWeight: 'bold',
    },
});
