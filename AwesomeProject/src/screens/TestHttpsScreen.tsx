import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TextInput, TouchableOpacity, Switch } from 'react-native';

import { TestHttpsScreenProps } from '../navigation/types';

const TestHttpsScreen = ({ navigation }: TestHttpsScreenProps) => {
  const [url, setUrl] = useState('https://httpbin.org/post');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [useClientCert, setUseClientCert] = useState(true);
  const [certName, setCertName] = useState('client');
  const [keyName, setKeyName] = useState('client_key');
  const [passphrase, setPassphrase] = useState('password');

  const sendRequest = async () => {
    setLoading(true);
    setResult('');
    setError('');
    try {
      let json: any = null;
      let usedClientCert = false;
      try {
        const ssl = require('react-native-ssl-pinning');
        if (useClientCert && ssl?.fetch) {
          const res = await ssl.fetch(url, {
            method: 'POST',
            timeoutInterval: 30,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: 123 }),
            clientCert: { cert: certName, key: keyName, passphrase },
          });
          json = await res.json();
          usedClientCert = true;
        }
      } catch {}
      if (!json) {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 123 }),
        });
        json = await res.json();
      }
      setResult(JSON.stringify({ usedClientCert, data: json }, null, 2));
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Test HTTPS</Text>
        <Text style={styles.close}>×</Text>
      </View>

      <Text style={styles.label}>测试服务器 URL</Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://your-test-server.example/api"
        style={styles.input}
      />

      <View style={styles.row}>
        <Text style={styles.label}>使用客户端证书</Text>
        <Switch value={useClientCert} onValueChange={setUseClientCert} />
      </View>
      <View style={styles.rowInputs}>
        <View style={styles.flex1}>
          <Text style={styles.labelSmall}>证书文件名</Text>
          <TextInput value={certName} onChangeText={setCertName} style={styles.input} placeholder="client" />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.labelSmall}>私钥文件名</Text>
          <TextInput value={keyName} onChangeText={setKeyName} style={styles.input} placeholder="client_key" />
        </View>
      </View>
      <Text style={styles.labelSmall}>证书口令</Text>
      <TextInput value={passphrase} onChangeText={setPassphrase} style={styles.input} placeholder="password" secureTextEntry />

      <Text style={styles.hint}>请求体：{`{ test: 123 }`}</Text>
      <Text style={styles.hintSmall}>证书：启用时使用客户端证书进行双向TLS</Text>

      <TouchableOpacity onPress={sendRequest} style={[styles.sendBtn, loading && styles.sendBtnDisabled]} disabled={loading}>
        <Text style={styles.sendText}>{loading ? 'Sending…' : 'Send HTTPS POST'}</Text>
      </TouchableOpacity>

      {!!error && (
        <View style={[styles.box, styles.errorBox]}>
          <Text style={styles.boxTitle}>Error</Text>
          <Text style={styles.boxText}>{error}</Text>
        </View>
      )}

      {!!result && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Result</Text>
          <Text style={styles.boxText}>{result}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const red = '#e53935';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomColor: '#eee', borderBottomWidth: 1 },
  back: { fontSize: 18, color: '#333' },
  title: { fontSize: 16, fontWeight: '600', color: '#222' },
  close: { fontSize: 18, color: '#333' },
  label: { marginTop: 16, paddingHorizontal: 16, fontSize: 13, color: '#555' },
  labelSmall: { marginTop: 8, paddingHorizontal: 16, fontSize: 12, color: '#666' },
  input: { marginTop: 8, marginHorizontal: 16, height: 44, borderColor: '#ddd', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  hint: { marginTop: 12, paddingHorizontal: 16, fontSize: 12, color: '#666' },
  hintSmall: { marginTop: 4, paddingHorizontal: 16, fontSize: 11, color: '#999' },
  row: { marginTop: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowInputs: { marginTop: 8, flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  sendBtn: { marginTop: 16, marginHorizontal: 16, backgroundColor: red, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  box: { marginTop: 16, marginHorizontal: 16, borderColor: '#eee', borderWidth: 1, borderRadius: 8, padding: 12 },
  errorBox: { borderColor: '#f3c'},
  boxTitle: { fontSize: 13, color: '#333', marginBottom: 8, fontWeight: '600' },
  boxText: { fontSize: 12, color: '#444' },
});

export default TestHttpsScreen;
