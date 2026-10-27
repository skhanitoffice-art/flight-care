# FlightCare (React Native / Expo)
npm install && npx expo start   (Android: press `a`, or scan QR with Expo Go)
Backend: set `EXPO_PUBLIC_API_BASE_URL` to your Laravel API base URL. bKash must be created/verified server-side.

## Manager access

The manager portal is separate from the customer tabs. It stays locked unless the API is configured and the login response contains a Sanctum token plus a user with `role: "manager"`.

Set `EXPO_PUBLIC_API_BASE_URL` to the HTTPS API base URL, for example `https://api.example.org/api`. The app expects `POST /manager/login` to return `{ "token": "...", "user": { "role": "manager" } }` and sends `POST /manager/logout` when signing out. Credentials and tokens are not persisted locally.

The Laravel API must protect every manager data endpoint with `auth:sanctum` and a manager-role authorization check. Hiding the portal in the client is not sufficient authorization. Until the backend endpoints are implemented, manager login is disabled and management modules contain no live data.

## Protocol staff interface

The staff interface is separate from customer navigation. `POST /staff/login` must return a Sanctum token and a user whose role is `staff` or `agent`; all other roles are rejected. `GET /staff/assignments` should return only bookings assigned to the authenticated staff member, with passenger, flight, airport, service, and status details.

The app expects `POST /staff/assignments/{id}/accept`, `PATCH /staff/assignments/{id}/status` with `{ "status": "in_progress" }`, `POST /staff/assignments/{id}/complete`, and `POST /staff/logout`. The backend must verify assignment ownership and allowed state transitions on every request, in addition to `auth:sanctum`. Until these endpoints exist, staff login stays disabled and no bookings are shown.

## Customer accounts

The Profile tab provides sign-in, registration, mobile OTP verification, password reset, profile editing, and logout. The app expects:

- `POST /customers/register` with name, phone, optional email, password, and password confirmation; return a `challenge_id` without issuing a session before mobile verification.
- `POST /customers/otp/verify` with `challenge_id`, phone, and code; return `{ "token": "...", "user": { "role": "customer", "name": "...", "phone": "...", "email": "...", "phone_verified": true } }`.
- `POST /customers/otp/resend` with challenge ID and phone.
- `POST /customers/login` with `identifier` and password; return a bearer token and a user whose role is `customer`.
- `POST /customers/password/forgot` with an email or phone identifier, then `POST /customers/password/reset` with identifier, OTP code, password, and password confirmation.
- `PATCH /customers/me` with the bearer token to update the authenticated customer's profile; `POST /customers/logout` revokes the token.

## Customer booking management

Authenticated booking history loads from `GET /customers/bookings`. Return only the current customer's bookings, each with canonical booking `status`, payment `payment_status`, amount, flight/passenger summary, and `cancellation_eligible` plus an optional `cancellation_policy_summary`. The app groups server statuses into Upcoming, Completed, and Cancelled; payment states include `pending`, `paid`, `failed`, and `refunded` (with `partially_refunded` also supported).

Cancellation is requested with `POST /customers/bookings/{bookingId}/cancel` and must require `auth:sanctum`, confirm ownership, and enforce current business policy on the server. The app offers cancellation only when the server marks that booking eligible and updates the list from the server result. Guest bookings are available only for the current app session; sign-in is required for persisted history across sessions.

## Booking status tracking

The public workflow loads from `GET /booking-workflow`; return `{ "stages": [...] }` ordered by `order`. Each stage has a stable `key`, bilingual `label` (`{ "en": "...", "bn": "..." }`), and `bucket` (`upcoming`, `completed`, or `cancelled`). The app falls back to Payment Pending → Confirmed → Staff Assigned → Service Started → Completed when the endpoint is unavailable.

Managers configure the sequence through `GET /manager/booking-workflow` and `PUT /manager/booking-workflow` with `{ "stages": [...] }`. Both manager routes require `auth:sanctum` and the manager role. Booking records must use the configured stage key as their canonical `status`, and may include `status_history: [{ "status": "...", "created_at": "..." }]` to show stage timestamps. The server owns allowed transitions, records every status change, and returns the current stage/history with customer booking records; the client only displays that progress.

## Notifications

Persist customer notifications through `GET /customers/notifications` and mark them read through `PATCH /customers/notifications/{notificationId}/read`; both routes require `auth:sanctum` and return only notifications owned by the authenticated customer. Records should include `id`, bilingual `title`/`body`, `category` (`booking`, `payment`, `service`, `announcement`, or `promotion`), `read` or `read_at`, `created_at`, and optional `channels` delivery results. Create events for booking creation/confirmation/cancellation, payment success/failure, staff assignment, service start/completion, refund processing, important announcements, and promotions. The inbox maps event-type aliases to these categories when needed.

