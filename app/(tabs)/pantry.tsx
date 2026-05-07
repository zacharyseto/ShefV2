import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Animated, Modal, Pressable, SectionList, StyleSheet, TextInput } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { usePantry } from '@/context/PantryContext';
import { useColorScheme } from '@/components/useColorScheme';

type PantrySection = {
  title: string;
  color: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  data: {
    id: string;
    name: string;
  }[];
};

const GROUPS = [
  { title: 'Fruits', color: '#f97316', icon: 'apple' },
  { title: 'Vegetables', color: '#22c55e', icon: 'leaf' },
  { title: 'Protein', color: '#ef4444', icon: 'cutlery' },
  { title: 'Dairy', color: '#3b82f6', icon: 'tint' },
  { title: 'Grains', color: '#f59e0b', icon: 'pagelines' },
  { title: 'Pantry', color: '#8b5cf6', icon: 'archive' },
  { title: 'Other', color: '#64748b', icon: 'circle' },
] as const;

function toDisplayName(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function groupForIngredient(name: string): (typeof GROUPS)[number]['title'] {
  const n = name.toLowerCase();
  if (/(apple|banana|orange|berry|berries|grape|melon|mango|pear|peach|fruit)/.test(n)) {
    return 'Fruits';
  }
  if (/(spinach|lettuce|tomato|tomatoes|onion|garlic|pepper|carrot|broccoli|cucumber|zucchini|vegetable)/.test(n)) {
    return 'Vegetables';
  }
  if (/(chicken|beef|pork|fish|salmon|egg|eggs|tofu|beans|lentil|turkey)/.test(n)) {
    return 'Protein';
  }
  if (/(milk|yogurt|cheese|butter|cream)/.test(n)) {
    return 'Dairy';
  }
  if (/(rice|pasta|bread|oat|quinoa|flour|cereal|noodle)/.test(n)) {
    return 'Grains';
  }
  if (/(salt|sugar|oil|sauce|spice|vinegar|stock|broth|can|canned)/.test(n)) {
    return 'Pantry';
  }
  return 'Other';
}

export default function PantryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { items, removeItem, addIngredient } = usePantry();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draftName, setDraftName] = useState('');

  const sections = useMemo<PantrySection[]>(() => {
    const grouped = new Map<string, typeof items>();
    for (const group of GROUPS) grouped.set(group.title, []);
    for (const item of items) {
      const bucket = groupForIngredient(item.name);
      grouped.get(bucket)?.push(item);
    }
    return GROUPS.map((group) => ({
      title: group.title,
      color: group.color,
      icon: group.icon,
      data: grouped.get(group.title) ?? [],
    })).filter((section) => section.data.length > 0);
  }, [items]);

  function onSubmitAdd() {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    addIngredient(trimmed);
    setDraftName('');
    setIsAddOpen(false);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => setIsAddOpen(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Add ingredient"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <FontAwesome name="plus" size={22} color={palette.tint} />
            </Pressable>
          ),
        }}
      />

      {items.length === 0 ? (
        <View style={styles.empty} lightColor="#f4f4f5" darkColor="#27272a">
          <FontAwesome name="shopping-basket" size={40} color={palette.tabIconDefault} />
          <Text style={styles.emptyTitle}>Pantry is empty</Text>
          <Text style={styles.emptySubtitle} lightColor="#52525b" darkColor="#a1a1aa">
            Add ingredients from the Fridge tab to build your list.
          </Text>
        </View>
      ) : (
        <SectionList<{ id: string; name: string }, PantrySection>
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          SectionSeparatorComponent={() => <View style={styles.sectionGap} lightColor="transparent" darkColor="transparent" />}
          ItemSeparatorComponent={() => <View style={styles.sep} lightColor="#e4e4e7" darkColor="#3f3f46" />}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader} lightColor="transparent" darkColor="transparent">
              <FontAwesome name={section.icon} size={16} color={section.color} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item, section }) => (
            <Swipeable
              overshootRight={false}
              renderRightActions={(_, dragX) => {
                const translateX = dragX.interpolate({
                  inputRange: [-120, 0],
                  outputRange: [0, 72],
                  extrapolate: 'clamp',
                });
                return (
                  <Animated.View style={{ transform: [{ translateX }] }}>
                    <Pressable
                      onPress={() => removeItem(item.id)}
                      style={styles.swipeDelete}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.name}`}>
                      <FontAwesome name="trash-o" size={20} color="#fff" />
                    </Pressable>
                  </Animated.View>
                );
              }}>
              <View style={styles.row} lightColor="transparent" darkColor="transparent">
                <View style={styles.rowMain}>
                  <FontAwesome name={section.icon} size={16} color={section.color} style={styles.leafIcon} />
                  <Text style={styles.itemName}>{toDisplayName(item.name)}</Text>
                </View>
              </View>
            </Swipeable>
          )}
        />
      )}

      <Modal visible={isAddOpen} transparent animationType="fade" onRequestClose={() => setIsAddOpen(false)}>
        <View style={styles.modalBackdrop} lightColor="rgba(0,0,0,0.5)" darkColor="rgba(0,0,0,0.65)">
          <View style={styles.modalCard} lightColor="#fff" darkColor="#18181b">
            <Text style={styles.modalTitle}>Add ingredient</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="e.g. garlic"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onSubmitAdd}
              placeholderTextColor={colorScheme === 'dark' ? '#71717a' : '#a1a1aa'}
              style={[
                styles.input,
                {
                  color: palette.text,
                  borderColor: colorScheme === 'dark' ? '#3f3f46' : '#e4e4e7',
                  backgroundColor: colorScheme === 'dark' ? '#09090b' : '#fff',
                },
              ]}
            />
            <View style={styles.modalActions} lightColor="transparent" darkColor="transparent">
              <Pressable onPress={() => setIsAddOpen(false)} style={styles.actionButton}>
                <Text style={{ color: '#71717a', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onSubmitAdd}
                disabled={!draftName.trim()}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.primaryAction,
                  {
                    backgroundColor: palette.tint,
                    opacity: !draftName.trim() ? 0.45 : pressed ? 0.85 : 1,
                  },
                ]}>
                <Text style={styles.primaryActionText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  list: {
    paddingBottom: 24,
  },
  sectionGap: {
    height: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  empty: {
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  swipeDelete: {
    backgroundColor: '#ef4444',
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  leafIcon: {
    marginRight: 10,
  },
  itemName: {
    fontSize: 17,
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  primaryAction: {
    minWidth: 72,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#fff',
    fontWeight: '700',
  },
});
