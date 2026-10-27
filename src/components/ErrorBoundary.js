import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const isBn = this.props.lang === 1;
      return (
        <ScrollView
          style={{ flex: 1, backgroundColor: '#F8FAFC' }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 28,
              maxWidth: 520,
              width: '100%',
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: '#FECACA',
              shadowColor: '#DC2626',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 32 }}>⚠️</Text>
            </View>

            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8 }}>
              {isBn ? 'প্যানেলে একটি ত্রুটি দেখা দিয়েছে' : 'Something went wrong loading this panel'}
            </Text>

            <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 16, lineHeight: 19 }}>
              {isBn
                ? 'সাময়িক ত্রুটির কারণে স্ক্রিনটি রেন্ডার হতে পারেনি। পুনরায় চেষ্টা করুন অথবা ড্যাশবোর্ডে ফিরে যান।'
                : 'A temporary error occurred while rendering this view. You can reload the section or return to the dashboard.'}
            </Text>

            {this.state.error?.message ? (
              <View
                style={{
                  backgroundColor: '#FEF2F2',
                  borderRadius: 10,
                  padding: 12,
                  width: '100%',
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: '#FCA5A5',
                }}
              >
                <Text style={{ fontSize: 12, color: '#DC2626', fontFamily: 'monospace' }}>
                  {String(this.state.error.message)}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                onPress={this.handleReset}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  backgroundColor: '#0284C7',
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                  🔄 {isBn ? 'পুনরায় চেষ্টা করুন' : 'Reload Panel'}
                </Text>
              </TouchableOpacity>

              {this.props.onHome ? (
                <TouchableOpacity
                  onPress={this.props.onHome}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    backgroundColor: '#F1F5F9',
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                  }}
                >
                  <Text style={{ color: '#334155', fontSize: 13.5, fontWeight: '800' }}>
                    🏠 {isBn ? 'হোমে ফিরে যান' : 'Go Home'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

