import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  InteractionManager,
} from 'react-native';

import { PaymentScreenProps } from '../navigation/types';
import { Keyboard } from 'react-native';


const maskToken = (s: string) => {
  if (!s) return '****';
  const head = s.slice(0, 6);
  const tail = s.slice(-4);
  return `${head}****${tail}`;
};

const stableDefault: string[] = [];

const PaymentScreen = ({ navigation, route }: PaymentScreenProps) => {
  const initialAmount = route?.params && (route.params as any).amount ? String((route.params as any).amount) : '';
  const [amount, setAmount] = useState(initialAmount);
  const [agreed, setAgreed] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [selectingCard, setSelectingCard] = useState(false);
  const [selectingTokenSymbol, setSelectingTokenSymbol] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState('');
  const [selectedStable, setSelectedStable] = useState('');
  const [stableOpen, setStableOpen] = useState(false);
  const [stableOptions, setStableOptions] = useState<string[]>(stableDefault);
  const [gasFee, setGasFee] = useState('');
  const [productPrice, setProductPrice] = useState<number>(0);
  const [totalPay, setTotalPay] = useState<string>('');
  const [txn, setTxn] = useState<any | null>(null);
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnError, setTxnError] = useState('');
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [factor, setFactor] = useState<any | null>(null);
  const [factorLoading, setFactorLoading] = useState(false);
  const [factorError, setFactorError] = useState('');
  const [showPasswordScreen, setShowPasswordScreen] = useState(false);
  const [preAuthInfo, setPreAuthInfo] = useState<any | null>(null);
  const [preAuthLoading, setPreAuthLoading] = useState(false);
  const [preAuthError, setPreAuthError] = useState('');
  const [preAuthSheetVisible, setPreAuthSheetVisible] = useState(false);
  const [preAuthSuccessVisible, setPreAuthSuccessVisible] = useState(false);
  const passwordInputRef = useRef<any>(null);
  const [lockSheets, setLockSheets] = useState(false);
  const tokenSymbol = route?.params?.tokenSymbol;
  const network = route?.params?.network;
  const to = (route?.params as any)?.to as string | undefined;
  const memo = (route?.params as any)?.memo as string | undefined;
  const scanText = (route?.params as any)?.scanText as string | undefined;
  const [payPassword, setPayPassword] = useState('');
