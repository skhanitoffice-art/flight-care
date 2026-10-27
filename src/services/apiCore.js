import {
	isHttpsUrl,
	getSecurityHeaders,
	isJwtExpired,
	decodeJwt,
	getJwtClaims,
	validateTokenRole,
	isDemoLoginAllowed,
	verifyManagerCredentials,
} from './security.js';
import {
	verifyTransactionWithGateway,
	processBkashWebhook,
	processBanglaQrWebhook,
	getBkashWebhookLogs,
	simulateIncomingBkashIpn,
	generateDailyReconciliation,
	cleanExpiredPaymentSessions,
	generateBkashDynamicQrData,
	launchBkashPaymentAppOrCheckout,
	processBankCardPayment,
	simulateIncomingCardIpn,
	processGatewayRefund,
	initiateSslCommerzPayment,
	processSslCommerzPayment,
	simulateIncomingSslCommerzIpn,
	SSLCOMMERZ_CONFIG,
} from './paymentGateway.js';
import {
	createRegistrationOtpChallenge,
	verifyRegistrationOtpChallenge,
	resendOtpChallenge,
	createPasswordResetOtp,
	verifyPasswordResetOtp,
} from './otpAuthService.js';
import { authenticateWithFirebaseCloud } from './firebaseSyncService.js';

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.example.com/api';
export const apiConfigured = isHttpsUrl(BASE) && !BASE.includes('example.com');
export const customerApiConfigured = apiConfigured;
export const managerApiConfigured = apiConfigured;
export const staffApiConfigured = apiConfigured;

// Re-export JWT and Demo auth helpers
export {
	isJwtExpired,
	decodeJwt,
	getJwtClaims,
	validateTokenRole,
	isDemoLoginAllowed,
	verifyManagerCredentials,
};

