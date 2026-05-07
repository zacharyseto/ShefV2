import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { FlatList, Image, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { usePantry } from '@/context/PantryContext';
import { useColorScheme } from '@/components/useColorScheme';

export default function PantryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { items, removeItem } = usePantry();

  return (
    <View style={styles.container}>
      <Text style={styles.lead}>
        Everything you have added from the Fridge tab shows up here. Tap the trash icon to remove an
        item.
      </Text>

      {items.length === 0 ? (
        <View style={styles.empty} lightColor="#f4f4f5" darkColor="#27272a">
          <FontAwesome name="shopping-basket" size={40} color={palette.tabIconDefault} />
          <Text style={styles.emptyTitle}>Pantry is empty</Text>
          <Text style={styles.emptySubtitle} lightColor="#52525b" darkColor="#a1a1aa">
            Add ingredients from the Fridge tab to build your list.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} lightColor="#e4e4e7" darkColor="#3f3f46" />}
          renderItem={({ item }) => (
            <View style={styles.row} lightColor="transparent" darkColor="transparent">
              <View style={styles.rowMain}>
                {item.sourceImageUri ? (
                  <Image source={{ uri: item.sourceImageUri }} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbPlaceholder} lightColor="#e4e4e7" darkColor="#3f3f46">
                    <FontAwesome name="leaf" size={18} color={palette.tint} />
                  </View>
                )}
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <Pressable
                onPress={() => removeItem(item.id)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  lead: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  list: {
    paddingBottom: 24,
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
    paddingVertical: 12,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  thumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 17,
    flex: 1,
  },
});
