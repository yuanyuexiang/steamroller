'use client';

import React from 'react';
import { ApolloProvider } from '@apollo/client';
import systemClient from '@lib/api/system-apollo-client';

interface SystemApolloProviderProps {
  children: React.ReactNode;
}

export default function SystemApolloProvider({ children }: SystemApolloProviderProps) {
  return (
    <ApolloProvider client={systemClient}>
      {children}
    </ApolloProvider>
  );
}