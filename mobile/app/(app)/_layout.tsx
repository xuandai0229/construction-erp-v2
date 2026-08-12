import React from 'react';
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0f172a',
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <Stack.Screen
        name="projects/index"
        options={{
          title: 'Công trình của tôi',
        }}
      />
      <Stack.Screen
        name="projects/[projectId]"
        options={{
          title: 'Trang công trình',
        }}
      />
      <Stack.Screen
        name="profile/index"
        options={{
          title: 'Tài khoản cá nhân',
        }}
      />
    </Stack>
  );
}
