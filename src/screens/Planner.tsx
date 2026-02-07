// src/screens/Planner.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { auth, database } from '../config/firebase';

const AI_TEMPLATES: any = {
    'Adventure': ['Morning Trek 🏔️', 'River Rafting 🚣', 'Sunset Cliff Jump 🪂', 'Campfire Night 🔥', 'Jungle Safari 🐅'],
    'Relax': ['Yoga Session 🧘', 'Beach Walk 🏖️', 'Spa Massage 💆', 'Read a Book at Cafe ☕', 'Stargazing ✨'],
    'Culture': ['Visit Ancient Temple 🏯', 'Museum Tour 🏛️', 'Local Market Shopping 🛍️', 'Traditional Dance Show 💃', 'Street Food Walk 🥘'],
    'Party': ['Pool Party 🏊', 'Club Hopping 🕺', 'Beach Bar 🍹', 'Live Music Concert 🎸', 'Late Night Drive 🏎️']
};

export default function Planner() {
    const [view, setView] = useState<'list' | 'create'>('list');
    const [trips, setTrips] = useState<any[]>([]);

    const [destination, setDestination] = useState('');
    const [days, setDays] = useState('3');
    const [vibe, setVibe] = useState('Adventure');
    const [loading, setLoading] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<any>(null);

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(database, 'trips'), where('uid', '==', auth.currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, []);

    const handleGenerate = () => {
        if (!destination || !days) {
            Alert.alert("Missing Info", "Please enter destination and days!");
            return;
        }

        setLoading(true);

        setTimeout(() => {
            const plan = [];
            const activities = AI_TEMPLATES[vibe] || AI_TEMPLATES['Adventure'];
            const numDays = parseInt(days);

            for (let i = 1; i <= numDays; i++) {
                const morning = activities[Math.floor(Math.random() * activities.length)];
                const evening = activities[Math.floor(Math.random() * activities.length)];
                plan.push({ day: i, schedule: `${morning} -> Lunch -> ${evening}` });
            }

            setGeneratedPlan(plan);
            setLoading(false);
        }, 2000);
    };

    const handleSave = async () => {
        try {
            await addDoc(collection(database, 'trips'), {
                uid: auth.currentUser?.uid,
                destination,
                days,
                vibe,
                plan: generatedPlan || [], // Ensure plan is never undefined
                createdAt: new Date().toISOString()
            });
            Alert.alert("Success", "Trip Saved!");
            setGeneratedPlan(null);
            setDestination('');
            setView('list');
        } catch (e: any) {
            Alert.alert("Error", e.message);
        }
    };

    const handleDelete = async (id: string) => {
        await deleteDoc(doc(database, 'trips', id));
    };

    const renderTripCard = ({ item }: any) => {
        // --- SAFETY CHECK: If plan is missing, use empty array ---
        const plan = item.plan || [];

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.cardTitle}>{item.destination}</Text>
                        <Text style={styles.cardSubtitle}>{item.days} Days • {item.vibe} Trip</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                        <Ionicons name="trash-outline" size={20} color="red" />
                    </TouchableOpacity>
                </View>
                <View style={styles.divider} />

                {/* Render only if plan has items */}
                {plan.length > 0 ? (
                    plan.slice(0, 3).map((day: any, index: number) => (
                        <Text key={index} style={styles.planText}>Day {day.day}: {day.schedule}</Text>
                    ))
                ) : (
                    <Text style={{ color: '#999', fontStyle: 'italic' }}>No itinerary details available.</Text>
                )}

                {plan.length > 3 && <Text style={{ color: '#888', fontSize: 12 }}>+ {plan.length - 3} more days...</Text>}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>AI Trip Planner 🤖</Text>
                <TouchableOpacity onPress={() => setView(view === 'list' ? 'create' : 'list')}>
                    <Ionicons name={view === 'list' ? "add-circle" : "list"} size={32} color="#4CAF50" />
                </TouchableOpacity>
            </View>

            {view === 'list' ? (
                <FlatList
                    data={trips}
                    keyExtractor={item => item.id}
                    renderItem={renderTripCard}
                    contentContainerStyle={{ padding: 15 }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={{ fontSize: 50 }}>🗺️</Text>
                            <Text style={{ color: '#888', marginTop: 10 }}>No upcoming trips.</Text>
                            <Text style={{ color: '#888' }}>Click + to plan one!</Text>
                        </View>
                    }
                />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <Text style={styles.label}>Where to?</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Manali, Goa, Ladakh"
                        value={destination}
                        onChangeText={setDestination}
                    />

                    <Text style={styles.label}>How many days?</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="3"
                        keyboardType="numeric"
                        value={days}
                        onChangeText={setDays}
                    />

                    <Text style={styles.label}>What's the vibe?</Text>
                    <View style={styles.vibeContainer}>
                        {['Adventure', 'Relax', 'Culture', 'Party'].map((v) => (
                            <TouchableOpacity
                                key={v}
                                style={[styles.vibeChip, vibe === v && styles.activeVibe]}
                                onPress={() => setVibe(v)}
                            >
                                <Text style={[styles.vibeText, vibe === v && { color: '#fff' }]}>{v}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {!generatedPlan ? (
                        <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>✨ Generate Itinerary</Text>}
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.resultContainer}>
                            <Text style={styles.resultTitle}>Your AI Itinerary for {destination}:</Text>
                            {generatedPlan.map((d: any) => (
                                <View key={d.day} style={styles.dayRow}>
                                    <Text style={{ fontWeight: 'bold', color: '#4CAF50' }}>Day {d.day}:</Text>
                                    <Text style={{ marginLeft: 10, flex: 1 }}>{d.schedule}</Text>
                                </View>
                            ))}

                            <View style={{ flexDirection: 'row', marginTop: 20 }}>
                                <TouchableOpacity style={[styles.generateBtn, { backgroundColor: '#ccc', flex: 1, marginRight: 10 }]} onPress={() => setGeneratedPlan(null)}>
                                    <Text style={styles.btnText}>Discard</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.generateBtn, { flex: 1 }]} onPress={handleSave}>
                                    <Text style={styles.btnText}>💾 Save Trip</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { padding: 20, paddingTop: 50, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    cardSubtitle: { color: '#666', fontSize: 12 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
    planText: { fontSize: 14, marginBottom: 5, color: '#444' },
    emptyState: { alignItems: 'center', marginTop: 100 },
    label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 5 },
    input: { backgroundColor: '#fff', padding: 15, borderRadius: 10, fontSize: 16, elevation: 1 },
    vibeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    vibeChip: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: '#ddd' },
    activeVibe: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
    vibeText: { color: '#666', fontWeight: '600' },
    generateBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    resultContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginTop: 20, elevation: 2 },
    resultTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
    dayRow: { flexDirection: 'row', marginBottom: 10, borderBottomWidth: 1, borderColor: '#f0f0f0', paddingBottom: 10 }
});