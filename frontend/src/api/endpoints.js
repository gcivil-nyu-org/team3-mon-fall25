export const endpoints = {
  auth: {
    login: '/auth/login/',
    register: '/auth/register/',
    verifyOtp: '/auth/verify-otp/',
    sendOtp: '/auth/send-otp/',
    resendOtp: '/auth/resend-otp/',
    me: '/auth/me/',
  },
  profiles: {
    base: '/profiles/',
    byId: (id) => `/profiles/${id}/`,
  },
  listings: '/listings/',
  listingPriceStats: '/listings/price-stats/',
  products: '/products/',
  users: '/users/',
  orders: '/orders/',
  transactions: {
    base: '/transactions/',
    detail: (id) => `/transactions/${id}/`,
    myOrders: '/transactions/my-orders/',
  },
  reviews: {
    base: '/reviews/',
    detail: (id) => `/reviews/${id}/`,
    byTransaction: (txId) => `/reviews/?transaction_id=${txId}`,
  },
  watchlist: '/watchlist/',
  notifications: {
    base: '/notifications/',
    unreadCount: '/notifications/unread-count/',
    markAllRead: '/notifications/mark-all-read/',
    markRead: (id) => `/notifications/${id}/read/`,
  },
};
