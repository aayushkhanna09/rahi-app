// src/screens/CreatePost.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, database } from '../config/firebase';

const INDIAN_STATES = [
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export default function CreatePost({ navigation }: any) {
    const [image, setImage] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [locationName, setLocationName] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [uploading, setUploading] = useState(false);
    const [locationCoords, setLocationCoords] = useState<{ lat: number, lng: number } | null>(null);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
    };

    const getCurrentLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission Denied');

        let location = await Location.getCurrentPositionAsync({});
        setLocationCoords({ lat: location.coords.latitude, lng: location.coords.longitude });

        let address = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        });

        if (address.length > 0) {
            const city = address[0].city || address[0].district;
            const state = address[0].region;
            setLocationName(city ? `${city}, ${state}` : state || '');
            if (INDIAN_STATES.includes(state || '')) setSelectedState(state || '');
        }
    };

    const handlePost = async () => {
        // Validation: At least one of these must be present
        if (!image && !caption.trim() && !selectedState) {
            return Alert.alert('Empty Post', 'Please add at least a photo, a caption, or a state to share your memory.');
        }

        setUploading(true);
        const user = auth.currentUser;

        try {
            await addDoc(collection(database, 'posts'), {
                uid: user?.uid,
                displayName: user?.displayName || user?.email?.split('@')[0],
                email: user?.email,
                photoURL: user?.photoURL || null,
                text: caption.trim(),
                image: image, // Nullable
                location: locationName,
                state: selectedState, // Nullable, but triggers count if present
                latitude: locationCoords?.lat || null,
                longitude: locationCoords?.lng || null,
                likes: [],
                timestamp: serverTimestamp(),
            });

            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Could not upload post.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.headerTitle}>New Memory</Text>

            <TouchableOpacity onPress={pickImage} style={styles.imagePlaceholder}>
                {image ? (
                    <View style={{ flex: 1 }}>
                        <Image source={{ uri: image }} style={styles.fullImage} />
                        <TouchableOpacity
                            style={styles.removePhotoBadge}
                            onPress={() => setImage(null)}
                        >
                            <Ionicons name="close-circle" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.emptyImage}>
                        <Ionicons name="camera" size={40} color="#4CAF50" />
                        <Text style={styles.imageText}>Add a Travel Photo (Optional)</Text>
                    </View>
                )}
            </TouchableOpacity>

            <View style={styles.card}>
                <View style={styles.inputSection}>
                    <Ionicons name="create-outline" size={20} color="#666" />
                    <TextInput
                        style={styles.textInput}
                        placeholder="Tell your story... (Optional)"
                        multiline
                        value={caption}
                        onChangeText={setCaption}
                    />
                </View>

                <View style={styles.divider} />

                <View style={styles.inputSection}>
                    <Ionicons name="location-outline" size={20} color="#666" />
                    <TextInput
                        style={styles.textInput}
                        placeholder="Exact Location (City, Landmark)"
                        value={locationName}
                        onChangeText={setLocationName}
                    />
                    <TouchableOpacity onPress={getCurrentLocation}>
                        <Ionicons name="navigate" size={20} color="#4CAF50" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.labelRow}>
                <Text style={styles.label}>Check-in State (Optional)</Text>
                {selectedState !== '' && (
                    <TouchableOpacity onPress={() => setSelectedState('')}>
                        <Text style={styles.clearText}>Clear</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stateSelector}>
                {INDIAN_STATES.map((s) => (
                    <TouchableOpacity
                        key={s}
                        style={[styles.stateChip, selectedState === s && styles.activeChip]}
                        onPress={() => setSelectedState(s)}
                    >
                        <Text style={[styles.stateChipText, selectedState === s && styles.activeChipText]}>{s}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.postBtnText}>Share Experience</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#333', marginBottom: 20, marginTop: 40 },
    imagePlaceholder: { width: '100%', height: 300, backgroundColor: '#fff', borderRadius: 20, marginBottom: 20, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, position: 'relative' },
    fullImage: { width: '100%', height: '100%' },
    removePhotoBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
    emptyImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    imageText: { marginTop: 10, color: '#4CAF50', fontWeight: '600' },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 15, elevation: 2 },
    inputSection: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    textInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 5 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
    label: { fontSize: 16, fontWeight: '700', color: '#555' },
    clearText: { color: '#E53935', fontWeight: '600', fontSize: 14 },
    stateSelector: { flexDirection: 'row', marginBottom: 30 },
    stateChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eee', marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
    activeChip: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
    stateChipText: { color: '#666', fontWeight: '600' },
    activeChipText: { color: '#fff' },
    postBtn: { backgroundColor: '#333', padding: 18, borderRadius: 15, alignItems: 'center', marginBottom: 50 },
    postBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});