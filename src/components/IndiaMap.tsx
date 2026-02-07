// src/components/IndiaMap.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { INDIA_PATHS } from '../data/IndiaPaths';

export default function IndiaMap({ visitedStates }: { visitedStates: string[] }) {

    const getColor = (stateName: string) => {
        // Check if the user has visited this state
        // We use .some() to handle slight spelling diffs if any
        const isVisited = visitedStates.some(
            s => s.toLowerCase().includes(stateName.toLowerCase()) ||
                stateName.toLowerCase().includes(s.toLowerCase())
        );
        // Match the colors from your reference image
        return isVisited ? "#4CAF50" : "#909090"; // Green for visited, Medium Grey for unvisited
    };

    return (
        <View style={styles.container}>

            {/* Adjusted the viewBox and size to better present the map.
      */}
            <Svg height="400" width="100%" viewBox="0 0 600 700" style={styles.svg}>

                {/* Draw Every State */}
                {Object.keys(INDIA_PATHS).map((stateName) => (
                    <Path
                        key={stateName}
                        d={INDIA_PATHS[stateName]}
                        fill={getColor(stateName)}
                        stroke="#404040" // Dark grey for borders, like the reference image
                        strokeWidth="1"
                    />
                ))}

            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: 20,
        backgroundColor: '#F8F8F8', // Light grey background like the reference image
        padding: 20,
        borderRadius: 15,
        elevation: 3, // Adds a subtle shadow on Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    mapTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        letterSpacing: 0.5,
        fontFamily: 'serif', // A more formal font style
    },
    svg: {
        alignSelf: 'center',
    }
});