const customerRequest = async (path, method = 'POST', body, token) => {
	if (!customerApiConfigured) return { ok: false, reason: 'not_configured' };
	if (token && isJwtExpired(token)) {
		return { ok: false, reason: 'token_expired', message: 'Customer session has expired. Please sign in again.' };
	}
	try {
		const response = await fetch(`${BASE}${path}`, {
			method,
			headers: getSecurityHeaders(token),
			...(body ? { body: JSON.stringify(body) } : {}),
		});
		const data = response.status === 204 ? null : await response.json();
		if (response.status === 401) {
			return { ok: false, reason: 'unauthorized', status: 401, message: data?.message || 'Session expired or invalid credentials.' };
		}
		if (!response.ok) return { ok: false, reason: 'request_failed', message: data?.message };
		return { ok: true, data: data?.data ?? data };
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
};

const customerSessionResult = async (path, body) => {
	const result = await customerRequest(path, 'POST', body);
	if (!result.ok) return result;
	if (!result.data?.token || (result.data.user?.role && result.data.user.role !== 'customer')) return { ok: false, reason: 'unauthorized' };
	return { ok: true, token: result.data.token, user: result.data.user };
};

export const registerCustomer = async (details) => {
	if (customerApiConfigured) {
		return customerRequest('/customers/register', 'POST', details);
	}
	return createRegistrationOtpChallenge(details);
};

export const loginCustomer = (identifier, password) => customerSessionResult('/customers/login', { identifier, password });

export const verifyCustomerOtp = async (challengeId, phone, code) => {
	if (customerApiConfigured) {
		return customerSessionResult('/customers/otp/verify', { challenge_id: challengeId, phone, code });
	}
	return verifyRegistrationOtpChallenge(challengeId, phone, code);
};

export const resendCustomerOtp = async (challengeId, phone) => {
	if (customerApiConfigured) {
		return customerRequest('/customers/otp/resend', 'POST', { challenge_id: challengeId, phone });
	}
	return resendOtpChallenge(challengeId, phone);
};

export const requestPasswordReset = async (identifier) => {
	if (customerApiConfigured) {
		return customerRequest('/customers/password/forgot', 'POST', { identifier });
	}
	return createPasswordResetOtp(identifier);
};

export const resetCustomerPassword = async (identifier, code, password, passwordConfirmation) => {
	if (customerApiConfigured) {
		return customerRequest('/customers/password/reset', 'POST', {
			identifier, code, password, password_confirmation: passwordConfirmation,
		});
	}
	return verifyPasswordResetOtp(identifier, code, password);
};
export const updateCustomerProfile = (token, profile) => customerRequest('/customers/me', 'PATCH', profile, token);
export const requestCustomerPhoneChange = (token, phone) => customerRequest('/customers/me/phone/change', 'POST', { phone }, token);
export const verifyCustomerPhoneChange = (token, challengeId, phone, code) => customerRequest('/customers/me/phone/verify', 'POST', { challenge_id: challengeId, phone, code }, token);
export const getCustomerBookings = async (token) => {
	const result = await customerRequest('/customers/bookings', 'GET', undefined, token);
	if (!result.ok) return result;
	const bookings = Array.isArray(result.data) ? result.data : result.data?.bookings || [];
	return { ok: true, bookings };
};
export const cancelCustomerBooking = (token, bookingId) => customerRequest(`/customers/bookings/${encodeURIComponent(bookingId)}/cancel`, 'POST', {}, token);
export const getCustomerNotifications = async (token) => {
	const result = await customerRequest('/customers/notifications', 'GET', undefined, token);
	if (!result.ok) return result;
	const notifications = Array.isArray(result.data) ? result.data : result.data?.notifications || [];
	return { ok: true, notifications };
};
export const markCustomerNotificationRead = (token, notificationId) => customerRequest(`/customers/notifications/${encodeURIComponent(notificationId)}/read`, 'PATCH', {}, token);
export const getBookingWorkflow = async () => {
	const result = await customerRequest('/booking-workflow', 'GET');
	if (!result.ok) return result;
	const stages = Array.isArray(result.data) ? result.data : result.data?.stages || [];
	return { ok: true, stages };
};
export const getServiceCatalog = (airportCode) => customerRequest(`/services?airport_code=${encodeURIComponent(airportCode)}`, 'GET');
export const getAddonCatalog = (airportCode) => customerRequest(`/addons?airport_code=${encodeURIComponent(airportCode)}`, 'GET');
export const quoteProtocolStaff = (context) => customerRequest('/staff-allocation/quote', 'POST', context);
export const logoutCustomer = async (token) => {
	if (!customerApiConfigured || !token) return;
	await customerRequest('/customers/logout', 'POST', undefined, token);
};
export const createBooking = async (booking) => {
	const result = await customerRequest('/bookings', 'POST', booking);
	if (!result.ok) return result;
	const record = result.data?.booking || result.data;
	const id = record?.id ?? record?.booking_id;
	if (id == null) return { ok: false, reason: 'invalid_response' };
	return { ok: true, booking: { ...record, id } };
};

export const bkashCreate = async (bookingId, amount) => {
	const result = await customerRequest('/payments/bkash/create', 'POST', { booking_id: bookingId, amount });
	if (!result.ok) return result;
	const paymentId = result.data?.payment_id ?? result.data?.paymentID ?? result.data?.transaction_id;
	const redirectUrl = result.data?.redirect_url ?? result.data?.bkashURL;
	if (!paymentId || !redirectUrl) return { ok: false, reason: 'invalid_response' };
	return { ok: true, paymentId: String(paymentId), redirectUrl: String(redirectUrl), data: result.data };
};

export const verifyBkashPayment = async (paymentId, trxId, bookingId, expectedAmount) => {
	if (customerApiConfigured) {
		const res = await customerRequest('/payments/bkash/verify', 'POST', {
			payment_id: paymentId,
			trx_id: trxId,
			booking_id: bookingId,
			amount: expectedAmount,
		});
		if (res.ok) return res;
	}
	return await verifyTransactionWithGateway({ trxId, bookingId, expectedAmount, paymentId, channel: 'bKash (বাংলা কিউআর)' });
};

export const verifyBanglaQrPayment = async (paymentId, trxId, bookingId, expectedAmount, channel = 'Bangla QR') => {
	if (customerApiConfigured) {
		const res = await customerRequest('/payments/banglaqr/verify', 'POST', {
			payment_id: paymentId,
			trx_id: trxId,
			booking_id: bookingId,
			amount: expectedAmount,
			channel,
		});
		if (res.ok) return res;
	}
	return await verifyTransactionWithGateway({ trxId, bookingId, expectedAmount, paymentId, channel });
};

export const verifyBankCardPayment = async (paymentId, trxId, bookingId, expectedAmount, channel = 'Bank Card (ভিসা/মাস্টারকার্ড)') => {
	if (customerApiConfigured) {
		const res = await customerRequest('/payments/card/verify', 'POST', {
			payment_id: paymentId,
			trx_id: trxId,
			booking_id: bookingId,
			amount: expectedAmount,
			channel,
		});
		if (res.ok) return res;
	}
	return await verifyTransactionWithGateway({ trxId, bookingId, expectedAmount, paymentId, channel });
};

export const verifySslCommerzPayment = async (paymentId, trxId, bookingId, expectedAmount, channel = 'SSLCOMMERZ') => {
	if (customerApiConfigured) {
		const res = await customerRequest('/payments/sslcommerz/verify', 'POST', {
			payment_id: paymentId,
			trx_id: trxId,
			booking_id: bookingId,
			amount: expectedAmount,
			channel,
		});
		if (res.ok) return res;
	}
	return await verifyTransactionWithGateway({ trxId, bookingId, expectedAmount, paymentId, channel });
};

export const getCustomerPaymentHistory = async (token) => {
	const result = await customerRequest('/customers/payments/history', 'GET', undefined, token);
	if (!result.ok) return result;
	const payments = Array.isArray(result.data) ? result.data : result.data?.payments || [];
	return { ok: true, payments };
};

export {
	verifyTransactionWithGateway,
	processBkashWebhook,
	processBanglaQrWebhook,
	getBkashWebhookLogs,
	simulateIncomingBkashIpn,
	generateDailyReconciliation,
	cleanExpiredPaymentSessions,
	generateBkashDynamicQrData,
	launchBkashPaymentAppOrCheckout,
	processBankCardPayment,
	simulateIncomingCardIpn,
	processGatewayRefund,
	initiateSslCommerzPayment,
	processSslCommerzPayment,
	simulateIncomingSslCommerzIpn,
	SSLCOMMERZ_CONFIG,
};

export const managerLogin = async (email, password) => {
	// 1. First priority: Dynamic Firebase Cloud Firestore & Auth authentication
	try {
		const cloudAuth = await authenticateWithFirebaseCloud(email, password);
		if (cloudAuth && cloudAuth.ok) {
			return cloudAuth;
		}
	} catch (cloudErr) {
		console.warn('[Firebase Cloud Auth] Login check error:', cloudErr);
	}

	// 2. Second priority: Local configured manager credentials (for offline/manager fallback)
	const localAuth = verifyManagerCredentials(email, password);
	if (localAuth.ok) {
		return {
			ok: true,
			token: `manager-${localAuth.user.id || 'token'}-${Date.now()}`,
			user: localAuth.user,
		};
	}

	if (!managerApiConfigured) {
		return { ok: false, reason: 'unauthorized', message: 'Invalid manager or admin email or password.' };
	}
	try {
		const response = await fetch(`${BASE}/manager/login`, {
			method: 'POST',
			headers: getSecurityHeaders(),
			body: JSON.stringify({ email, password }),
		});
		const data = await response.json();
		if (!response.ok || !data.token || (data.user?.role !== 'manager' && data.user?.role !== 'admin')) return { ok: false, reason: 'unauthorized' };
		return { ok: true, token: data.token, user: data.user };
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
};

export const managerLogout = async (token) => {
	if (!managerApiConfigured || !token) return;
	try {
		await fetch(`${BASE}/manager/logout`, { method: 'POST', headers: getSecurityHeaders(token) });
	} catch {}
};

const managerRequest = async (token, path, method = 'GET', body) => {
	if (!managerApiConfigured || !token) return { ok: false, reason: 'not_configured' };
	if (isJwtExpired(token)) {
		return { ok: false, reason: 'token_expired', message: 'Manager session has expired. Please sign in again.' };
	}
	try {
		const response = await fetch(`${BASE}${path}`, {
			method,
			headers: getSecurityHeaders(token),
			...(body ? { body: JSON.stringify(body) } : {}),
		});
		const data = response.status === 204 ? null : await response.json();
		if (response.status === 401) {
			return { ok: false, reason: 'unauthorized', status: 401, message: data?.message || 'Unauthorized manager request.' };
		}
		if (!response.ok) return { ok: false, reason: 'request_failed', message: data?.message };
		return { ok: true, data: data?.data ?? data };
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
};

export const getManagerStaffAllocationRules = async (token) => {
	const result = await managerRequest(token, '/manager/staff-allocation-rules');
	if (!result.ok) return result;
	const rules = Array.isArray(result.data) ? result.data : result.data?.rules || [];
	return { ok: true, rules };
};

export const saveManagerStaffAllocationRules = (token, rules) => managerRequest(token, '/manager/staff-allocation-rules', 'PUT', { rules });

export const getManagerBookingWorkflow = async (token) => {
	const result = await managerRequest(token, '/manager/booking-workflow');
	if (!result.ok) return result;
	const stages = Array.isArray(result.data) ? result.data : result.data?.stages || [];
	return { ok: true, stages };
};

export const saveManagerBookingWorkflow = (token, stages) => managerRequest(token, '/manager/booking-workflow', 'PUT', { stages });

export const getManagerServices = async (token, airportCode) => {
	const result = await managerRequest(token, `/manager/services?airport_code=${encodeURIComponent(airportCode)}`);
	if (!result.ok) return result;
	const services = Array.isArray(result.data) ? result.data : result.data?.services || [];
	return { ok: true, services };
};

export const saveManagerServices = (token, airportCode, services) => managerRequest(token, '/manager/services', 'PUT', { airport_code: airportCode, services });

export const getManagerAddons = async (token, airportCode) => {
	const result = await managerRequest(token, `/manager/addons?airport_code=${encodeURIComponent(airportCode)}`);
	if (!result.ok) return result;
	const addons = Array.isArray(result.data) ? result.data : result.data?.addons || [];
	return { ok: true, addons };
};

export const saveManagerAddons = (token, airportCode, addons) => managerRequest(token, '/manager/addons', 'PUT', { airport_code: airportCode, addons });

export const getManagerAirports = async (token) => {
	const result = await managerRequest(token, '/manager/airports');
	if (!result.ok) return result;
	const airports = Array.isArray(result.data) ? result.data : result.data?.airports || [];
	return { ok: true, airports };
};

export const saveManagerAirports = (token, airports) => managerRequest(token, '/manager/airports', 'PUT', { airports });


export const getManagerPayments = async (token, status = 'all', search = '') => {
	const query = [`status=${encodeURIComponent(status)}`, `search=${encodeURIComponent(search)}`].join('&');
	const result = await managerRequest(token, `/manager/payments?${query}`);
	if (!result.ok) return result;
	const payments = Array.isArray(result.data) ? result.data : result.data?.payments || [];
	return { ok: true, payments, summary: result.data?.summary || null };
};

export const refundManagerPayment = (token, paymentId, amount, reason) => managerRequest(token, `/manager/payments/${encodeURIComponent(paymentId)}/refund`, 'POST', { amount, reason });

export const staffLogin = async (email, password) => {
	if (!managerApiConfigured) return { ok: false, reason: 'not_configured' };
	try {
		const response = await fetch(`${BASE}/staff/login`, {
			method: 'POST',
			headers: getSecurityHeaders(),
			body: JSON.stringify({ email, password }),
		});
		const data = await response.json();
		if (!response.ok || !data.token || !['staff', 'agent'].includes(data.user?.role)) return { ok: false, reason: 'unauthorized' };
		return { ok: true, token: data.token, user: data.user };
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
};

const staffRequest = async (token, path, method = 'GET', body) => {
	if (token && isJwtExpired(token)) {
		throw new Error('Staff session expired. Please sign in again.');
	}
	const response = await fetch(`${BASE}${path}`, {
		method,
		headers: getSecurityHeaders(token),
		...(body ? { body: JSON.stringify(body) } : {}),
	});
	const data = response.status === 204 ? null : await response.json();
	if (response.status === 401) {
		throw new Error(data?.message || 'Staff session unauthorized or expired.');
	}
	if (!response.ok) throw new Error(data?.message || 'Staff request failed');
	return data;
};

export const getStaffAssignments = async (token) => {
	const data = await staffRequest(token, '/staff/assignments');
	return Array.isArray(data) ? data : data?.data || [];
};

export const acceptStaffAssignment = (token, id) => staffRequest(token, `/staff/assignments/${encodeURIComponent(id)}/accept`, 'POST');
export const updateStaffAssignment = (token, id, status) => staffRequest(token, `/staff/assignments/${encodeURIComponent(id)}/status`, 'PATCH', { status });
export const completeStaffAssignment = (token, id) => staffRequest(token, `/staff/assignments/${encodeURIComponent(id)}/complete`, 'POST');

export const staffLogout = async (token) => {
	if (!managerApiConfigured || !token) return;
	try {
		await staffRequest(token, '/staff/logout', 'POST');
	} catch {}
};
