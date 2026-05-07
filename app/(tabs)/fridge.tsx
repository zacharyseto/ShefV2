import FontAwesome from '@expo/vector-icons/FontAwesome';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, Modal, Pressable, StyleSheet } from 'react-native';

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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const pulse = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef<CameraView | null>(null);

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

  const targets = useMemo(() => detectedTargets, [detectedTargets]);

  async function finishDetection(detections: DetectedIngredient[]) {
    const ingredientNames = detections.map((item) => item.name).join(', ');
    addIngredientsFromText(ingredientNames);
    setDetectedTargets(detections);
    const animationTimeMs = Math.max(1300, detections.length * 320 + 500);
    await new Promise((resolve) => setTimeout(resolve, animationTimeMs));
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
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) return;
    }
    setCameraOpen(true);
  }

  async function captureFromCustomCamera() {
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.85,
      base64: true,
    });
    if (!photo) return;
    setCameraOpen(false);
    await processPickedAsset({
      uri: photo.uri,
      width: photo.width,
      height: photo.height,
      base64: photo.base64 ?? undefined,
    } as ImagePicker.ImagePickerAsset);
  }

  async function pickFromLibraryInCamera() {
    setCameraOpen(false);
    await new Promise((resolve) => setTimeout(resolve, 300));
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
        <Image source={{ uri: fridgeImageUri }} style={styles.fullScreenPhoto} resizeMode="contain" />
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
      <Pressable
        onPress={pickFromCamera}
        disabled={isAnalyzing}
        style={({ pressed }) => [
          styles.photoFrameLarge,
          { opacity: isAnalyzing ? 0.4 : pressed ? 0.9 : 1 },
        ]}>
        <View style={styles.photoFrame} lightColor="#f4f4f5" darkColor="#27272a">
          {fridgeImageUri ? (
            <>
              <Image source={{ uri: fridgeImageUri }} style={styles.photo} resizeMode="cover" />
              <View style={styles.cameraBadge} lightColor="transparent" darkColor="transparent">
                <FontAwesome name="camera" size={24} color="#fff" />
              </View>
            </>
          ) : (
            <View style={styles.capturePrompt} lightColor="transparent" darkColor="transparent">
              <FontAwesome name="camera" size={42} color={palette.tint} />
              <Text style={styles.capturePromptText}>Tap to take fridge photo</Text>
            </View>
          )}
        </View>
      </Pressable>
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraModal} lightColor="#000" darkColor="#000">
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          <View style={styles.cameraControls} lightColor="transparent" darkColor="transparent">
            <Pressable onPress={pickFromLibraryInCamera} style={styles.cameraControlLeft}>
              <FontAwesome name="photo" size={28} color="#fff" />
            </Pressable>
            <Pressable onPress={captureFromCustomCamera} style={styles.captureButtonOuter}>
              <View style={styles.captureButtonInner} />
            </Pressable>
            <Pressable onPress={() => setCameraOpen(false)} style={styles.cameraControlRight}>
              <FontAwesome name="close" size={28} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>
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
  photoFrameLarge: {
    flex: 1,
    margin: 20,
    marginBottom: 12,
  },
  photoFrame: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  cameraBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    padding: 6,
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
  capturePrompt: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturePromptText: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '600',
  },
  cameraModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 26,
    zIndex: 10,
  },
  cameraControlLeft: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraControlRight: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
});
