import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { usePantry } from '@/context/PantryContext';
import { useColorScheme } from '@/components/useColorScheme';

export default function FridgeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { fridgeImageUri, setFridgeImageUri, addIngredientsFromText } = usePantry();
  const [draft, setDraft] = useState('');

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera', 'Camera access is needed to photograph your fridge.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setFridgeImageUri(result.assets[0].uri);
    }
  }

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photos', 'Photo library access is needed to upload a fridge picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.85,
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets[0]) {
      setFridgeImageUri(result.assets[0].uri);
    }
  }

  function onAddToPantry() {
    addIngredientsFromText(draft);
    setDraft('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Text style={styles.lead}>
          Snap or upload a fridge photo, then type what you see to add it to your pantry.
        </Text>

        <View style={styles.photoFrame} lightColor="#f4f4f5" darkColor="#27272a">
          {fridgeImageUri ? (
            <Image source={{ uri: fridgeImageUri }} style={styles.photo} resizeMode="cover" />
          ) : (
            <Text style={styles.placeholder} lightColor="#71717a" darkColor="#a1a1aa">
              No photo yet
            </Text>
          )}
        </View>

        <View style={styles.row}>
          <Pressable
            onPress={pickFromCamera}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: palette.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            <FontAwesome name="camera" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonLabel}>Take photo</Text>
          </Pressable>
          <Pressable
            onPress={pickFromLibrary}
            style={({ pressed }) => [
              styles.button,
              styles.buttonSecondary,
              {
                borderColor: palette.tint,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <FontAwesome name="photo" size={18} color={palette.tint} style={styles.buttonIcon} />
            <Text style={[styles.buttonLabelSecondary, { color: palette.tint }]}>Upload</Text>
          </Pressable>
        </View>

        {fridgeImageUri ? (
          <Pressable onPress={() => setFridgeImageUri(null)} style={styles.clearPhoto}>
            <Text style={{ color: palette.tint, fontSize: 15 }}>Remove photo</Text>
          </Pressable>
        ) : null}

        <Text style={styles.sectionTitle}>Ingredients</Text>
        <Text style={styles.hint} lightColor="#52525b" darkColor="#a1a1aa">
          Separate multiple items with commas or new lines. Duplicates in the pantry are skipped.
        </Text>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="e.g. milk, eggs, spinach"
          placeholderTextColor={colorScheme === 'dark' ? '#71717a' : '#a1a1aa'}
          multiline
          style={[
            styles.input,
            {
              color: palette.text,
              borderColor: colorScheme === 'dark' ? '#3f3f46' : '#e4e4e7',
              backgroundColor: colorScheme === 'dark' ? '#18181b' : '#fff',
            },
          ]}
        />

        <Pressable
          onPress={onAddToPantry}
          disabled={!draft.trim()}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: palette.tint, opacity: !draft.trim() ? 0.45 : pressed ? 0.9 : 1 },
          ]}>
          <Text style={styles.addButtonLabel}>Add to pantry</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  lead: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  photoFrame: {
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 4 / 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonLabelSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearPhoto: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  addButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
