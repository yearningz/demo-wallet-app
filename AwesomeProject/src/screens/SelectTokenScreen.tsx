import React, { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';

import { SelectTokenScreenProps } from '../navigation/types';

const tokens = [
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDT', name: 'Tether USD' },
  { symbol: 'POL', name: 'Polygon' },
];

const SelectTokenScreen = ({ navigation }: SelectTokenScreenProps) => {
  const [q, setQ] = useState('');
  const list = useMemo(() => tokens.filter(t => (t.symbol + t.name).toLowerCase().includes(q.toLowerCase())), [q]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Select Token</Text>
        <Text style={styles.close}>×</Text>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountBadge}>Wallet 01</Text>
        <Text style={styles.accountType}>Seed Phrase</Text>
      </View>

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search symbol, contract address"
        style={styles.search}
      />

      <FlatList
        data={list}
        keyExtractor={(item) => item.symbol}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('SelectNetwork', { tokenSymbol: item.symbol })}>
            <View style={styles.left}>
              <View style={styles.icon}><Text style={styles.iconText}>◎</Text></View>
              <View>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.name}>{item.name}</Text>
              </View>
            </View>
            <View style={styles.right}>
              <Text style={styles.balanceMask}>******</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomColor: '#eee', borderBottomWidth: 1 },
  back: { fontSize: 18, color: '#333' },
  title: { fontSize: 16, fontWeight: '600', color: '#222' },
  close: { fontSize: 18, color: '#333' },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  accountBadge: { fontSize: 12, color: '#222', borderWidth: 1, borderColor: '#eee', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  accountType: { fontSize: 10, color: '#777', borderWidth: 1, borderColor: '#eee', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  search: { marginTop: 12, marginHorizontal: 16, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#eee', paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomColor: '#f5f5f5', borderBottomWidth: 1 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 14, color: '#999' },
  symbol: { fontSize: 14, color: '#222', fontWeight: '600' },
  name: { fontSize: 12, color: '#777' },
  right: { alignItems: 'flex-end' },
  balanceMask: { fontSize: 12, color: '#333' },
});

export default SelectTokenScreen;
