import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, PermissionsAndroid, Platform, TouchableOpacity } from 'react-native';
import { QrScanScreenProps } from '../navigation/types';

import { Camera, CameraType } from 'react-native-camera-kit';

const QrScanScreen = ({ navigation }: QrScanScreenProps) => {
  const [hasPermission, setHasPermission] = useState<boolean>(Platform.OS === 'ios');
  const [ready, setReady] = useState<boolean>(false);

  const [scanned, setScanned] = useState<boolean>(false);
  const onReadCode = useCallback((_text: string) => {
    if (scanned) return;
    setScanned(true);
    console.warn(_text);
    navigation.navigate('Payment', { scanText: _text });
  }, [navigation, scanned]);

  useEffect(() => {
    const ensureCameraPermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      }
    };
    ensureCameraPermission().finally(() => setReady(true));
  }, []);

  const cameraAvailable = !!Camera;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>扫码</Text>
      </View>
      {!ready && (
        <View style={styles.body}><Text style={styles.hint}>初始化摄像头中…</Text></View>
      )}
      {ready && hasPermission && cameraAvailable && (
        <Camera
          style={{ flex: 1 }}
          scanBarcode={true}
          // 设置正方形扫描框
          showFrame={true}
          barcodeFrameSize={{ width: 240, height: 240 }}
          // 降低多次触发概率
          scanThrottleDelay={1000}
          onReadCode={(event: { nativeEvent: { codeStringValue: string } }) =>
            onReadCode(event.nativeEvent.codeStringValue)
          }
          laserColor="grey"
          frameColor="white"
          cameraType={CameraType.Back}
        />
      )}
      {ready && hasPermission && !cameraAvailable && (
        <View style={styles.body}>
          <Text style={styles.hint}>摄像头组件未加载，请尝试重新安装或重启应用</Text>
          <Text style={styles.hintSmall}>包：react-native-camera-kit 已安装且需要原生链接</Text>
        </View>
      )}
      {ready && !hasPermission && (
        <View style={styles.body}>
          <Text style={styles.hint}>需要摄像头权限以完成扫码</Text>
          {Platform.OS === 'android' && (
            <TouchableOpacity
              style={styles.btn}
              onPress={async () => {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
                setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
              }}
            >
              <Text style={styles.btnText}>重新申请权限</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  backBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: '#333' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { color: '#fff', fontSize: 16, marginBottom: 8 },
  hintSmall: { color: '#bbb', fontSize: 13 },
  btn: { marginTop: 16, backgroundColor: '#bbb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 15 },
});

export default QrScanScreen;
