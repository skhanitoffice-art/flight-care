# Flight Care - Cloudflare WAF & DDoS Protection Configuration Guide
**Domain:** `flightcaresbd.com` | **Hosting:** Hostinger LiteSpeed Cloud | **Date:** 27 October 2026

---

## ১. ক্লাউডফ্লেয়ার (Cloudflare) সংযোগের প্রয়োজনীয়তা
Cloudflare একটি রিভার্স প্রক্সি এবং গ্লোবাল ওয়েব অ্যাপ্লিকেশন ফায়ারওয়াল (WAF)। এটি ফ্লাইট কেয়ার ডোমেইনের সামনে যুক্ত করলে:
* **DDoS Attack:** কোনো হ্যাকার আপনার সাইট ট্রাফিক দিয়ে ডাউন করতে পারবে না।
* **SMS & Bot Fraud:** স্বয়ংক্রিয় রোবট/স্ক্রিপ্ট ক্লাউড লেভেলেই চিনে ব্লক করে দিবে।
* **Free SSL & CDN:** সাইট ৩ গুণ দ্রুত লোড হবে এবং ব্রাউজার ট্র্যাফিক সম্পূর্ণ এনক্রিপ্টেড থাকবে।
* **Origin IP Masking:** আপনার আসল হোস্টিংগার সার্ভার আইপি ইন্টারনেটে গোপন থাকবে।

---

## ২. ধাপে ধাপে ক্লাউডফ্লেয়ার সেটআপ গাইড

### ধাপ ০১: ক্লাউডফ্লেয়ারে ডোমেইন যুক্ত করা
1. ব্রাউজারে যান: [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. ফ্রি একাউন্ট তৈরি করে লগইন করুন।
3. **"+ Add a Site"** বাটনে ক্লিক করুন।
4. আপনার ডোমেইন নাম লিখুন: `flightcaresbd.com`
5. প্ল্যান সিলেকশন পেজে নিচে স্ক্রোল করে **"Free ($0)"** প্ল্যান নির্বাচন করে **Continue** চাপুন।

### ধাপ ০২: ডিএনএস (DNS) রেকর্ড নিশ্চিতকরণ
* ক্লাউডফ্লেয়ার স্বয়ংক্রিয়ভাবে আপনার হোস্টিংগারের A রেকর্ড, CNAME ও MX রেকর্ডগুলো স্ক্যান করে নিবে।
* চেক করুন যে মূল ডোমেইন (`@`) এবং `www` এর পাশে **Proxy status: Proxied (Orange Cloud ☁️)** অন আছে।
* **Continue** চাপুন।

### ধাপ ০৩: হোস্টিংগারে নেমসার্ভার (Nameservers) পরিবর্তন
ক্লাউডফ্লেয়ার আপনাকে ২টি নেমসার্ভার প্রদান করবে (যেমন: `example.ns.cloudflare.com` ও `example2.ns.cloudflare.com`)।
1. **Hostinger hPanel**-এ লগইন করুন (`https://hpanel.hostinger.com`)।
2. **Domains** মেনুতে গিয়ে `flightcaresbd.com`-এ ক্লিক করুন।
3. বাম পাশের মেনু থেকে **DNS / Nameservers** অপশনে যান।
4. **"Change Nameservers"** বাটনে ক্লিক করে **"Custom Nameservers"** সিলেক্ট করুন।
5. ক্লাউডফ্লেয়ারের দেওয়া ২টি নেমসার্ভার পেস্ট করুন এবং **Save** চাপুন।
*(সাধারণত ৫ থেকে ১৫ মিনিটের মধ্যে নেমসার্ভার সক্রিয় হয়ে যায়।)*

---

## ৩. গুরুত্বপূর্ণ ক্লাউডফ্লেয়ার সিকিউরিটি সেটিংস (অবশ্যই অন করুন)

### ১. SSL/TLS এনক্রিপশন (Full Strict)
* Cloudflare ড্যাশবোর্ডে **SSL/TLS** মেনুতে যান।
* এনক্রিপশন মোড হিসেবে **"Full (Strict)"** নির্বাচন করুন।
* **Edge Certificates** ট্যাবে গিয়ে **"Always Use HTTPS"** এবং **"Automatic HTTPS Rewrites"** অপশন দুটি **ON** করে দিন।

### ২. বট প্রটেকশন (Bot Fight Mode - এসএমএস ফ্রড রোধ)
* Cloudflare ড্যাশবোর্ডে **Security** ➔ **Bots** অপশনে যান।
* **"Bot Fight Mode"** টগলটি **ON** করে দিন।
* *এটি স্বয়ংক্রিয় বট, ক্রলার এবং ওটিপি স্প্যামিং আক্রমণকারীদের ক্লাউডেই চ্যালেঞ্জ ছুড়ে আটকে দেবে।*

### ৩. সিকিউরিটি লেভেল (Security Level)
* **Security** ➔ **Settings**-এ যান।
* **Security Level** নির্বাচন করুন: **Medium** (স্বাভাবিক অবস্থায়) বা **High**।
* *যদি কখনো সাইটে হঠাৎ লাখ লাখ ফেইক ট্রাফিকের আক্রমণ (DDoS) হয়, তবে এই পেজের উপরে থাকা **"Under Attack Mode"** অন করে দিলে আক্রমণ সাথে সাথে স্তব্ধ হয়ে যাবে।*

### ৪. ডব্লিউএএফ রেট লিমিটিং রুল (WAF Rate Limiting)
* **Security** ➔ **WAF** ➔ **Rate Limiting Rules**-এ যান।
* **Create Rule**-এ ক্লিক করে লিখুন:
  * **Rule Name:** `Protect Payment & OTP Endpoints`
  * **If incoming request matches:** URI Path contains `/api/`
  * **Rate:** 10 requests per 1 minute
  * **Action:** Block or Managed Challenge

---

## ৪. সার্ভার সাইড ইন্টিগ্রেশন (ইতোমধ্যে কোডে কার্যকর)
* ফ্লাইট কেয়ারের সার্ভার কনফিগারেশন (`.htaccess`) ইতোমধ্যে ক্লাউডফ্লেয়ারের রিভার্স প্রক্সি হেডারের (`CF-Connecting-IP`) সাথে সংযুক্ত করা হয়েছে, যাতে কোনো অ্যাটাকার ক্লাউডফ্লেয়ারকে বাইপাস করে সরাসরি হোস্টিংগারে আক্রমণ করতে না পারে।

