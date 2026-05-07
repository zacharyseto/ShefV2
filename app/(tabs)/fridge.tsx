import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { usePantry } from '@/context/PantryContext';
import { useColorScheme } from '@/components/useColorScheme';
import { detectIngredientsFromBase64Image, DetectedIngredient } from '@/lib/ingredientVision';

export default function FridgeScreen() {
  const palette = Colors[useColorScheme() ?? 'light'];
  const router = useRouter();
  const { fridgeImageUri, setFridgeImageUri, addIngredientsFromText } = usePantry();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedTargets, setDetectedTargets] = useState<DetectedIngredient[]>([]);
  const [visibleTargetCount, setVisibleTargetCount] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isAnalyzing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isAnalyzing, pulse]);

  useEffect(() => {
    if (!isAnalyzing || detectedTargets.length === 0) return;
    setVisibleTargetCount(0);
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      setVisibleTargetCount(count);
      if (count >= detectedTargets.length) {
        clearInterval(timer);
      }
    }, 280);
    return () => clearInterval(timer);
  }, [isAnalyzing, detectedTargets]);

  const targets = useMemo(() => detectedTargets.slice(0, 8), [detectedTargets]);

  async function finishDetection(detections: DetectedIngredient[]) {
    const ingredientNames = detections.map((item) => item.name).join(', ');
    addIngredientsFromText(ingredientNames);
    setDetectedTargets(detections);
    await new Promise((resolve) => setTimeout(resolve, 1300));
    setIsAnalyzing(false);
    router.push('/pantry');
  }

  async function processPickedAsset(asset: ImagePicker.ImagePickerAsset) {
    setFridgeImageUri(asset.uri);
    setIsAnalyzing(true);
    setDetectedTargets([]);
    setVisibleTargetCount(0);
    try {
      if (!asset.base64) {
        throw new Error('No image data');
      }
      const detections = await detectIngredientsFromBase64Image(asset.base64);
      if (detections.length === 0) {
        Alert.alert('No ingredients found', 'Try a clearer photo that shows food items directly.');
        setIsAnalyzing(false);
        return;
      }
      await finishDetection(detections);
    } catch (error) {
      setIsAnalyzing(false);
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'AI analyze failed',
        `Could not analyze this photo with OpenAI. ${message}\n\nSet EXPO_PUBLIC_OPENAI_API_KEY and restart Expo to use live AI.`
      );
    }
  }

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera', 'Camera access is needed to photograph your fridge.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      await processPickedAsset(result.assets[0]);
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
      base64: true,
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets[0]) {
      await processPickedAsset(result.assets[0]);
    }
  }

  if (isAnalyzing && fridgeImageUri) {
    return (
      <View style={styles.fullScreen} lightColor="#000" darkColor="#000">
        <Image source={{ uri: fridgeImageUri }} style={styles.fullScreenPhoto} resizeMode="cover" />
        <View style={styles.fullScreenOverlay} lightColor="transparent" darkColor="transparent">
          {targets.slice(0, visibleTargetCount).map((target) => (
            <Animated.View
              key={`${target.name}-${target.x}-${target.y}`}
              style={[
                styles.targetWrap,
                {
                  top: `${Math.round(target.y * 100)}%`,
                  left: `${Math.round(target.x * 100)}%`,
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
                },
              ]}>
              <View style={styles.targetDot} />
              <Text style={styles.targetLabel}>{target.name}</Text>
            </Animated.View>
          ))}
          <Text style={styles.overlayTitle}>Analyzing ingredients...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.lead}>
          Snap or upload a fridge photo and AI will automatically detect ingredients and add them to your
          pantry.
        </Text>

        <View style={styles.photoFrame} lightColor="#f4f4f5" darkColor="#27272a">
          {fridgeImageUri ? (
            <View style={styles.photoWrap} lightColor="transparent" darkColor="transparent">
              <Image source={{ uri: fridgeImageUri }} style={styles.photo} resizeMode="cover" />
              {isAnalyzing ? (
                <View style={styles.overlay} lightColor="transparent" darkColor="transparent">
                  {targets.slice(0, visibleTargetCount).map((target) => (
                    <Animated.View
                      key={`${target.name}-${target.x}-${target.y}`}
                      style={[
                        styles.targetWrap,
                        {
                          top: `${Math.round(target.y * 100)}%`,
                          left: `${Math.round(target.x * 100)}%`,
                          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
                        },
                      ]}>
                      <View style={styles.targetDot} />
                      <Text style={styles.targetLabel}>{target.name}</Text>
                    </Animated.View>
                  ))}
                  <Text style={styles.overlayTitle}>Analyzing ingredients...</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.placeholder} lightColor="#71717a" darkColor="#a1a1aa">
              No photo yet
            </Text>
          )}
        </View>

        <View style={styles.row}>
          <Pressable
            disabled={isAnalyzing}
            onPress={pickFromCamera}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: palette.tint, opacity: isAnalyzing ? 0.5 : pressed ? 0.85 : 1 },
            ]}>
            <FontAwesome name="camera" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonLabel}>Take photo</Text>
          </Pressable>
          <Pressable
            disabled={isAnalyzing}
            onPress={pickFromLibrary}
            style={({ pressed }) => [
              styles.button,
              styles.buttonSecondary,
              {
                borderColor: palette.tint,
                opacity: isAnalyzing ? 0.45 : pressed ? 0.85 : 1,
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenPhoto: {
    width: '100%',
    height: '100%',
  },
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 9, 11, 0.28)',
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
  photoWrap: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 9, 11, 0.32)',
  },
  overlayTitle: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  targetWrap: {
    position: 'absolute',
    alignItems: 'center',
    marginLeft: -7,
    marginTop: -7,
  },
  targetDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#22d3ee',
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
  },
  targetLabel: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
    color: '#fff',
    fontSize: 12,
    overflow: 'hidden',
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
    marginTop: 14,
  },
});
