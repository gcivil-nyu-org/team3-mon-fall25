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
  listingPriceStats: '/listings/price-stats/',
  products: '/products/',
  users: '/users/',
  orders: '/orders/',
  watchlist: '/watchlist/',
};
