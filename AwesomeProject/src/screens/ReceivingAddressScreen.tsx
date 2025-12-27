import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';

import { ReceivingAddressScreenProps } from '../navigation/types';

const wallets = [
  { name: 'Binance Deposit Address', address: '0xBinanceDeposit...abcd', icon: '🟡' },
  { name: 'Wallet1', address: '0xSeedPhrase...1234', icon: '🐷', tag: 'Seed Phrase' },
];

const ReceivingAddressScreen = ({ navigation, route }: ReceivingAddressScreenProps) => {
  const { tokenSymbol, network } = route.params;
  const [to, setTo] = useState('');
  const [memo, setMemo] = useState('');

  const onConfirm = () => {
    navigation.navigate('InputAmount', { tokenSymbol, network, to, memo });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Receiving Address</Text>
        <Text style={styles.close}>×</Text>
      </View>

      <Text style={styles.toLabel}>To</Text>
      <View style={styles.toBox}>
        <Text style={styles.toPrefix}>🏦 Binance Deposit Address</Text>
        <TextInput
          value={to}
          onChangeText={setTo}
          placeholder="输入或粘贴接收地址"
          style={styles.toInput}
        />
        {to.length > 0 && (
          <TouchableOpacity onPress={() => setTo('')} style={styles.clearBtn}><Text style={styles.clearText}>×</Text></TouchableOpacity>
        )}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setTo('0x7c96f97900097c9')}>
          <Text style={styles.actionText}>Paste</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { /* 预留扫码 */ }}>
          <Text style={styles.actionText}>Scan</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.memoLabel}>Memo (Optional)</Text>
      <TextInput
        value={memo}
        onChangeText={setMemo}
        placeholder="7c96f97900097c9"
        style={styles.memoInput}
      />

      <Text style={styles.walletTitle}>My Wallet</Text>
      <FlatList
        data={wallets}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.walletRow} onPress={() => setTo(item.address)}>
            <View style={styles.walletLeft}>
              <Text style={styles.walletIcon}>{item.icon}</Text>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.walletName}>{item.name}</Text>
                  {item.tag ? <Text style={styles.walletTag}>{item.tag}</Text> : null}
                </View>
                <Text style={styles.walletAddr}>{item.address}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        disabled={!to}
        onPress={onConfirm}
        style={[styles.confirmBtn, !to && styles.confirmDisabled]}
      >
        <Text style={styles.confirmText}>Confirm</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const red = '#e53935';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  back: { fontSize: 18, color: '#333' },
  title: { fontSize: 18, fontWeight: '600', color: '#222' },
  close: { fontSize: 18, color: '#333' },
  toLabel: { fontSize: 13, color: '#666', paddingHorizontal: 16, marginTop: 6 },
  toBox: { marginTop: 6, marginHorizontal: 16, borderRadius: 12, backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#eee', padding: 12 },
  toPrefix: { fontSize: 12, color: '#333', marginBottom: 6 },
  toInput: { fontSize: 14, color: '#222' },
  clearBtn: { position: 'absolute', right: 8, top: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 18, color: '#999' },
  actionRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 8 },
  actionBtn: { borderWidth: 1, borderColor: red, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  actionText: { color: red, fontSize: 12, fontWeight: '600' },
  memoLabel: { fontSize: 13, color: '#666', paddingHorizontal: 16, marginTop: 12 },
  memoInput: { marginHorizontal: 16, marginTop: 6, height: 44, borderWidth: 1, borderColor: '#eee', borderRadius: 8, paddingHorizontal: 10, backgroundColor: '#fafafa', color: '#222' },
  walletTitle: { fontSize: 14, fontWeight: '600', color: '#222', paddingHorizontal: 16, marginTop: 16 },
  walletRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletIcon: { fontSize: 20 },
  walletName: { fontSize: 14, color: '#222', fontWeight: '600' },
  walletTag: { fontSize: 10, color: '#777', borderWidth: 1, borderColor: '#eee', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  walletAddr: { fontSize: 12, color: '#777' },
  confirmBtn: { position: 'absolute', left: 16, right: 16, bottom: 16, height: 48, borderRadius: 24, backgroundColor: red, alignItems: 'center', justifyContent: 'center' },
  confirmDisabled: { backgroundColor: '#f1e0e0' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default ReceivingAddressScreen;