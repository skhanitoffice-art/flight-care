import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function DateTimeField({
  mode,
  icon,
  placeholder,
  webValue,
  maximumDate,
  onChangeWebValue,
  style,
}) {
  const maximumDateValue = maximumDate
    ? `${maximumDate.getFullYear()}-${String(maximumDate.getMonth() + 1).padStart(2, '0')}-${String(maximumDate.getDate()).padStart(2, '0')}`
    : undefined;
  return (
    <View style={[styles.field, StyleSheet.flatten(style)]}>
      <View style={styles.icon}><Text style={styles.iconText}>{icon}</Text></View>
      {React.createElement('input', {
        type: mode,
        value: webValue,
        max: maximumDateValue,
        'aria-label': placeholder,
        onChange: event => onChangeWebValue(event.target.value),
        style: styles.input,
      })}
    </View>
  );
}

const styles = {
  field: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    marginTop: 0,
    paddingLeft: 18,
    paddingRight: 18,
    boxShadow: '0 8px 22px -3px rgba(124, 58, 237, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
  },
  icon: { width: 32, height: 32, flexShrink: 0, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconText: { color: '#7C3AED', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  input: { width: 0, minWidth: 0, height: 52, flex: 1, padding: 0, border: 0, outline: 'none', backgroundColor: 'transparent', color: '#0F172A', fontSize: 15, fontFamily: 'inherit', fontWeight: '500' },
};