The customer inbox groups notifications into booking updates, payment updates, service notifications, important announcements, and promotions. It provides category filters, an unread count, individual read status, and a mark-all-as-read action; bulk read uses the existing per-notification PATCH route and leaves failed updates unread with an error. Signed-in customers refresh notifications from the API, while booking and payment events created in the current app session remain visible in the inbox.

The app presents in-app notifications and renders delivery-channel results returned by the API. Email (and optional SMS) sending, provider credentials, retry policy, and delivery tracking belong to the backend/third-party provider; the client does not claim a channel was delivered unless the server reports it. The backend must persist and deliver the five notification categories above; promotional and announcement campaigns are not authored or broadcast by the mobile client.

## Help and support

The bilingual Help tab provides searchable FAQ answers for booking assistance, payment assistance, cancellation information, refunds, and general support. Quick-help actions filter and expand booking, payment, and cancellation guidance; users can also filter topics or search English and Bangla question/answer text. Cancellation and refund guidance defer to the server-returned eligibility and applicable business policy.

Configure `EXPO_PUBLIC_SUPPORT_PHONE` and/or `EXPO_PUBLIC_SUPPORT_EMAIL` to show WhatsApp/email contact actions. The screen displays the configured contact details and asks customers to include their booking reference. Invalid/absent phone values do not create a WhatsApp link; when neither channel is configured, the screen explains that contact details are unavailable instead of linking to a placeholder.

The Laravel backend must hash passwords, rate-limit and expire OTPs/reset codes, prevent account enumeration in reset responses, and authorize profile updates against the authenticated customer. Customer tokens stay in memory and are cleared on logout. Until these HTTPS endpoints are configured, account actions remain disabled and no local demo accounts are created.

## Arrival protocol services

The app expects `GET /services?airport_code={code}` to return the active customer catalog (a JSON array or `{ "services": [...] }`). Each service should include `id`, `category` (`arrival` or `departure`), `name` and `description` as `{ "en": "...", "bn": "..." }`, optional `icon`, and `steps` as bilingual objects. Set `active: false` or `is_active: false` to hide a service for that airport. The Admin Panel must edit this same catalog so operational steps are not separately hardcoded in the app.

The manager Services page loads `GET /manager/services?airport_code={code}` and saves the full airport catalog with `PUT /manager/services` using `{ "airport_code": "DAC", "services": [...] }`. Each service contains a unique `id`, `category`, bilingual `name` and `description`, `icon`, bilingual `steps`, and `active`. Both manager routes must require `auth:sanctum` and the manager role; saving must update the same catalog returned by the public customer endpoint above. The editor supports adding/removing services and operational steps, editing their bilingual copy, and activating/deactivating services per airport.

Arrival booking sends `service_id` and `service_category: "arrival"` with the booking. Configure the two arrival services as `bb2car` (boarding bridge through immigration, baggage, customs, and escort to vehicle) and `imm2car` (meet after immigration, baggage/exit assistance, and escort to vehicle). The app uses its built-in bilingual catalog when the service API is unavailable; backend catalog values take over when configured.

Departure booking uses the same catalog with `service_category: "departure"`. Configure `gate2imm` for entry-gate, check-in/baggage-drop, and immigration-counter assistance, and `gate2bb` for extended assistance through check-in, immigration, security, boarding gate, and boarding bridge. A selected departure service keeps the booking direction fixed to departure.

## Additional services

The app expects `GET /addons?airport_code={code}` to return active add-ons (a JSON array or `{ "addons": [...] }`) with `id`, bilingual `name`/`description`, `active`, `price`, and `price_unit`. Airport transfer may also include `vehicle_categories` and a `vehicle_prices` map; a missing vehicle rate remains quote-required rather than inheriting another vehicle's price. Admin updates to this catalog control customer visibility and pricing per airport.

The manager Additional Services page loads `GET /manager/addons?airport_code={code}` and saves the airport catalog with `PUT /manager/addons` using `{ "airport_code": "DAC", "addons": [...] }`. Each add-on contains `id`, `icon`, bilingual `name`/`description`, `active`, `price` (nullable for quote-required), `price_unit`, and optional `vehicle_categories`, `vehicle_prices`, and `medical_services`. These routes must require `auth:sanctum` and the manager role, and writes must update the same catalog returned by `GET /addons`.

Supported request details include transfer `{ pickup, dropoff, vehicle_category }`, luggage `{ bags }`, medical `{ services, notes }`, tour `{ city, language, notes }`, hotel `{ destination, notes }`, plus wheelchair/lounge/food notes. Booking creation sends these in `addon_details` keyed by add-on ID. Per-person wheelchair and per-bag wrapping prices are multiplied by their selected quantity. Transfer rates must match the chosen vehicle category.

If an active add-on has no configured price, the customer can submit a quote request. The booking is sent with `pricing_status: "quote_required"` and `amount: null`; bKash is not initiated until the server/Admin supplies a final amount. The booking should remain in an awaiting-quote state until then.