// 支付状态：idle | paying | success | timeout
  const [payStatus, setPayStatus] = useState<'idle' | 'loading' | 'success' | 'timeout'>('idle');

  const address = to ?? '';
  const maskAddress = (addr: string) => {
    if (!addr || addr.length <= 12) return addr;
    const head = addr.slice(0, 6);
    const tail = addr.slice(-6);
    return `${head}******${tail}`;
  };
  const formatTimestamp = (ts: any) => {
    const n = Number(ts);
    if (!n || Number.isNaN(n)) return '-';
    const d = new Date(n * 1000);
    const pad = (x: number) => String(x).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${y}-${m}-${dd} ${hh}:${mm}:${ss}`;
  };
  const parseScanText = (s?: string) => {
    if (!s) return null;
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    console.warn('start', start, 'end', end);
    if (start >= 0 && end > start) {
      const jsonStr = s.slice(start, end + 1);
      console.warn('jsonStr', jsonStr);
      try {
        const obj = JSON.parse(jsonStr);
        if (obj && typeof obj === 'object') return obj;
      } catch {}
    }
    return null;
  };

  useEffect(() => {
    console.warn('scanText', scanText);
    (async () => {
      try {
        setCardsLoading(true);
        setCardsError('');
        const res = await fetch('http://172.20.10.6:8088/api/v1/posTransaction/queryCards?userId=03572638', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const json = await res.json();
        const data = Array.isArray(json?.data) ? json.data : [];
        console.warn('data', data);
        const mapped = data.map((c: any, idx: number) => ({
          id: String(c?.id ?? idx),
          name: c?.cardType === 'S' ? '稳定币账户' : (c?.issuingInstitution || '银行卡'),
          pan: String(c?.primaryAccountNumber || ''),
          type: c?.cardType === 'S' ? 'stable' : 'bank',
          balances: c?.balanceInfos || [],
        }));
        setCards(mapped);
        if (!selectedCardId && mapped.length > 0) {
          setSelectedCardId(mapped[0].id);
          setSelectingTokenSymbol(mapped[0].balances?.[0]?.tokenSymbol || '');
        }
      } catch (e: any) {
        setCardsError(String(e?.message || e));
      } finally {
        setCardsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const obj = parseScanText(scanText);
    console.warn('obj', obj);
    if (obj && typeof obj === 'object') {
      setFactor((prev: any) => ({
        ...(prev || {}),
        merchantId: obj.merchantId ?? (prev || {}).merchantId,
        terminalId: obj.terminalId ?? (prev || {}).terminalId,
        referenceNumber: obj.referenceNumber ?? (prev || {}).referenceNumber,
        transactionAmount: obj.transactionAmount != null ? Number(obj.transactionAmount) : (prev || {}).transactionAmount,
        transactionType: obj.transactionType ?? (prev || {}).transactionType,
      }));
      //1.4不从交易要素获取商品价格
      const amt = obj.transactionAmount != null ? Number(obj.transactionAmount) : 0;
      setProductPrice(amt.toFixed(4) as unknown as number);
      // 预授权检查移至“确认付款”点击后执行
      // const total = (amt + Number(gasFee || 0)).toFixed(4);
      //     const total =
      // Number.isFinite(Number(amt))
      //   ? (Number(amt) + Number(gasFee || 0)).toFixed(4)
      //   : '0.0000';
      //     setTotalPay(total ? String(total) : '');
    }
  }, [scanText]);

  useEffect(() => {
    const price = Number(productPrice);
    const gas = Number(gasFee);

    if (!Number.isFinite(price) || !Number.isFinite(gas)) {
      setTotalPay('计算中…');
      return;
    }

    setTotalPay((price + gas).toFixed(4));
  }, [productPrice, gasFee]);


  const fetchTransFactor = useCallback(async () => {
    try {
      setFactorLoading(true);
      setFactorError('');
      const res = await fetch('http://172.20.10.6:8088/api/v1/posTransaction/queryTransFactor?primaryAccountNumber=625807******4153', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      const list: any[] = Array.isArray(json?.data) ? json.data : [];
      if (list.length === 0) {
        // 防御：接口正常但无数据
        setFactor(null);
        setStableOptions([]);
        setSelectedStable('');
        return;
      }
      const first = list[0];
      setFactor((prev: any) => ({
        ...(prev || {}),
        ...first,
      }));
      // setGasFee(data?.gasCost != null ? String(data.gasCost) : '');
      setProductPrice(prev => prev); // 交易金额仍来自 scanText
      // setTotalPay(prev => prev);
    } catch (e: any) {
      setFactorError(String(e?.message || e));
    } finally {
      setFactorLoading(false);
    }
  }, [scanText]);

  const fetchGasCost = useCallback(async () => {
  try {
    setGasFee('计算中…');
    const res = await fetch(
      'http://172.20.10.6:8088/api/v1/posTransaction/queryGasCost',
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const json = await res.json();

      const gas = json?.data != null ? Number(json.data) : 0;
      setGasFee(String(gas));

    } catch (e) {
      console.warn('fetchGasCost error', e);
      setGasFee('');
    }
  }, []);

  useEffect(() => {
    if (showPasswordScreen) {
      fetchGasCost();
    }
  }, [showPasswordScreen, fetchGasCost]);

  useEffect(() => {
    if (showPasswordScreen) {
      setPayPassword('');
      const task = InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          passwordInputRef.current?.focus?.();
        });
      });
      return () => {
        task.cancel();
      };
    }
  }, [showPasswordScreen]);
  useEffect(() => {
    if (showPasswordScreen) {
      passwordInputRef.current?.focus?.();
    }
  }, [showPasswordScreen]);

  useEffect(() => {
    fetchTransFactor();
  }, [fetchTransFactor]);

  return (
    <View style={styles.overlay}>
      {!lockSheets && !showPasswordScreen && !successVisible && !selectingCard && !preAuthSheetVisible && !preAuthSuccessVisible && (
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpBtn}>
              <Text style={styles.helpText}>?</Text>
            </TouchableOpacity>
          </View>

          {factorLoading && <Text style={styles.sectionDesc}>正在获取交易要素…</Text>}
          {!!factorError && <Text style={styles.sectionDesc}>错误：{factorError}</Text>}

          {/* <View style={styles.amountBlock}>
          <Text style={styles.currency}>$</Text>
               <Text style={styles.amount}>{factor?.transactionAmount != null ? `${String(factor?.transactionAmount)}`  : ''}</Text>
        </View> */}

          <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
            <View style={styles.sectionRow}><Text style={styles.sectionTitle}>商户号</Text><Text style={styles.sectionValue}>{factor?.merchantId ?? '-'}</Text></View>
            <View style={styles.sectionRow}><Text style={styles.sectionTitle}>终端号</Text><Text style={styles.sectionValue}>{factor?.terminalId ?? '-'}</Text></View>
            {/* <View style={styles.sectionRow}><Text style={styles.sectionTitle}>交易金额</Text><Text style={styles.sectionValue}>{factor?.transactionAmount != null ? `$${String(factor?.transactionAmount)}` : '-'}</Text></View> */}
            <View style={styles.sectionRow}><Text style={styles.sectionTitle}>订单号</Text><Text style={styles.sectionValue}>{factor?.referenceNumber ?? '-'}</Text></View>
            {factor?.transactionType != '预授权' ? (
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>商品价格</Text><Text style={styles.sectionValue}>{productPrice ? `$${productPrice}` : ''}</Text></View>
            ) :   <View style={styles.sectionRow}><Text style={styles.sectionTitle}>授权金额</Text><Text style={styles.sectionValue}>{productPrice ? `$${productPrice}` : ''}</Text></View>}
          
            {factor?.transactionType === '预授权' && (
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>订单类型</Text><Text style={styles.sectionValue}>预授权</Text></View>
            )}

          </View>

          {/* 账户安全地址 */}
          {/* <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>链上账户地址</Text>
          <View style={styles.addrRight}>
            <Text style={styles.sectionValue}>{maskAddress(factor?.blockchainAddress ?? '')}</Text>
            <View style={styles.safeBadge}><Text style={styles.safeText}>✓</Text></View>
          </View>
        </View> */}

          {/* 稳定币选择 */}
          {/* <Pressable style={styles.sectionRow} onPress={() => setStableOpen((v) => !v)}>
          <Text style={styles.sectionTitle}>稳定币</Text>
          <Text style={styles.sectionValue}>{selectedStable} ▾</Text>
        </Pressable>
        {stableOpen && (
          <View style={styles.dropdown}>
            {stableOptions.map((c) => (
              <TouchableOpacity key={c} style={styles.dropdownItem} onPress={() => { setSelectedStable(c); setStableOpen(false); }}>
                <Text style={[styles.dropdownText, selectedStable === c && styles.dropdownTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )} */}

          {/* 商品价格与费用 */}
          {/* <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>商品价格</Text>
          <Text style={styles.sectionValue}>{productPrice ? `$${productPrice}` : ''}</Text>
        </View>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Gas费</Text>
          <View style={styles.gasRight}>
            <Text style={styles.sectionValue}>{gasFee ? `$${gasFee}` : ''}</Text>
          </View>
        </View>
        <Text style={styles.tipText}>费用根据以网络拥堵情况计算，最终扣费以实际打包成交价为准。</Text>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>实际支付</Text>
          <Text style={styles.sectionValue}>{totalPay ? `$${totalPay}` : ''}</Text>
        </View>*/}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>网络类型</Text>
          <Text style={styles.sectionValue}>以太网</Text>
        </View>

          <TouchableOpacity style={styles.sectionRow} onPress={() => setSelectingCard(true)}>
            <Text style={styles.sectionTitle}>支付方式</Text>
            <View style={styles.payMethodRight}>
              <Text
                style={styles.payMethodText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {(() => {
                  const c = cards.find((x) => x.id === selectedCardId);
                  return `${c?.name ?? '银行卡'} [${maskToken(c?.pan || '')}]`;
                })()}
              </Text>
            </View>
          </TouchableOpacity>

          {(selectingTokenSymbol) && (
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>币种</Text>
              <Text style={styles.sectionValue}>{selectingTokenSymbol ?? '-'} </Text>
            </View>
          )}

          {to && (
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>接收地址</Text>
              <Text style={styles.sectionValue}>{to}</Text>
            </View>
          )}

          {/* {memo && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Memo</Text>
            <Text style={styles.sectionValue}>{memo}</Text>
          </View>
        )} */}

          <View style={styles.agreeRow}>
            <Pressable
              onPress={() => setAgreed((v) => !v)}
              style={[styles.checkbox, agreed && styles.checkboxChecked]}
            >
              {agreed ? <Text style={styles.checkboxTick}>✓</Text> : null}
            </Pressable>
            <Text style={styles.agreeText}>我已阅读并同意相关协议</Text>
          </View>

          <TouchableOpacity
            disabled={!agreed}
            onPress={() => {
              // setSuccessVisible(true);
              // setTxnLoading(true);
              // setTxnError('');
              // (async () => {
              //   let ac: AbortController | undefined;
              //   let tid: any;
              //   try {
              //     ac = new AbortController();
              //     tid = setTimeout(() => ac?.abort(), 30000);
              //     const res = await fetch('http://172.20.10.6:8088/api/v1/posTransaction/QRcodeConsumeActiveScan', {
              //       method: 'POST',
              //       headers: { 'Content-Type': 'application/json' },
              //       body: JSON.stringify({
              //         primaryAccountNumber: '6258071001604153',
              //         transactionAmount: String(factor?.transactionAmount ?? amount ?? ''),
              //         terminalId: String(factor?.terminalId ?? ''),
              //         merchantId: String(factor?.merchantId ?? ''),
              //         referenceNumber: String(factor?.referenceNumber ?? ''),
              //       }),
              //       signal: ac.signal,
              //     });
              //     const json = await res.json();
              //     console.warn('json', json);
              //     const d = json?.data ?? {};
              //     const mapped = {
              //       txHash: String(d?.txHash ?? ''),
              //       status: String(d?.status ?? ''),
              //       blockNumber: String(d?.blockNumber ?? ''),
              //       timestamp: String(d?.timestamp ?? ''),
              //       fromAddress: String(d?.fromAddress ?? ''),
              //       toAddress: String(d?.toAddress ?? ''),
              //       gasUsed: String(d?.gasUsed ?? ''),
              //       gasPrice: String(d?.gasPrice ?? ''),
              //       gasCost: String(d?.gasCost ?? ''),
              //       inputData: String(d?.inputData ?? ''),
              //       functionName: String(d?.functionName ?? ''),
              //       events: Array.isArray(d?.events) ? d.events : [],
              //       tokenTransfers: Array.isArray(d?.tokenTransfers) ? d.tokenTransfers : [],
              //       merchantId: String(d?.merchantId ?? ''),
              //       terminalId: String(d?.terminalId ?? ''),
              //       referenceNumber: String(d?.referenceNumber ?? ''),
              //       transactionAmount: String(d?.transactionAmount ?? ''),
              //       statusCode: String(json?.statusCode ?? ''),
              //       msg: String(json?.msg ?? ''),
              //       totalPay: String((Number(d?.transactionAmount ?? 0) + Number(d?.gasCost ?? 0))),
              //     } as any;
              //     setTxn(mapped);
              //   } catch (e: any) {
              //     setTxnError(String(e?.message || e));
              //   } finally {
              //     if (tid) clearTimeout(tid);
              //     setTxnLoading(false);
              //   }
              // })();
              const isPreAuth = String(factor?.transactionType) === '预授权';
              if (!isPreAuth) {
                setShowPasswordScreen(true);
                return;
              }
              (async () => {
                try {
                  setPreAuthLoading(true);
                  setPreAuthError('');
                  const res = await fetch('http://172.20.10.6:8088/api/v1/preAuth/checkPreAuth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      primaryAccountNumber: '625807******4153',
                      tokenSymbol: selectingTokenSymbol || '',
                      userId: '03572638',
                    }),
                  });
                  const json = await res.json();
                  setPreAuthInfo(json?.data ?? null);
                  if (json?.statusCode === '00' && json?.data?.approved === true) {
                    setShowPasswordScreen(true);
                  } else {
                    setPreAuthSheetVisible(true);
                  }
                } catch (e: any) {
                  setPreAuthError(String(e?.message || e));
                } finally {
                  setPreAuthLoading(false);
                }
              })();
            }}
            style={[styles.payBtn, !agreed && styles.payBtnDisabled]}
          >
            <Text style={styles.payBtnText}>{String(factor?.transactionType) === '预授权' ? '确认授权' : '确认付款'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {!lockSheets && !successVisible && selectingCard && !preAuthSheetVisible && !preAuthSuccessVisible && (
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setSelectingCard(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>选择付款方式</Text>
          </View>

          <View style={styles.cardList}>
            {cards.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.cardItem}
                onPress={() => {
                  setSelectedCardId(c.id);
                  setSelectingTokenSymbol(c.balances?.[0]?.tokenSymbol || '');
                  setSelectingCard(false);
                }}
              >
                <View style={styles.cardThumb} />
                <View style={styles.cardMiddle}>
                  <Text style={styles.cardName}>{(c as any).name} [{maskToken((c as any).pan)}]</Text>
                  {/* 显示余额信息 */}
                  {c.balances.length > 0 ? (
                    c.balances.map((balanceInfo: any, idx: number) => (
                      <Text key={idx} style={styles.cardBalance}>
                        {balanceInfo.tokenSymbol}: {balanceInfo.balance}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.cardBalance}>无余额信息</Text>
                  )}
                </View>
                {selectedCardId === c.id ? (
                  <Text style={styles.selectedBadge}>✓</Text>
                ) : (
                  <View style={styles.unselectedDot} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      {!successVisible && preAuthSheetVisible && !preAuthSuccessVisible && (
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => { setPreAuthSheetVisible(false); setLockSheets(true); navigation.goBack(); }} style={styles.closeBtn}>
              <Text style={styles.closeText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>预授权</Text>
          </View>
          <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
            <View style={[styles.sectionRow, styles.sectionRowWrap]}>
              <Text style={styles.sectionTitle}>付款人地址</Text>
              <Text style={styles.sectionValue}>{preAuthInfo?.payerAddress ?? '-'}</Text>
            </View>
            <View style={[styles.sectionRow, styles.sectionRowWrap]}>
              <Text style={styles.sectionTitle}>代币</Text>
              <Text style={styles.sectionValue}>{preAuthInfo?.tokenSymbol ?? '-'}</Text>
            </View>
            <View style={[styles.sectionRow, styles.sectionRowWrap]}>
              <Text style={styles.sectionTitle}>代币合约地址</Text>
              <Text style={styles.sectionValue}>{preAuthInfo?.tokenAddress ?? '-'}</Text>       
            </View>
            <View style={[styles.sectionRow, styles.sectionRowWrap]}>
              <Text style={styles.sectionTitle}>Permit2合约地址</Text>
              <Text style={styles.sectionValue}>{preAuthInfo?.permit2Address ?? '-'}</Text>
            </View>
          </View>
          <TouchableOpacity
            disabled={preAuthLoading}
            style={[styles.payBtn, preAuthLoading && { opacity: 0.6 }]}
            onPress={() => {
              (async () => {
                try {
                  setPreAuthLoading(true);
                  const res = await fetch('http://172.20.10.6:8088/api/v1/preAuth/applyPreAuth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      primaryAccountNumber: '625807******4153',
                      tokenSymbol: selectingTokenSymbol || preAuthInfo?.tokenSymbol || '',
                      userId: '03572638',
                    }),
                  });
                  const json = await res.json();
                  if (json?.statusCode === '00') {
                    setPreAuthInfo((prev: any) => ({ ...(prev || {}), ...(json?.data || {}), approved: true }));
                    setPreAuthSheetVisible(false);
                    setPreAuthSuccessVisible(true);
                  } else {
                    Alert.alert('失败', json?.statusMsg || '授权失败');
                  }
                } catch (e: any) {
                  Alert.alert('错误', e?.message || '网络请求失败');
                } finally {
                  setPreAuthLoading(false);
                }
              })();
            }}
          >
            {preAuthLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>确定授权</Text>}
          </TouchableOpacity>
        </View>
      )}
      {!lockSheets && !successVisible && preAuthSuccessVisible && (
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setPreAuthSuccessVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>预授权已开通</Text>
          </View>
          <View style={{ alignSelf: 'stretch', marginTop: 8 }}>  
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>链上交易哈希</Text>
              <Text style={styles.sectionValue}>{preAuthInfo?.txHash ?? '-'}</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>区块号</Text>
              <Text style={styles.sectionValue}>{preAuthInfo?.blockNumber ?? '-'}</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>区块时间戳</Text>
              <Text style={styles.sectionValue}>{formatTimestamp(preAuthInfo?.timestamp)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.payBtn, { marginTop: 30, alignSelf: 'stretch' }]}
            onPress={() => {
              setPreAuthSuccessVisible(false);
              setShowPasswordScreen(true);
            }}
          >
            <Text style={styles.payBtnText}>完成</Text>
          </TouchableOpacity>
        </View>
      )}
      {showPasswordScreen && (
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setShowPasswordScreen(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>输入支付密码</Text>
          </View>

          {/* Display Product Price and Gas Fee */}
          <View style={styles.sectionRow}><Text style={styles.sectionTitle}>商品价格</Text><Text style={styles.sectionValue}>{productPrice ? `$${productPrice}` : ''}</Text></View>
          <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Gas费</Text><Text style={styles.sectionValue}>{gasFee ? `$${gasFee}` : ''}</Text></View>
          <View style={styles.sectionRow}><Text style={styles.sectionTitle}>实际支付</Text><Text style={styles.sectionValue}>{totalPay ? `$${totalPay}` : ''}</Text></View>

          {/* Password Input */}
          <Pressable style={styles.pwdContainer} onPress={() => passwordInputRef.current?.focus?.()}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.pwdBox}>
                <Text style={styles.pwdDot}>
                  {payPassword.length > i ? '●' : ''}
                </Text>
              </View>
            ))}

            {/* 真正接收输入的隐藏输入框 */}
            <TextInput
              ref={passwordInputRef}
              value={payPassword}
              onChangeText={(v) => {
                const digits = String(v).replace(/\D/g, '').slice(0, 6);
                setPayPassword(digits);
              }}
              keyboardType="number-pad"
              secureTextEntry
              caretHidden
              maxLength={6}
              style={styles.hiddenInput}
              autoFocus
            />
          </Pressable>

          <TouchableOpacity
            onPress={() => {
              // Handle payment processing
              console.log('Payment Confirmed');
              // After payment confirmation, you can proceed to success page or reset
              Keyboard.dismiss();              // ✅ 1. 收起键盘
              //setShowPasswordScreen(false);    // ✅ 2. 关闭密码页
              //setSuccessVisible(true);
              setPayStatus('loading');
              //setTxnLoading(true);
              setTxnError('');
              (async () => {
                let ac: AbortController | undefined;
                let tid: any;
                try {
                  ac = new AbortController();
                  tid = setTimeout(() => ac?.abort(), 60000);
                  const isPreAuth = String(factor?.transactionType) === '预授权';
                  const usePreAuth = isPreAuth && preAuthInfo?.approved === true;
                  const url = usePreAuth
                    ? 'http://172.20.10.6:8088/api/v1/preAuth/preAuth'
                    : 'http://172.20.10.6:8088/api/v1/posTransaction/QRcodeConsumeActiveScan';
                  const body = usePreAuth
                    ? {
                      primaryAccountNumber: '625807******4153',
                      transactionAmount: String(factor?.transactionAmount ?? amount ?? ''),
                      tokenSymbol: selectingTokenSymbol ?? preAuthInfo?.tokenSymbol ?? '',
                      terminalId: String(factor?.terminalId ?? ''),
                      merchantId: String(factor?.merchantId ?? ''),
                      referenceNumber: String(factor?.referenceNumber ?? ''),
                      payerAddress: String(preAuthInfo?.payerAddress ?? ''),
                      tokenAddress: String(preAuthInfo?.tokenAddress ?? ''),
                      permit2Address: String(preAuthInfo?.permit2Address ?? ''),
                    }
                    : {
                      primaryAccountNumber: '625807******4153',
                      transactionAmount: String(factor?.transactionAmount ?? amount ?? ''),
                      tokenSymbol: selectingTokenSymbol ?? '',
                      terminalId: String(factor?.terminalId ?? ''),
                      merchantId: String(factor?.merchantId ?? ''),
                      referenceNumber: String(factor?.referenceNumber ?? ''),
                    };
                  const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: ac.signal,
                  });
                  const json = await res.json();
                  console.warn('json', json);
                  const d = json?.data ?? {};
                  if (json?.statusCode === '00') {
                    const mapped = {
                      txHash: String(d?.txHash ?? ''),
                      status: String(d?.status ?? ''),
                      blockNumber: String(d?.blockNumber ?? ''),
                      timestamp: String(d?.timestamp ?? ''),
                      merchantId: String(d?.merchantId ?? ''),
                      terminalId: String(d?.terminalId ?? ''),
                      referenceNumber: String(d?.referenceNumber ?? ''),
                      transactionAmount: String(d?.transactionAmount ?? ''),
                      totalPay: String((Number(d?.transactionAmount ?? 0) + Number(d?.gasCost ?? 0))),
                    } as any;
                    setTxn(mapped);
                    setPayStatus('success');
                  } else {
                    setPayStatus('timeout');
                  }
                  // const mapped = {
                  //   txHash: String(d?.txHash ?? ''),
                  //   status: String(d?.status ?? ''),
                  //   blockNumber: String(d?.blockNumber ?? ''),
                  //   timestamp: String(d?.timestamp ?? ''),
                  //   fromAddress: String(d?.fromAddress ?? ''),
                  //   toAddress: String(d?.toAddress ?? ''),
                  //   gasUsed: String(d?.gasUsed ?? ''),
                  //   gasPrice: String(d?.gasPrice ?? ''),
                  //   gasCost: String(d?.gasCost ?? ''),
                  //   inputData: String(d?.inputData ?? ''),
                  //   functionName: String(d?.functionName ?? ''),
                  //   events: Array.isArray(d?.events) ? d.events : [],
                  //   tokenTransfers: Array.isArray(d?.tokenTransfers) ? d.tokenTransfers : [],
                  //   merchantId: String(d?.merchantId ?? ''),
                  //   terminalId: String(d?.terminalId ?? ''),
                  //   referenceNumber: String(d?.referenceNumber ?? ''),
                  //   transactionAmount: String(d?.transactionAmount ?? ''),
                  //   statusCode: String(json?.statusCode ?? ''),
                  //   msg: String(json?.msg ?? ''),
                  //   totalPay: String((Number(d?.transactionAmount ?? 0) + Number(d?.gasCost ?? 0))),
                  // } as any;
                  // setTxn(mapped);
                } catch (e: any) {
                  setTxnError(String(e?.message || e));
                  setPayStatus('timeout');
                } finally {
                  if (tid) clearTimeout(tid);
                }
              })();
            }}
            style={styles.payBtn}
          >
            <Text style={styles.payBtnText}>支付</Text>
          </TouchableOpacity>
        </View>
      )}

      {payStatus === 'loading' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      )}
      {payStatus === 'success' && (
        <View style={styles.fullScreenMask}>
          <Text style={styles.successTitle}>支付成功</Text>

          <View style={{ marginTop: 24, alignSelf: 'stretch' }}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>商品价格</Text>
              <Text style={styles.sectionValue}>{productPrice ? `$${productPrice}` : ''}</Text>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Gas费</Text>
              <Text style={styles.sectionValue}>{gasFee ? `$${gasFee}` : ''}</Text>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>实际支付</Text>
              <Text style={[styles.sectionValue]}>
                {totalPay ? `$${totalPay}` : ''}
              </Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>网络类型</Text>
              <Text style={styles.sectionValue}>以太坊</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>链上交易哈希</Text>
              <Text style={styles.sectionValue}>{txn?.txHash ?? '-'}</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>区块号</Text>
              <Text style={styles.sectionValue}>{txn?.blockNumber ?? '-'}</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>区块时间戳</Text>
              <Text style={styles.sectionValue}>{formatTimestamp(txn?.timestamp)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.payBtn, { marginTop: 30, alignSelf: 'stretch' }]}
            onPress={() => {
              setPayStatus('idle');
              navigation.popToTop();
            }}
          >
            <Text style={styles.payBtnText}>完成</Text>
          </TouchableOpacity>
        </View>
      )}

      {payStatus === 'timeout' && (
        <View style={styles.fullScreenMask}>
          <Text style={styles.failTitle}>支付超时</Text>
          <Text style={styles.waitDesc}>网络异常或区块确认超时，请重试</Text>

          <TouchableOpacity
            style={[styles.payBtn, { marginTop: 30, alignSelf: 'stretch' }]}
            onPress={() => {
              setPayStatus('idle');
              navigation.popToTop();
            }}
          >
            <Text style={styles.payBtnText}>返回</Text>
          </TouchableOpacity>
        </View>
      )}


      {/* {successVisible && !detailsVisible && (
        <View style={styles.overlay}>
          <View style={[styles.sheet, styles.successSheet]}>
            <Text style={styles.successTitle}>交易结果</Text>
            {txnLoading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#e53935" />
                <Text style={styles.sectionValue}>正在获取交易结果…</Text>
              </View>
            )}
            {!!txnError && <Text style={styles.sectionDesc}>错误：{txnError}</Text>}
            <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>商户号</Text><Text style={styles.sectionValue}>{txn?.merchantId ?? '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>终端号</Text><Text style={styles.sectionValue}>{txn?.terminalId ?? '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>交易金额</Text><Text style={styles.sectionValue}>{txn?.transactionAmount != null ? `$${String(txn?.transactionAmount)}` : '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>订单号</Text><Text style={styles.sectionValue}>{txn?.referenceNumber ?? '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>交易日期、时间</Text><Text style={styles.sectionValue}>{formatTimestamp(txn?.timestamp)}</Text></View>
            </View>

            <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>链上交易hash</Text><Text style={styles.sectionValue}>{txn?.txHash ?? '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>链上交易状态</Text><Text style={styles.sectionValue}>{txn?.status ?? '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>区块号</Text><Text style={styles.sectionValue}>{txn?.blockNumber ?? '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>实际支付</Text><Text style={styles.sectionValue}>{txn?.totalPay != null ? `$${String(txn?.totalPay)}` : '-'}</Text></View>
            </View>

            <TouchableOpacity
              onPress={() => {
                navigation.navigate('TransactionDetails', {
                  txn: txn ?? {},
                  address: (factor?.blockchainAddress ?? address),
                  stable: selectedStable,
                  network: '以太坊',
                  productPrice: Number(productPrice || '0'),
                  gasFee,
                  totalPay,
                });
              }}
              style={styles.successDoneBtn}
            >
              <Text style={styles.successDoneText}>交易详情</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSuccessVisible(false);
                setDetailsVisible(false);
                navigation.popToTop();
              }}
              style={[styles.successDoneBtn, { marginTop: 12 }]}
            >
              <Text style={styles.successDoneText}>完成</Text>
            </TouchableOpacity>
          </View>
        </View>
      )} */}

      {/* 交易详情改为全屏页面，半屏详情已移除 */}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    minHeight: '55%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#333',
    lineHeight: 24,
  },
  headerHelp: {
    fontSize: 18,
    color: '#666',
  },
  helpBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' },
  helpText: { fontSize: 18, color: '#666' },
  amountBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  currency: {
    fontSize: 20,
    color: '#333',
    marginRight: 4,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  subAmount: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#222',
    marginBottom: 4,
    fontWeight: '600',
    width: 90,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#666',
  },
  sectionRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionRowWrap: {
    alignItems: 'flex-start',
  },
  sectionValue: {
    fontSize: 13,
    color: '#333',
    textAlign: 'right',
    width: '60%',
  },
  valueWrap: {
    width: '80%',
    textAlign: 'left',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  addrRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  safeBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#e6f4ea', alignItems: 'center', justifyContent: 'center' },
  safeText: { color: '#2e7d32', fontSize: 12, fontWeight: '700' },
  dropdown: { marginTop: 8, flexDirection: 'row', gap: 8 },
  dropdownItem: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#ddd', borderRadius: 14 },
  dropdownText: { fontSize: 12, color: '#555' },
  dropdownTextActive: { color: '#e53935', fontWeight: '600' },
  gasRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gasInput: { width: 80, height: 32, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 8 },
  tipText: { marginTop: 6, fontSize: 11, color: '#888' },
  infoTip: { marginTop: 8, fontSize: 12, color: '#666' },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  pwdContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
    position: 'relative',
  },

  pwdBox: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pwdDot: {
    fontSize: 22,
    fontWeight: '700',
  },

  hiddenInput: {
    position: 'absolute',
    opacity: 0.01,
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    zIndex: 1,
  },

  cardList: { marginTop: 8 },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  cardThumb: { width: 48, height: 30, borderRadius: 6, backgroundColor: '#eee', marginRight: 12 },
  cardMiddle: { flex: 1 },
  cardName: { fontSize: 14, color: '#222', fontWeight: '600' },
  cardBalance: { fontSize: 12, color: '#888', marginTop: 4 },
  selectedBadge: { color: '#e53935', fontSize: 18, fontWeight: '700' },
  unselectedDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#ddd' },
  cardOptions: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  cardOptionActive: {
    borderColor: '#e53935',
    backgroundColor: '#fdecea',
  },
  cardOptionText: { fontSize: 12, color: '#555' },
  cardOptionTextActive: { color: '#e53935', fontWeight: '600' },
  input: {
    marginTop: 12,
    width: '100%',
    height: 44,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  waitTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },

  waitDesc: {
    marginTop: 12,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },

  failTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#e53935',
    textAlign: 'center',
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#bbb',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#e33',
    borderColor: '#e33',
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 12,
  },
  agreeText: {
    fontSize: 12,
    color: '#555',
  },
  payBtn: {
    marginTop: 16,
    backgroundColor: '#e53935',
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnDisabled: {
    backgroundColor: '#ccc',
  },
  fullScreenMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 999,
    elevation: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  payBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  payMethodRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  payMethodText: {
    fontSize: 13,
    color: '#333',
    flexShrink: 1, // 让左边内容被压缩
  },

  tokenText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    marginLeft: 4,
    flexShrink: 0, // 保证币种永远不被挤掉
  },

  successSheet: {
    alignItems: 'center',
    minHeight: '45%',
  },
  successTitle: { fontSize: 18, fontWeight: '600', color: '#222', marginTop: 8, marginBottom: 12 },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e6f4ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  successIcon: { color: '#2e7d32', fontSize: 28, fontWeight: '700' },
  successAmount: { fontSize: 28, fontWeight: '700', color: '#333', marginTop: 16 },
  successDoneBtn: {
    marginTop: 24,
    backgroundColor: '#e53935',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    alignSelf: 'stretch',
  },
  successDoneText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  box: { marginTop: 8, alignSelf: 'stretch', borderColor: '#eee', borderWidth: 1, borderRadius: 8, padding: 12 },
  boxTitle: { fontSize: 13, color: '#333', marginBottom: 8, fontWeight: '600' },
  boxText: { fontSize: 12, color: '#444' },

});

export default PaymentScreen;
