// src/screens/Planner.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, database } from '../config/firebase';

// 🔑 Groq API key loaded from .env (get yours from console.groq.com)
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY!; 

interface DayPlan {
    day: number;
    theme: string;
    morning: string;
    afternoon: string;
    evening: string;
}

interface Itinerary {
    title: string;
    days: DayPlan[];
}

export default function Planner({ navigation }: any) {
    const [destination, setDestination] = useState('');
    const [days, setDays] = useState('3');
    const [budget, setBudget] = useState('Moderate');
    const [vibe, setVibe] = useState('Culture');
    
    const [loading, setLoading] = useState(false);
    const [itinerary, setItinerary] = useState<Itinerary | null>(null);
    const [saving, setSaving] = useState(false);

    const generateTrip = async () => {
        if (!destination.trim()) return Alert.alert("Hold up!", "Please enter a destination.");
       
        setLoading(true);
        setItinerary(null);

        const prompt = `You are an expert Indian travel planner. Create a ${days}-day itinerary for ${destination}. Budget: ${budget}. Vibe: ${vibe}. 
        You MUST return the response strictly as a parseable JSON object. 
        Format:
        {
          "title": "A catchy title for the trip",
          "days": [
            {
              "day": 1,
              "theme": "Day theme",
              "morning": "Morning activity",
              "afternoon": "Afternoon activity",
              "evening": "Evening activity"
            }
          ]
        }`;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: "json_object" } // This guarantees perfect JSON
                })
            });

            const data = await response.json();
            
            if (data.error) throw new Error(data.error.message);

            const parsedItinerary = JSON.parse(data.choices[0].message.content);
            setItinerary(parsedItinerary);

        } catch (error: any) {
            console.error(error);
            Alert.alert("Generation Failed", "Could not generate trip. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const saveTrip = async () => {
        if (!itinerary || !auth.currentUser) return;
        setSaving(true);
        try {
            await addDoc(collection(database, 'trips'), {
                uid: auth.currentUser.uid,
                destination,
                budget,
                vibe,
                duration: parseInt(days),
                itinerary,
                createdAt: serverTimestamp()
            });
            Alert.alert("Success!", "Trip saved to your profile.");
            setItinerary(null); 
            setDestination('');
        } catch (error) {
            Alert.alert("Error", "Could not save trip.");
        } finally {
            setSaving(false);
        }
    };

    const renderSelectionRow = (options: string[], state: string, setState: (val: string) => void) => (
        <View style={styles.row}>
            {options.map(opt => (
                <TouchableOpacity 
                    key={opt} 
                    style={[styles.pill, state === opt && styles.pillActive]}
                    onPress={() => setState(opt)}
                >
                    <Text style={[styles.pillText, state === opt && styles.pillTextActive]}>{opt}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>AI Trip Planner ✨</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                
                {!itinerary && (
                    <View style={styles.formCard}>
                        <Text style={styles.label}>Where to?</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. Manali, Jaipur, Meghalaya" 
                            value={destination} 
                            onChangeText={setDestination} 
                        />

                        <Text style={styles.label}>How many days?</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. 3" 
                            keyboardType="numeric" 
                            value={days} 
                            onChangeText={setDays} 
                        />

                        <Text style={styles.label}>Budget</Text>
                        {renderSelectionRow(['Backpacker', 'Moderate', 'Luxury'], budget, setBudget)}

                        <Text style={styles.label}>Vibe</Text>
                        {renderSelectionRow(['Chill', 'Adventure', 'Culture'], vibe, setVibe)}

                        <TouchableOpacity style={styles.generateBtn} onPress={generateTrip} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.generateBtnText}>Generate Itinerary</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                {itinerary && (
                    <View style={styles.resultContainer}>
                        <TouchableOpacity style={styles.resetBtn} onPress={() => setItinerary(null)}>
                            <Ionicons name="arrow-back" size={20} color="#4CAF50" />
                            <Text style={styles.resetText}>Plan another trip</Text>
                        </TouchableOpacity>

                        <Text style={styles.tripTitle}>{itinerary.title}</Text>

                        {itinerary.days.map((day, index) => (
                            <View key={index} style={styles.dayCard}>
                                <View style={styles.dayHeader}>
                                    <Text style={styles.dayTitle}>Day {day.day}</Text>
                                    <Text style={styles.dayTheme}>{day.theme}</Text>
                                </View>
                                
                                <View style={styles.activityRow}>
                                    <Ionicons name="sunny-outline" size={20} color="#FFB300" style={styles.activityIcon} />
                                    <Text style={styles.activityText}><Text style={styles.bold}>Morning:</Text> {day.morning}</Text>
                                </View>
                                
                                <View style={styles.activityRow}>
                                    <Ionicons name="partly-sunny-outline" size={20} color="#FB8C00" style={styles.activityIcon} />
                                    <Text style={styles.activityText}><Text style={styles.bold}>Afternoon:</Text> {day.afternoon}</Text>
                                </View>
                                
                                <View style={styles.activityRow}>
                                    <Ionicons name="moon-outline" size={20} color="#5E35B1" style={styles.activityIcon} />
                                    <Text style={styles.activityText}><Text style={styles.bold}>Evening:</Text> {day.evening}</Text>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity style={styles.saveBtn} onPress={saveTrip} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Trip to Profile</Text>}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#333' },
    content: { padding: 15, paddingBottom: 40 },
    formCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    label: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8, marginTop: 15 },
    input: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, fontSize: 16, color: '#333' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    pill: { flex: 1, paddingVertical: 12, backgroundColor: '#f0f0f0', borderRadius: 8, marginHorizontal: 4, alignItems: 'center' },
    pillActive: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#4CAF50' },
    pillText: { color: '#666', fontWeight: '600', fontSize: 13 },
    pillTextActive: { color: '#4CAF50', fontWeight: '800' },
    generateBtn: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 30 },
    generateBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    resultContainer: { marginTop: 10 },
    resetBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    resetText: { color: '#4CAF50', fontWeight: 'bold', marginLeft: 5 },
    tripTitle: { fontSize: 26, fontWeight: '900', color: '#222', marginBottom: 20 },
    dayCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
    dayHeader: { borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 10, marginBottom: 10 },
    dayTitle: { fontSize: 18, fontWeight: '900', color: '#4CAF50' },
    dayTheme: { fontSize: 14, color: '#666', marginTop: 2 },
    activityRow: { flexDirection: 'row', marginTop: 10, paddingRight: 20 },
    activityIcon: { marginRight: 10, width: 24 },
    activityText: { fontSize: 15, color: '#333', lineHeight: 22 },
    bold: { fontWeight: 'bold' },
    saveBtn: { backgroundColor: '#333', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});