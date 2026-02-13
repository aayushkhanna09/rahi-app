// src/screens/EditProfile.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, database } from '../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function EditProfile({ navigation }: any) {
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [tags, setTags] = useState('');
    const [photoURL, setPhotoURL] = useState('https://via.placeholder.com/100');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCurrentData();
    }, []);

    const fetchCurrentData = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        try {
            const userDoc = await getDoc(doc(database, 'users', currentUser.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setDisplayName(data.displayName || '');
                setBio(data.bio || '');
                setTags(data.tags ? data.tags.join(', ') : '');
                if (data.photoURL) setPhotoURL(data.photoURL);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setPhotoURL(result.assets[0].uri);
            // Note: To make this permanent across devices, you would upload this URI 
            // to Firebase Storage here and get a download URL back.
        }
    };

    const handleSave = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        setSaving(true);
        try {
            const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

            await updateDoc(doc(database, 'users', currentUser.uid), {
                displayName,
                bio,
                tags: tagsArray,
                photoURL // If using Firebase Storage, pass the download URL here instead
            });

            Alert.alert("Success", "Profile updated successfully!");
            navigation.goBack();
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#4CAF50" style={{ flex: 1, justifyContent: 'center' }} />;
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="#4CAF50" /> : <Ionicons name="checkmark" size={28} color="#4CAF50" />}
                </TouchableOpacity>
            </View>

            <View style={styles.imageSection}>
                <TouchableOpacity onPress={handlePickImage}>
                    <Image source={{ uri: photoURL }} style={styles.profileImage} />
                    <View style={styles.editIconContainer}>
                        <Ionicons name="camera" size={20} color="#fff" />
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                    style={styles.input}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter your name"
                />

                <Text style={styles.label}>Bio</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us about yourself"
                    multiline
                    numberOfLines={3}
                />

                <Text style={styles.label}>Tags (comma-separated)</Text>
                <TextInput
                    style={styles.input}
                    value={tags}
                    onChangeText={setTags}
                    placeholder="e.g. Explorer, Foodie, Backpacker"
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },

    imageSection: { alignItems: 'center', marginVertical: 30 },
    profileImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee' },
    editIconContainer: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#4CAF50', padding: 10, borderRadius: 20, borderWidth: 3, borderColor: '#fff' },

    formSection: { paddingHorizontal: 20 },
    label: { fontSize: 14, color: '#666', marginBottom: 5, fontWeight: 'bold' },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 15, fontSize: 16, color: '#333', marginBottom: 20 },
    textArea: { height: 100, textAlignVertical: 'top' },
});