## Flight information on bookings

Before continuing to the booking summary, customers must provide airline, flight number, flight date (`DD-MM-YYYY`), flight time (`HH:MM`, 24-hour), origin, destination, passenger name, and mobile number. Date/time formats and real calendar dates are validated. Booking requests keep the existing top-level fields and also include a structured `flight` object with `airline`, `number`, `date`, `time`, `origin`, `destination`, optional `booking_reference` (PNR), and optional `additional_information`.

The Laravel booking endpoint should persist that flight object with the booking and use the identifiers/details to associate the arriving or departing passenger with the correct flight. PNR and additional flight information are optional; required core flight details are not.

Passenger counts are sent as `passengers: { adults, children, elderly, total }`. If the customer enables passenger detail collection, `passenger_details` contains one `{ type, name, assistance_notes }` entry per counted passenger; names are required while this option is enabled, and assistance notes are optional. When the option is off, `passenger_details` is an empty array. The backend should store these details only with the booking and apply its normal access controls for passenger data.

## Booking summary

Before confirmation, the review shows airport and direction, protocol service, flight details, passenger/contact details, selected add-ons and their operational choices, package and add-on charges, subtotal, discount status, and total payable. Wheelchair assistance is charged per passenger and luggage wrapping per bag; transfer uses the selected vehicle's configured rate. If an add-on is quote-required, the review shows known charges and leaves the final total pending rather than inventing a price.

When an authorized pricing flow applies a discount before review, attach its validated amount as `discount_amount` or `{ "discount": { "amount": 250 } }` on the booking draft; the summary subtracts it from the subtotal. No discount is shown when no validated discount is supplied. The booking API must independently validate all client totals and discounts before creating the payment amount.

## Online bKash payment

The app creates the booking first with `POST /bookings` and requires a real server booking ID; it never substitutes a local demo ID. The response should include the canonical `amount` and `pricing_status`. The server must validate the submitted summary and reject any amount mismatch. For bKash, the app then calls `POST /payments/bkash/create` with `{ "booking_id": "...", "amount": 1500 }`. The server must recalculate/validate the payable amount from the stored booking, create a bKash checkout, and return `{ "payment_id": "...", "redirect_url": "https://..." }` (the client also accepts the provider-style `paymentID` and `bkashURL` keys).

After the customer returns from checkout, the app calls `POST /payments/bkash/verify` with `{ "payment_id": "..." }`. Only a server response containing `verified: true`, `payment.status: "paid"`, the persisted payment record, and the associated booking can mark the booking confirmed in the app. Pending, failed, cancelled, or unverified results remain unconfirmed and can be checked/retried.

The Laravel backend must verify/execute the transaction with bKash server-to-server; never trust a browser redirect or client-provided success state. Store a payment record linked by `booking_id`, including the bKash payment/transaction IDs, validated amount/currency, status, and timestamps. Make payment creation idempotent and update booking status only after successful verification. A quote-required booking cannot initiate bKash until the server/Admin sets a final payable amount.

Customer payment history is loaded from `GET /customers/payments/history` with the customer's bearer token. Return only that customer's persisted payment records, including payment ID/reference, booking ID, method, amount/currency, status, refund status, and timestamps.

Admin payment management uses `GET /manager/payments?status={status}&search={query}` and expects payment records plus optional summary totals. The endpoint must require `auth:sanctum` and the manager role. Refunds are submitted with `POST /manager/payments/{paymentId}/refund` and `{ "amount": null, "reason": "..." }`; `amount: null` requests the full remaining eligible amount. The backend must re-check business rules, original payment status, refundable balance, permissions, and idempotency, then process the refund with bKash and persist its status/reference. The client only displays the refund action when the server returns `refund_eligible: true`; a refund request is not shown as completed until the server payment record confirms it.

## Protocol assistant allocation

Before showing the booking review, the customer app sends `POST /staff-allocation/quote` with `airport_code`, `service_id`, `service_category`, `service_type`, `passenger_count` (`adults`, `children`, `elderly`, `total`), and `special_assistance` (`wheelchair`, `medical`, and passenger notes). The response should include `required_staff` and may include a matched rule identifier/description. The app displays only this server-calculated value; when no quote is available, it does not invent a local headcount. Booking creation also includes the same `staffing_context`.

Managers configure rules through `GET /manager/staff-allocation-rules` and `PUT /manager/staff-allocation-rules` with a `{ "rules": [...] }` body. Each rule has `airport_code` (`*` for any), `service_category` (`arrival`/`departure`), `service_id` (`*` for any), inclusive `min_passengers`/optional `max_passengers`, `special_assistance` (`any`, `none`, `wheelchair`, `medical`, or `other`), and `required_staff`. These routes must require `auth:sanctum` plus the manager role. The server owns rule matching, overlap/priority resolution, and must recompute the final staff requirement when creating a booking instead of trusting the client quote.
