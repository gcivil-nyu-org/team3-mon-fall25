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
    me: '/profiles/me/',
  },
  listings: '/listings/',
  products: '/products/',
  users: '/users/',
  orders: '/orders/',
  watchlist: '/watchlist/',
  notifications: {
    base: '/notifications/',
    unreadCount: '/notifications/unread-count/',
    markAllRead: '/notifications/mark-all-read/',
    markRead: (id) => `/notifications/${id}/read/`,
  },
};
