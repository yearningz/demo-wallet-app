import React, { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { InputAmountScreenProps } from '../navigation/types';

const keypad = [['1','2','3'], ['4','5','6'], ['7','8','9'], ['.','0','⌫']];

const InputAmountScreen = ({ navigation, route }: InputAmountScreenProps) => {
  const { tokenSymbol, network, to, memo } = route.params;
  const [amount, setAmount] = useState('');
  const min = '0.0000003';

  const onKey = (k: string) => {
    if (k === '⌫') {
      setAmount((a) => a.slice(0, -1));
      return;
    }
    if (k === '.') {
      setAmount((a) => (a.includes('.') ? a : (a || '0') + '.'));
      return;
    }
    setAmount((a) => (a === '0' ? k : a + k));
  };

  const canContinue = useMemo(() => {
    const v = parseFloat(amount || '0');
    return v >= parseFloat(min);
  }, [amount]);

  const onContinue = () => {
    if (!canContinue) return;
    navigation.navigate('Payment', { tokenSymbol, network, to, memo, amount });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Send {tokenSymbol}</Text>
        <Text style={styles.close}>×</Text>
      </View>

      <View style={styles.amountBlock}>
        <Text style={styles.minLabel}>Min {min}</Text>
        <Text style={styles.fiat}>≈$0</Text>
      </View>

      <View style={styles.balanceBox}>
        <Text style={styles.balanceLabel}>Balance</Text>
        <Text style={styles.balanceValue}>******</Text>
        <TouchableOpacity onPress={() => setAmount('100')}><Text style={styles.maxBtn}>Max</Text></TouchableOpacity>
      </View>

      <View style={styles.keypad}>
        {keypad.map((row, i) => (
          <View key={i} style={styles.keyRow}>
            {row.map((k) => (
              <TouchableOpacity key={k} style={styles.key} onPress={() => onKey(k)}>
                <Text style={styles.keyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <TouchableOpacity
        disabled={!canContinue}
        onPress={onContinue}
        style={[styles.continueBtn, !canContinue && styles.continueDisabled]}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const red = '#e53935';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  back: { fontSize: 18, color: '#333' },
  title: { fontSize: 16, fontWeight: '600', color: '#222' },
  close: { fontSize: 18, color: '#333' },
  amountBlock: { alignItems: 'center', marginTop: 16 },
  minLabel: { fontSize: 24, color: '#9aa0a6', fontWeight: '700' },
  fiat: { marginTop: 6, fontSize: 12, color: '#9aa0a6' },
  balanceBox: { marginTop: 20, marginHorizontal: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { fontSize: 12, color: '#777' },
  balanceValue: { fontSize: 12, color: '#777' },
  maxBtn: { fontSize: 12, color: red, fontWeight: '600' },
  keypad: { marginTop: 20, paddingHorizontal: 16 },
  keyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  key: { width: '30%', height: 52, borderRadius: 12, backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 20, color: '#333' },
  continueBtn: { position: 'absolute', left: 16, right: 16, bottom: 16, height: 48, borderRadius: 24, backgroundColor: red, alignItems: 'center', justifyContent: 'center' },
  continueDisabled: { backgroundColor: '#f1e0e0' },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default InputAmountScreen;
