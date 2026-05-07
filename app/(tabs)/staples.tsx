import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { usePantry } from '@/context/PantryContext';
import { useColorScheme } from '@/components/useColorScheme';

export default function StaplesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { stapleItems, addStapleItem, removeStapleItem } = usePantry();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draftName, setDraftName] = useState('');

  function onSubmitAdd() {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    addStapleItem(trimmed);
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
              accessibilityLabel="Add staple"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <FontAwesome name="plus" size={22} color={palette.tint} />
            </Pressable>
          ),
        }}
      />
      {stapleItems.length === 0 ? (
        <View style={styles.empty} lightColor="#f4f4f5" darkColor="#27272a">
          <FontAwesome name="archive" size={40} color={palette.tabIconDefault} />
          <Text style={styles.emptyTitle}>No staples yet</Text>
          <Text style={styles.emptySubtitle} lightColor="#52525b" darkColor="#a1a1aa">
            Add long-term pantry items like rice, pasta, and olive oil.
          </Text>
        </View>
      ) : (
        <FlatList
          data={stapleItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} lightColor="#e4e4e7" darkColor="#3f3f46" />}
          renderItem={({ item }) => (
            <View style={styles.row} lightColor="transparent" darkColor="transparent">
              <View style={styles.rowMain}>
                <FontAwesome name="archive" size={16} color={palette.tint} style={styles.rowIcon} />
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <Pressable
                onPress={() => removeStapleItem(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.name}`}
                hitSlop={12}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                <FontAwesome name="trash-o" size={22} color="#ef4444" />
              </Pressable>
            </View>
          )}
        />
      )}

      <Modal visible={isAddOpen} transparent animationType="fade" onRequestClose={() => setIsAddOpen(false)}>
        <View style={styles.modalBackdrop} lightColor="rgba(0,0,0,0.5)" darkColor="rgba(0,0,0,0.65)">
          <View style={styles.modalCard} lightColor="#fff" darkColor="#18181b">
            <Text style={styles.modalTitle}>Add staple</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="e.g. olive oil"
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
  container: { flex: 1, padding: 20 },
  list: { paddingBottom: 24 },
  empty: { borderRadius: 12, padding: 28, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  sep: { height: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  rowIcon: { marginRight: 10 },
  itemName: { fontSize: 17, flex: 1 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalActions: { marginTop: 14, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  actionButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  primaryAction: { minWidth: 72, alignItems: 'center' },
  primaryActionText: { color: '#fff', fontWeight: '700' },
});
