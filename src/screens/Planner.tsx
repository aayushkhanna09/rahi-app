// src/screens/Planner.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { auth, database } from '../config/firebase';

const TRIP_GENRES = ['Adventure', 'Relaxing', 'Cultural', 'Nightlife', 'Foodie', 'Nature', 'Historical'];

interface Trip {
    id: string;
    location: string;
    days: number;
    dates: string;
    tags: string[];
    itinerary: string;
    [key: string]: any;
}

export default function TripPlanner() {
    const [phase, setPhase] = useState<'dashboard' | 'form' | 'choice' | 'editor' | 'view'>('dashboard');

    // Dashboard State
    const [savedTrips, setSavedTrips] = useState<Trip[]>([]);
    const [loadingTrips, setLoadingTrips] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

    // Trip Creation Form States
    const [location, setLocation] = useState('');
    const [days, setDays] = useState('');
    const [dates, setDates] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const [plan, setPlan] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // --- 1. REAL-TIME LISTENER FOR SAVED TRIPS ---
    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const q = query(
            collection(database, 'trips'),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
            setSavedTrips(trips);
            setLoadingTrips(false);
        });

        return () => unsubscribe();
    }, []);

    // --- ACTIONS ---

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleNext = () => {
        if (!location.trim() || !days.trim()) {
            Alert.alert("Required Fields", "Please fill in the location and number of days to proceed.");
            return;
        }
        setPhase('choice');
    };

    const handleAIGeneration = () => {
        setLoading(true);
        setPhase('editor');

        // MOCK LLM DELAY - Replace with actual backend API call
        setTimeout(() => {
            setPlan(
                `✨ AI Generated Itinerary for ${location} (${days} Days) ✨

Vibes: ${selectedTags.length > 0 ? selectedTags.join(', ') : 'General exploration'}
Dates: ${dates || 'Flexible'}

Day 1: Arrival & Exploration
- Morning: Arrive, check-in, and grab local breakfast.
- Afternoon: Visit the main city square/market.
- Evening: Dinner at a highly-rated local restaurant.

Day 2: The Main Attractions
- Morning: Guided tour of the top historical/nature site.
- Afternoon: Lunch and relaxing walk.
- Evening: Experiencing the local nightlife.

(Connect your Python LLM backend here!)`
            );
            setLoading(false);
        }, 2000);
    };

    const handleManualSetup = () => {
        let template = `Trip to ${location} (${days} Days)\nDates: ${dates || 'TBD'}\nVibes: ${selectedTags.join(', ')}\n\n`;
        const numDays = parseInt(days) || 1;
        for (let i = 1; i <= numDays; i++) {
            template += `Day ${i}:\n- Morning:\n- Afternoon:\n- Evening:\n\n`;
        }
        setPlan(template);
        setPhase('editor');
    };

    const handleSaveTrip = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        if (!plan.trim()) {
            Alert.alert("Hold on", "Your itinerary is empty!");
            return;
        }

        setIsSaving(true);
        try {
            await addDoc(collection(database, 'trips'), {
                userId: currentUser.uid,
                location,
                days: parseInt(days) || 0,
                dates,
                tags: selectedTags,
                itinerary: plan,
                timestamp: serverTimestamp(),
            });

            Alert.alert("Success!", "Trip saved successfully.");
            resetPlanner();
        } catch (error) {
            console.error("Error saving trip: ", error);
            Alert.alert("Error", "Could not save your trip. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDeleteTrip = (tripId: string) => {
        Alert.alert("Delete Trip", "Are you sure you want to delete this itinerary?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteTrip(tripId) }
        ]);
    };

    const deleteTrip = async (tripId: string) => {
        try {
            await deleteDoc(doc(database, 'trips', tripId));
            if (phase === 'view') setPhase('dashboard');
        } catch (error) {
            Alert.alert("Error", "Could not delete trip.");
        }
    };

    const resetPlanner = () => {
        setPhase('dashboard');
        setPlan('');
        setLocation('');
        setDays('');
        setDates('');
        setSelectedTags([]);
        setSelectedTrip(null);
    };

    const viewTrip = (trip: Trip) => {
        setSelectedTrip(trip);
        setPhase('view');
    };

    // --- RENDERERS ---

    const renderTripCard = ({ item }: { item: Trip }) => (
        <TouchableOpacity style={styles.tripCard} onPress={() => viewTrip(item)}>
            <View style={{ flex: 1 }}>
                <Text style={styles.tripLocation}>{item.location}</Text>
                <Text style={styles.tripDates}>{item.days} Days {item.dates ? `• ${item.dates}` : ''}</Text>
                {item.tags && item.tags.length > 0 ? (
                    <Text style={styles.tripTags} numberOfLines={1}>
                        {item.tags.map((t: string) => `#${t}`).join(' ')}
                    </Text>
                ) : null}
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>

            {/* PHASE 0: DASHBOARD */}
            {phase === 'dashboard' && (
                <View style={styles.dashboardContainer}>
                    <View style={styles.topNav}>
                        <Text style={styles.navTitle}>My Trips</Text>
                        <TouchableOpacity onPress={() => setPhase('form')} style={styles.addBtn}>
                            <Ionicons name="add" size={28} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {loadingTrips ? (
                        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
                    ) : savedTrips.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="map-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>No trips planned yet.</Text>
                            <Text style={styles.emptySubText}>Tap the + icon to start your next adventure!</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={savedTrips}
                            keyExtractor={item => item.id}
                            renderItem={renderTripCard}
                            contentContainerStyle={{ padding: 20 }}
                        />
                    )}
                </View>
            )}

            {/* PHASE 1: FORM */}
            {phase === 'form' && (
                <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={resetPlanner}>
                            <Ionicons name="close" size={28} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.mainTitle}>Plan New Trip</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <Text style={styles.sectionTitle}>Where to?</Text>
                    <TextInput style={styles.input} placeholder="e.g. Manali, Goa, Kyoto" value={location} onChangeText={setLocation} />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.sectionTitle}>Days</Text>
                            <TextInput style={styles.input} placeholder="e.g. 5" keyboardType="numeric" value={days} onChangeText={setDays} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>Dates (Optional)</Text>
                            <TextInput style={styles.input} placeholder="Oct 12 - Oct 17" value={dates} onChangeText={setDates} />
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Trip Vibe (Select multiple)</Text>
                    <View style={styles.tagsContainer}>
                        {TRIP_GENRES.map(tag => (
                            <TouchableOpacity
                                key={tag}
                                style={[styles.tagBtn, selectedTags.includes(tag) && styles.tagBtnActive]}
                                onPress={() => toggleTag(tag)}
                            >
                                <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>{tag}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                        <Text style={styles.btnText}>Continue</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 5 }} />
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* PHASE 2: CHOICE */}
            {phase === 'choice' && (
                <View style={styles.centerContainer}>
                    <TouchableOpacity style={styles.backBtnAbs} onPress={() => setPhase('form')}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                        <Text style={styles.backText}>Back to Details</Text>
                    </TouchableOpacity>

                    <Text style={styles.choiceTitle}>How do you want to plan your {days}-day trip to {location}?</Text>

                    <TouchableOpacity style={[styles.modeBtn, { backgroundColor: '#4CAF50' }]} onPress={handleAIGeneration}>
                        <Ionicons name="sparkles" size={24} color="white" />
                        <Text style={styles.btnText}>Auto-Plan with AI</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.modeBtn, { backgroundColor: '#333' }]} onPress={handleManualSetup}>
                        <Ionicons name="create-outline" size={24} color="white" />
                        <Text style={styles.btnText}>Build Manually</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* PHASE 3: EDITOR */}
            {phase === 'editor' && (
                <View style={styles.fullScreenContainer}>
                    <View style={styles.editorHeader}>
                        <TouchableOpacity onPress={() => setPhase('choice')}>
                            <Ionicons name="arrow-back" size={28} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.editorTitle}>Editor</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#4CAF50" />
                            <Text style={styles.loadingText}>AI is crafting your perfect trip...</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }}>
                            <TextInput style={styles.largeInput} multiline value={plan} onChangeText={setPlan} />
                            <TouchableOpacity style={styles.saveTripBtn} onPress={handleSaveTrip} disabled={isSaving}>
                                {isSaving ? <ActivityIndicator color="#fff" /> : (
                                    <>
                                        <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.saveTripText}>Save Itinerary</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </View>
            )}

            {/* PHASE 4: VIEW SAVED TRIP */}
            {phase === 'view' && selectedTrip && (
                <View style={styles.fullScreenContainer}>
                    <View style={styles.editorHeader}>
                        <TouchableOpacity onPress={resetPlanner}>
                            <Ionicons name="arrow-back" size={28} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.editorTitle}>{selectedTrip.location}</Text>
                        <TouchableOpacity onPress={() => confirmDeleteTrip(selectedTrip.id)}>
                            <Ionicons name="trash-outline" size={24} color="#E53935" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        <View style={styles.viewMetaContainer}>
                            <Text style={styles.viewDays}>{selectedTrip.days} Days {selectedTrip.dates ? `| ${selectedTrip.dates}` : ''}</Text>
                            {selectedTrip.tags && selectedTrip.tags.length > 0 ? (
                                <Text style={styles.viewTags}>{selectedTrip.tags.map((t: string) => `#${t}`).join(' ')}</Text>
                            ) : null}
                        </View>
                        <Text style={styles.viewItinerary}>{selectedTrip.itinerary}</Text>
                    </ScrollView>
                </View>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },

    // Dashboard Styles
    dashboardContainer: { flex: 1 },
    topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, borderBottomWidth: 1, borderColor: '#eee' },
    navTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    addBtn: { padding: 5 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 15 },
    emptySubText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 5 },

    tripCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
    tripLocation: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    tripDates: { fontSize: 13, color: '#666', marginBottom: 6 },
    tripTags: { fontSize: 12, color: '#4CAF50', fontWeight: '500' },

    // Shared / Layout
    scrollContainer: { flexGrow: 1, padding: 20, paddingTop: 60 },
    fullScreenContainer: { flex: 1, paddingTop: 50 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    mainTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },

    // Form Styles
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 8, marginTop: 15 },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 15, fontSize: 16, color: '#333' },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
    tagBtn: { backgroundColor: '#f0f0f0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, margin: 5, borderWidth: 1, borderColor: '#ddd' },
    tagBtnActive: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
    tagText: { color: '#666', fontWeight: '600' },
    tagTextActive: { color: '#4CAF50' },
    primaryBtn: { flexDirection: 'row', backgroundColor: '#4CAF50', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 40 },

    // Choice Styles
    centerContainer: { flex: 1, justifyContent: 'center', padding: 20 },
    choiceTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#333', lineHeight: 28 },
    modeBtn: { flexDirection: 'row', padding: 20, borderRadius: 15, marginVertical: 10, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 18, marginLeft: 10 },
    backBtnAbs: { flexDirection: 'row', alignItems: 'center', position: 'absolute', top: 60, left: 20 },
    backText: { fontSize: 16, color: '#333', marginLeft: 5, fontWeight: '600' },

    // Editor Styles
    editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderColor: '#eee' },
    editorTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    largeInput: { flex: 1, minHeight: 400, backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 20, fontSize: 16, textAlignVertical: 'top', color: '#333', lineHeight: 24, marginBottom: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, fontSize: 16, color: '#666', fontWeight: '500' },
    saveTripBtn: { flexDirection: 'row', backgroundColor: '#333', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
    saveTripText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

    // View Styles
    viewMetaContainer: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
    viewDays: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    viewTags: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
    viewItinerary: { fontSize: 16, color: '#444', lineHeight: 26 }
});