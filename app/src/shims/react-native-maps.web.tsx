// Web stub for react-native-maps, which has no web implementation.
// metro.config.js points 'react-native-maps' here when bundling for web.
import React from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = undefined;

function MapView({ style }: ViewProps & Record<string, unknown>) {
  return (
    <View style={[styles.box, style]}>
      <Text style={styles.text}>Map is not available on web</Text>
    </View>
  );
}

export function Marker(_props: Record<string, unknown>) {
  return null;
}

export function Callout(_props: Record<string, unknown>) {
  return null;
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5e7eb' },
  text: { color: '#6b7280' },
});

export default MapView;
