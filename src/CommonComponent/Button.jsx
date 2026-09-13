import React, { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { RFPercentage } from 'react-native-responsive-fontsize';
import { Colors, Fonts } from '../constants/theme';
export default function Button({ title, onPress, disabled, disbaled, loader }) {
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const blocked = Boolean(disabled || disbaled || loader || pending);
  const press = async () => {
    if (blocked || busy.current) return;
    busy.current = true;
    try {
      const result = onPress?.();
      if (result && typeof result.then === 'function') {
        setPending(true);
        await result;
      }
    } finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: blocked, busy: Boolean(loader || pending) }} activeOpacity={0.8} style={[styles.button, blocked && { opacity: 0.65 }]} onPress={press} disabled={blocked}>
    {loader || pending ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.text}>{title}</Text>}
  </TouchableOpacity>;
}
const styles = StyleSheet.create({button:{width:'100%',minHeight:RFPercentage(6),paddingVertical:10,borderRadius:RFPercentage(6),backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center',alignSelf:'center'},text:{fontSize:RFPercentage(2),fontFamily:Fonts.Medium,color:'white',textAlign:'center'}});
