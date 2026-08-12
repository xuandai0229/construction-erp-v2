import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/auth/auth-context';
import { ProjectProvider } from '../src/project/project-context';
import { StatusBar } from 'expo-status-bar';

function NavigationGuard() {
  const { status, error, bootstrap } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (status === 'BOOTSTRAPPING') return;

    const inAuthGroup = (segments[0] as string) === '(auth)';

    if (status === 'UNAUTHENTICATED' && !inAuthGroup) {
      router.replace('/login' as any);
    } else if (status === 'AUTHENTICATED' && inAuthGroup) {
      router.replace('/projects' as any);
    }
  }, [status, segments, router]);

  if (status === 'BOOTSTRAPPING') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Đang tải dữ liệu hệ thống...</Text>
      </View>
    );
  }

  if (status === 'ERROR') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Lỗi kết nối máy chủ</Text>
        <Text style={styles.errorSub}>{error || 'Không thể kết nối đến máy chủ ERP.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={bootstrap}>
          <Text style={styles.retryText}>Thử lại kết nối</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <StatusBar style="auto" />
        <NavigationGuard />
      </ProjectProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
