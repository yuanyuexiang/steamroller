import { ApolloClient, InMemoryCache, HttpLink, from, fromPromise } from "@apollo/client";
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { TokenManager } from '../auth/token-manager';
import { getEnvironmentInfo } from '../utils/environment';
import { authLogger, apiLogger } from '../utils/logger';

// 刷新 token 的函数 (复用主客户端的逻辑)
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    // 直接使用GraphQL system端点刷新token
    const response = await fetch('/api/graphql/system', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation AuthRefresh($refresh_token: String!) {
            auth_refresh(refresh_token: $refresh_token) {
              access_token
              refresh_token
              expires
            }
          }
        `,
        variables: { refresh_token: refreshToken }
      }),
    });

    const result = await response.json();

    if (result.errors || !result.data?.auth_refresh?.access_token) {
      TokenManager.clearTokens();
      return null;
    }

    const authData = result.data.auth_refresh;
    TokenManager.saveTokens(authData.access_token, authData.refresh_token);

    return authData.access_token;
  } catch (error) {
    authLogger.error('System token refresh failed', error);
    TokenManager.clearTokens();
    return null;
  }
};

// 创建认证链接
const systemAuthLink = setContext(async (_, { headers }) => {
  let token = TokenManager.getCurrentToken();
  
  // 检查 token 是否即将过期
  if (token) {
    const env = getEnvironmentInfo();
    if (env.isBrowser) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = payload.exp - currentTime;

        // 如果 token 在 5 分钟内过期，尝试刷新
        if (timeUntilExpiry < 300) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            token = newToken;
          }
        }
      } catch (error) {
        authLogger.error('Error checking system token expiration', error);
      }
    }
  }
  
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {})
    }
  };
});

// 创建错误处理链接
const systemErrorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      apiLogger.error(
        'System GraphQL error',
        { message, locations, path }
      );
    });
  }

  if (networkError) {
    apiLogger.error('System Network error', networkError);
    
    // 如果是401错误，尝试刷新token并重试请求
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      const env = getEnvironmentInfo();
      if (env.isBrowser) {
        return fromPromise(
          refreshAccessToken().then((newToken) => {
            if (newToken) {
              const oldHeaders = operation.getContext().headers;
              operation.setContext({
                headers: {
                  ...oldHeaders,
                  authorization: `Bearer ${newToken}`,
                },
              });
              return newToken;
            } else {
              TokenManager.clearTokens();
              window.location.href = '/login';
              throw new Error('System authentication failed');
            }
          })
        ).flatMap(() => forward(operation));
      }
    }
  }
});

// 创建系统 Apollo Client
const createSystemApolloClient = () => {
  const httpLink = new HttpLink({ 
    uri: '/api/graphql/system', // 使用系统端点
    fetchOptions: {
      timeout: 30000
    }
  });

  return new ApolloClient({
    link: from([systemErrorLink, systemAuthLink, httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            // 系统查询的缓存策略
          }
        }
      }
    }),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
        notifyOnNetworkStatusChange: true
      },
      query: {
        errorPolicy: 'all'
      },
      mutate: {
        errorPolicy: 'all'
      }
    },
    devtools: {
      enabled: process.env.NODE_ENV === 'development'
    }
  });
};

// 创建系统客户端实例
const systemClient = createSystemApolloClient();

export default systemClient;

// 导出重新创建系统客户端的函数
export const recreateSystemApolloClient = () => {
  const newClient = createSystemApolloClient();
  return newClient;
};