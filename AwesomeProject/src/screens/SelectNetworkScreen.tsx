import React, { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';

import { SelectNetworkScreenProps } from '../navigation/types';

const networks = [
  { name: 'BNB Chain', fee: '1.01', fiat: '$715.29' },
  { name: 'AVAX C-Chain', fee: '0.00001', fiat: '$0.00' },
  { name: 'Polygon', fee: '0.00001', fiat: '$0.00' },
  { name: 'Solana', fee: '0.00001', fiat: '$0.00' },
  { name: 'Ethereum', fee: '0.00001', fiat: '$0.00' },
  { name: 'opBNB', fee: '0.0014', fiat: '$71.29' },
];

const SelectNetworkScreen = ({ navigation, route }: SelectNetworkScreenProps) => {
  const { tokenSymbol } = route.params;
  const [q, setQ] = useState('');
  const list = useMemo(() => networks.filter(n => n.name.toLowerCase().includes(q.toLowerCase())), [q]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Select Network</Text>
        <Text style={styles.close}>×</Text>
      </View>

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search Networks"
        style={styles.search}
      />

      <FlatList
        data={list}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('ReceivingAddress', { tokenSymbol, network: item.name })}
          >
            <View style={styles.left}>
              <View style={styles.icon}><Text style={styles.iconText}>◎</Text></View>
              <View>
                <Text style={styles.symbol}>{item.name}</Text>
              </View>
            </View>
            <View style={styles.right}>
              <Text style={styles.fee}>{item.fee}</Text>
              <Text style={styles.fiat}>{item.fiat}</Text>
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
  search: { marginTop: 12, marginHorizontal: 16, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#eee', paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomColor: '#f5f5f5', borderBottomWidth: 1 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 14, color: '#999' },
  symbol: { fontSize: 14, color: '#222', fontWeight: '600' },
  right: { alignItems: 'flex-end' },
  fee: { fontSize: 12, color: '#222' },
  fiat: { fontSize: 12, color: '#777' },
});

export default SelectNetworkScreen;
