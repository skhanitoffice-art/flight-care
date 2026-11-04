import os
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(BASE_DIR, 'web')
DIST_DIR = os.path.join(BASE_DIR, 'dist')

SERVICES = [
    {
        'slug': 'meet-and-greet-dhaka-airport',
        'title': 'Dhaka Airport Meet and Greet Service | Flight Care HSIA',
        'meta_desc': 'Book premier 24/7 Dhaka Airport Meet and Greet Service at Hazrat Shahjalal International Airport (HSIA). Fast-track arrival, departure, luggage porter & VIP escort.',
        'h1': 'Dhaka Airport Meet and Greet Service – Flight Care',
        'subtitle': 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দরে পেশাদার মিট অ্যান্ড গ্রিট ও ভিআইপি প্রোটোকল সার্ভিস',
        'service_type': 'Airport Meet and Greet',
        'price': '৳১,০০০ / যাত্রী (Standard ৳৫০০, VIP ৳১,৫০০)',
        'breadcrumbs': [('Home', 'https://flightcaresbd.com/'), ('Meet & Greet Dhaka', 'https://flightcaresbd.com/meet-and-greet-dhaka-airport/')],
        'content': '''
        <p>Flight Care offers the most trusted and reliable <strong>Dhaka Airport Meet and Greet Service</strong> at Hazrat Shahjalal International Airport (HSIA), Dhaka, Bangladesh. Whether you are arriving in Dhaka from abroad, catching an international departure, or connecting on a domestic flight, our dedicated protocol officers ensure a seamless, hassle-free airport journey.</p>
        <h3>What We Provide:</h3>
        <ul>
            <li><strong>Aerobridge & Gate Reception:</strong> Warm welcome right at the aircraft exit or arrival concourse with a personalized name placard.</li>
            <li><strong>Fast-Track Guidance:</strong> Dedicated escort through immigration queues, document verification, and customs clearance.</li>
            <li><strong>Luggage Porter Assistance:</strong> Retrieval of baggage from luggage carousels, heavy trolley handling, and safe loading to vehicle.</li>
            <li><strong>Wheelchair & Special Passenger Care:</strong> Gentle assistance for elderly parents, sick patients, and first-time travelers.</li>
            <li><strong>Pay After Service:</strong> Book online with zero advance deposit; pay securely only after your service is fully delivered.</li>
        </ul>
        ''',
        'faqs': [
            ("Where will the Flight Care protocol officer meet me?", "On arrival, our officer will meet you immediately as you exit the aerobridge or enter the arrival terminal gate with a personalized placard showing your name."),
            ("Can I pay after service at Dhaka Airport?", "Yes, Flight Care offers 100% peace of mind with 'Payment After Service'. You can pay via Cash, bKash, Nagad, or Bank Card after your service is completed."),
            ("How far in advance should I book?", "We recommend booking at least 3 to 6 hours before flight arrival or departure, though emergency bookings are accommodated 24/7.")
        ]
    },
    {
        'slug': 'arrival-assistance-dhaka-airport',
        'title': 'Dhaka Airport Arrival Assistance | HSIA Arrival Protocol',
        'meta_desc': 'Arriving at Hazrat Shahjalal International Airport (HSIA)? Book dedicated Dhaka Airport Arrival Assistance with gate reception, baggage collection, and fast-track guidance.',
        'h1': 'Dhaka Airport Arrival Assistance – HSIA Terminal 1 & 2',
        'subtitle': 'ঢাকা বিমানবন্দরে আগমনী যাত্রীদের জন্য এয়ারোব্রিজ অভ্যর্থনা ও পূর্ণাঙ্গ প্রোটোকল কেয়ার',
        'service_type': 'Airport Arrival Assistance',
        'price': '৳১,০০০ / যাত্রী',
        'breadcrumbs': [('Home', 'https://flightcaresbd.com/'), ('Arrival Assistance', 'https://flightcaresbd.com/arrival-assistance-dhaka-airport/')],
        'content': '''
        <p>Arriving at Dhaka's Hazrat Shahjalal International Airport can often be exhausting after long international flights. Flight Care's <strong>Dhaka Airport Arrival Assistance</strong> eliminates immigration queues, confusion over baggage carousels, and transport hassles.</p>
        <h3>Arrival Protocol Steps:</h3>
        <ol>
            <li><strong>Flight Tracking:</strong> Our team monitors your flight in real-time, adjusting for delays or early arrivals.</li>
            <li><strong>Placard Welcome:</strong> Meeting you at the aerobridge gate with an official digital or printed placard.</li>
            <li><strong>Immigration Guidance:</strong> Guiding you through the fastest immigration counters and arrival card formalities.</li>
            <li><strong>Baggage Handling:</strong> Identifying and loading your checked luggage onto airport trolleys.</li>
            <li><strong>Escort to Parking/Cabs:</strong> Guiding you safely past customs to your waiting family or rented car.</li>
        </ol>
        ''',
        'faqs': [
            ("What if my flight arrives late at night?", "Flight Care operates 24/7/365. Regardless of what time your flight lands, our protocol officer will be stationed at the gate."),
            ("Do you assist with Visa on Arrival?", "Yes, our officers guide eligible foreign travelers through the Visa on Arrival desk and documentation verification.")
        ]
    },
    {
        'slug': 'departure-assistance-dhaka-airport',
        'title': 'Dhaka Airport Departure Assistance | HSIA Fast-Track Departure',
        'meta_desc': 'Stress-free departures from Hazrat Shahjalal International Airport (HSIA). Airline check-in guidance, luggage wrapping, security clearance, and lounge escort.',
        'h1': 'Dhaka Airport Departure Assistance – Fast-Track Service',
        'subtitle': 'ঢাকা বিমানবন্দর থেকে বিদেশগামী যাত্রীদের চেক-ইন, ইমিগ্রেশন ও নিরাপত্তা ছাড়পত্র সহায়তা',
        'service_type': 'Airport Departure Assistance',
        'price': '৳১,০০০ / যাত্রী',
        'breadcrumbs': [('Home', 'https://flightcaresbd.com/'), ('Departure Assistance', 'https://flightcaresbd.com/departure-assistance-dhaka-airport/')],
        'content': '''
        <p>Flying out from Dhaka Airport? Avoid long lines and terminal confusion with Flight Care's <strong>Dhaka Airport Departure Assistance</strong>. Our protocol officers meet you curbside at the departures drop-off and support you all the way to your boarding gate.</p>
        <h3>Departure Services Included:</h3>
        <ul>
            <li><strong>Terminal Drop-Off Meet:</strong> Curbside greeting at Terminal 1 or 2 with dedicated porter support.</li>
            <li><strong>Airline Check-In:</strong> Priority assistance with baggage drop and boarding pass collection.</li>
            <li><strong>Luggage Wrapping:</strong> Guidance to official airport wrapping counters for baggage security.</li>
            <li><strong>Outgoing Immigration & Security:</strong> Smooth transit through immigration and hand luggage screening.</li>
            <li><strong>Boarding Gate or Lounge Escort:</strong> Comfortable guidance to airline lounges or departure boarding gates.</li>
        </ul>
        ''',
        'faqs': [
            ("Where does the officer meet departing passengers?", "Our officer meets you outside the departure concourse gates at Terminal 1 or Terminal 2 curbside."),
            ("Can you help with heavy luggage?", "Yes, dedicated airport porters will handle your luggage trolleys from vehicle drop-off straight to airline check-in counters.")
        ]
    },
    {
        'slug': 'baggage-assistance-dhaka-airport',
        'title': 'Airport Baggage Assistance Dhaka | HSIA Luggage Porter Care',
        'meta_desc': 'Professional airport baggage assistance & luggage porter service at Hazrat Shahjalal International Airport (HSIA), Dhaka. Safe luggage handling and trolley loading.',
        'h1': 'Airport Baggage Assistance Dhaka – Luggage Porter Service',
        'subtitle': 'ঢাকা বিমানবন্দরে ভারী লাগেজ বহন, ট্রলি পরিচালনা ও নিরাপদ পরিবহন সহায়তা',
        'service_type': 'Luggage Porter Assistance',
        'price': '৳৫০০ / ট্রলি বা ব্যাগ অনুরোধ',
        'breadcrumbs': [('Home', 'https://flightcaresbd.com/'), ('Baggage Assistance', 'https://flightcaresbd.com/baggage-assistance-dhaka-airport/')],
        'content': '''
        <p>Traveling with multiple heavy suitcases or bulky cargo? Flight Care provides authorized <strong>Airport Baggage Assistance in Dhaka</strong>, helping passengers manage luggage effortlessly from carousels to vehicle loading areas.</p>
        <h3>Luggage Porter Features:</h3>
        <ul>
            <li>Dedicated porter handling up to 4 heavy suitcases per standard trolley.</li>
            <li>Carousel identification and baggage claim verification.</li>
            <li>Damaged baggage reporting assistance with airline baggage lost & found desks.</li>
            <li>Customs inspection queue assistance and courteous guidance.</li>
            <li>Vehicle trunk loading at airport parking, ride-share, or rental areas.</li>
        </ul>
        ''',
        'faqs': [
            ("What happens if my luggage is delayed or lost?", "Our protocol officer will assist you in lodging the official Property Irregularity Report (PIR) with the airline baggage desk."),
            ("Is baggage wrapping included?", "Baggage wrapping is available as an add-on service for ৳400/bag.")
        ]
    },
    {
        'slug': 'vip-airport-protocol-dhaka',
        'title': 'Dhaka Airport VIP Protocol Service | VIP Meet & Greet HSIA',
        'meta_desc': 'Exclusive VIP Airport Protocol Service at Hazrat Shahjalal International Airport (HSIA). Fast-track immigration, executive escort, and VIP priority care.',
        'h1': 'Dhaka Airport VIP Protocol Service – Executive Care',
        'subtitle': 'ভিআইপি, ব্যবসায়ী, সরকারি প্রতিনিধি ও বিদেশি ডেলিগেটদের জন্য প্রিমিয়াম প্রোটোকল সেবা',
        'service_type': 'VIP Airport Protocol',
        'price': '৳১,৫০০ / যাত্রী (VIP First Class)',
        'breadcrumbs': [('Home', 'https://flightcaresbd.com/'), ('VIP Protocol', 'https://flightcaresbd.com/vip-airport-protocol-dhaka/')],
        'content': '''
        <p>Flight Care's <strong>Dhaka Airport VIP Protocol Service</strong> delivers an elevated standard of comfort, discretion, and speed for business executives, foreign investors, diplomats, and VIP travelers arriving in or departing from Bangladesh.</p>
        <h3>VIP Protocol Privileges:</h3>
        <ul>
            <li>Immediate priority escort through designated protocol and fast-track channels.</li>
            <li>Private protocol officer assigned exclusively to the VIP delegation.</li>
            <li>Complete baggage claim handling while passengers rest comfortably.</li>
            <li>Coordination with private drivers, embassy vehicles, or luxury car rentals.</li>
            <li>Seamless discretion and rapid transit through Hazrat Shahjalal International Airport.</li>
        </ul>
        ''',
        'faqs': [
            ("Can you handle foreign corporate delegations?", "Yes, we regularly handle multinational corporate delegations, garment buyers, and investor groups with customized placard reception.")
        ]
    },
    {
        'slug': 'wheelchair-assistance-dhaka-airport',
        'title': 'Dhaka Airport Wheelchair Assistance | Elderly & Patient Care',
        'meta_desc': 'Dedicated Dhaka Airport Wheelchair Assistance at HSIA. Compassionate protocol escort for elderly parents, sick patients, and mobility-impaired passengers.',
        'h1': 'Dhaka Airport Wheelchair Assistance – HSIA Elderly Care',
        'subtitle': 'বয়োজ্যেষ্ঠ পিতা-মাতা, অসুস্থ যাত্রী ও বিশেষ চাহিদাসম্পন্ন ভ্রমণকারীদের হুইলচেয়ার সেবা',
        'service_type': 'Wheelchair & Patient Assistance',
        'price': '৳৩০০ / হুইলচেয়ার সেবা (প্যাকেজ অতিরিক্ত)',
        'breadcrumbs': [('Home', 'https://flightcaresbd.com/'), ('Wheelchair Care', 'https://flightcaresbd.com/wheelchair-assistance-dhaka-airport/')],
        'content': '''
        <p>For elderly travelers, unwell patients, or passengers with limited mobility, navigating Dhaka Airport's long terminal concourses can be challenging. Flight Care provides dedicated <strong>Dhaka Airport Wheelchair Assistance</strong> with trained, compassionate protocol staff.</p>
        <h3>Wheelchair Care Highlights:</h3>
        <ul>
            <li>Pre-arranged comfortable wheelchair waiting at the aircraft door or terminal entry.</li>
            <li>Dedicated assistant staying with the passenger throughout immigration, baggage collection, and customs.</li>
            <li>Careful escort through ramps and elevators to airport pick-up vehicles or ambulances.</li>
            <li>Real-time WhatsApp updates to anxious family members waiting outside.</li>
        </ul>
        ''',
        'faqs': [
            ("Can a family member accompany the wheelchair officer?", "Depending on airport security regulations, ticketed companions can stay alongside the wheelchair throughout the terminal.")
        ]
    },
    {
        'slug': 'dhaka-airport-meet-greet-price',
        'title': 'Dhaka Airport Meet and Greet Charges & Price List | Flight Care',
        'meta_desc': 'Transparent pricing for Dhaka Airport Meet and Greet Services. Standard ৳500, Premium ৳1,000, VIP ৳1,500. No hidden fees. Pay after service at HSIA.',
        'h1': 'Dhaka Airport Meet and Greet Price Bangladesh – 2026 Charges',
        'subtitle': 'ঢাকা বিমানবন্দরে মিট অ্যান্ড গ্রিট ও প্রোটোকল সেবার স্বচ্ছ ও নির্ধারিত মূল্য তালিকা',
        'service_type': 'Airport Pricing',
        'price': '৳৫০০ থেকে ৳১,৫০০ BDT',
        'breadcrumbs': [('Home', 'https://flightcaresbd.com/'), ('Pricing Guide', 'https://flightcaresbd.com/dhaka-airport-meet-greet-price/')],
        'content': '''
        <p>Flight Care believes in complete price transparency. Below is our official tariff for Meet and Greet and Protocol services at Hazrat Shahjalal International Airport (HSIA), Dhaka. All rates are in Bangladeshi Taka (BDT) with no hidden fees.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
                <tr style="background: #0F2A4A; color: #FFF;">
                    <th style="padding: 12px; border: 1px solid #CBD5E1; text-align: left;">প্যাকেজ (Package)</th>
                    <th style="padding: 12px; border: 1px solid #CBD5E1; text-align: left;">মূল্য (Price)</th>
                    <th style="padding: 12px; border: 1px solid #CBD5E1; text-align: left;">প্রধান সুবিধাসমূহ (Key Features)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 12px; border: 1px solid #CBD5E1;"><strong>Standard Economy</strong></td>
                    <td style="padding: 12px; border: 1px solid #CBD5E1;">৳৫০০ / জন</td>
                    <td style="padding: 12px; border: 1px solid #CBD5E1;">সাধারণ টার্মিনাল দিকনির্দেশনা, লাগেজ ট্রলি সহায়তা ও সাশ্রয়ী মিট অ্যান্ড গ্রিট</td>
                </tr>
                <tr style="background: #F0FDF4;">
                    <td style="padding: 12px; border: 1px solid #CBD5E1;"><strong>Premium Business ⭐</strong></td>
                    <td style="padding: 12px; border: 1px solid #CBD5E1;">৳১,০০০ / জন</td>
                    <td style="padding: 12px; border: 1px solid #CBD5E1;">এয়ারোব্রিজ গেট অভ্যর্থনা, নেম প্লাকার্ড, ফাস্ট-ট্র্যাক ইমিগ্রেশন ও লাগেজ বহন</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #CBD5E1;"><strong>VIP First Class</strong></td>
                    <td style="padding: 12px; border: 1px solid #CBD5E1;">৳১,৫০০ / জন</td>
                    <td style="padding: 12px; border: 1px solid #CBD5E1;">সর্বোচ্চ অগ্রাধিকার প্রোটোকল, ভিআইপি ফাস্ট-ট্র্যাক, ডেডিকেটেড অফিসার ও ভেহিকেল এসকর্ট</td>
                </tr>
            </tbody>
        </table>
        ''',
        'faqs': [
            ("Are there any hidden airport counter charges?", "No. The price listed is the complete fee. Additional services like luggage wrapping (৳400) or wheelchair (৳300) are only added if requested.")
        ]
    },
    {
        'slug': 'corporate-airport-assistance',
        'title': 'Corporate Airport Assistance Dhaka | Executive VIP Travel Partner',
        'meta_desc': 'Corporate airport protocol contracts, garment buyer meet & greet, and executive travel assistance at Hazrat Shahjalal International Airport (HSIA), Dhaka.',
        'h1': 'Corporate Airport Assistance Dhaka – Business Protocol',
        'subtitle': 'কর্পোরেট প্রতিষ্ঠান, বায়িং হাউস ও বিদেশি বিনিয়োগকারীদের জন্য প্রিমিয়াম এয়ারপোর্ট চুক্তি',
        'service_type': 'Corporate Protocol',
        'price': 'Custom Corporate Billing / Monthly Retainer',
        'breadcrumbs': [('Home', 'https://flightcaresbd.com/'), ('Corporate Assistance', 'https://flightcaresbd.com/corporate-airport-assistance/')],
        'content': '''
        <p>Flight Care is the dedicated airport protocol partner for leading corporations, foreign garment buying offices, travel agencies, and embassies operating in Bangladesh. We provide professional corporate billing, priority dispatch, and executive airport transfers.</p>
        <h3>Corporate Account Benefits:</h3>
        <ul>
            <li>Monthly corporate invoicing and credit payment terms.</li>
            <li>Customized branded placards featuring your company logo and guest names.</li>
            <li>Dedicated account manager available 24/7 on WhatsApp and phone.</li>
            <li>Comprehensive coordination with private airport chauffeurs and security teams.</li>
        </ul>
        ''',
        'faqs': [
            ("How do we sign a corporate agreement?", "Contact our Corporate Desk at 01347-570000 or email corporate@flightcaresbd.com for tailored proposals.")
        ]
    },
    {
        'slug': 'contact',
        'title': 'Contact Flight Care | 24/7 Dhaka Airport Protocol Desk',
        'meta_desc': 'Contact Flight Care 24/7 Airport Support Desk at Hazrat Shahjalal International Airport (HSIA). Hotline: 01347-570000, WhatsApp: 01347-570001.',
        'h1': 'Contact Flight Care – 24/7 Airport Assistance Hotline',
        'subtitle': '২৪/৭ হটলাইন, অফিস লোকেশন ও সরাসরি বুকিং সাপোর্ট',
        'service_type': 'Customer Support',
        'price': 'Free Inquiries & Consultations',
        'breadcrumbs': [('Home', 'https://flightcaresbd.com/'), ('Contact Us', 'https://flightcaresbd.com/contact/')],
        'content': '''
        <p>Need urgent airport assistance, have questions regarding your upcoming flight, or want to verify booking status? Our 24/7 airport customer support team is always ready to assist you.</p>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p><strong>📞 24/7 Central Hotline:</strong> <a href="tel:+8801347570000" style="color: #0284C7; font-weight: 700;">+880 1347-570000</a></p>
            <p><strong>💬 Front Desk WhatsApp (Primary):</strong> <a href="https://wa.me/8801347570001" style="color: #16A34A; font-weight: 700;">+880 1347-570001</a></p>
            <p><strong>💬 Front Desk WhatsApp (Secondary):</strong> <a href="https://wa.me/8801347570002" style="color: #16A34A; font-weight: 700;">+880 1347-570002</a></p>
            <p><strong>📧 Support Email:</strong> <a href="mailto:book@flightcaresbd.com" style="color: #0284C7;">book@flightcaresbd.com</a></p>
            <p><strong>📍 Airport Counter:</strong> Terminal 1 & 2 Arrival Concourse, Hazrat Shahjalal International Airport (HSIA), Kurmitola, Dhaka 1229, Bangladesh.</p>
            <p><strong>🏛️ Legal Trade License:</strong> TRAD/DNCC/004721/2024 (Dhaka North City Corporation, Bangladesh)</p>
        </div>
        ''',
        'faqs': [
            ("Are your phone numbers reachable 24 hours?", "Yes, both 01347-570000 and WhatsApp 01347-570001 / 01347-570002 operate 24 hours a day, 7 days a week.")
        ]
    }
]

GUIDES = [
    {
        'slug': 'how-to-book-meet-and-greet-dhaka-airport',
        'title': 'How to Book Meet and Greet Service at Dhaka Airport | Guide',
        'meta_desc': 'Step-by-step guide on how to book Meet and Greet airport protocol service at Hazrat Shahjalal International Airport (HSIA), Dhaka. Fast online booking tips.',
        'h1': 'How to Book Meet and Greet Service at Dhaka Airport',
        'subtitle': 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দরে মিট অ্যান্ড গ্রিট বুকিং করার সহজ গাইডলাইন',
        'content': '''
        <p>Booking an airport meet and greet service in Dhaka is easy and takes less than 2 minutes on Flight Care. Follow these simple steps to ensure a stress-free arrival or departure:</p>
        <ol>
            <li><strong>Select Flight Direction:</strong> Choose whether you need <em>Arrival (আগমন)</em> or <em>Departure (বহির্গমন)</em> assistance.</li>
            <li><strong>Provide Flight Details:</strong> Enter your flight number (e.g. BG 028, EK 582, SQ 446) and service date.</li>
            <li><strong>Choose Package:</strong> Select Economy (৳500), Premium Business (৳1,000), or VIP First Class (৳1,500).</li>
            <li><strong>Add Optional Services:</strong> Select wheelchair assistance, luggage wrapping, or visa support if required.</li>
            <li><strong>Confirm with Pay After Service:</strong> No advance payment needed! Enter passenger name and phone number to receive instant confirmation.</li>
        </ol>
        '''
    },
    {
        'slug': 'dhaka-airport-meet-and-greet-price-guide',
        'title': 'Dhaka Airport Meet and Greet Service Price Guide | HSIA Fees',
        'meta_desc': 'Comprehensive pricing guide for Meet & Greet services at Hazrat Shahjalal International Airport (HSIA). Learn about package costs, tipping norms, and payment methods.',
        'h1': 'Dhaka Airport Meet and Greet Service Price Guide',
        'subtitle': 'ঢাকা বিমানবন্দর মিট অ্যান্ড গ্রিট খরচের বিস্তারিত নির্দেশিকা ও টিপস',
        'content': '''
        <p>Understanding airport assistance costs helps passengers choose the right service level for their journey. Flight Care provides fixed-rate, transparent pricing:</p>
        <ul>
            <li><strong>Standard Package (৳500):</strong> Affordable assistance for budget travelers and domestic connections.</li>
            <li><strong>Premium Business Package (৳1,000):</strong> The most popular choice for international travelers with aerobridge reception and fast-track guidance.</li>
            <li><strong>VIP First Class (৳1,500):</strong> Full priority protocol for corporate leaders, investors, and families requiring maximum care.</li>
            <li><strong>Zero Hidden Costs:</strong> Free flight delay monitoring and transparent BDT pricing.</li>
        </ul>
        '''
    },
    {
        'slug': 'arrival-assistance-hazrat-shahjalal-airport',
        'title': 'Arrival Assistance at Hazrat Shahjalal International Airport | Guide',
        'meta_desc': 'Complete guide to arriving at Dhaka Airport (HSIA). Navigating aerobridges, health desks, immigration counters, baggage carousels, and customs.',
        'h1': 'Arrival Assistance at Hazrat Shahjalal International Airport (HSIA)',
        'subtitle': 'ঢাকা বিমানবন্দরে পৌঁছানোর পর করণীয় ও ইমিগ্রেশন সহজ করার নিয়ম',
        'content': '''
        <p>Navigating Hazrat Shahjalal International Airport (HSIA) in Dhaka can feel overwhelming after a long journey. Here is a breakdown of what happens when you land:</p>
        <ol>
            <li><strong>Deplaning & Aerobridge:</strong> Your Flight Care officer meets you with your name placard.</li>
            <li><strong>Health & Transit Desks:</strong> Quick verification if arriving from specific health-monitored routes.</li>
            <li><strong>Immigration Clearance:</strong> Fast-track counter guidance for Bangladeshi passport holders or foreign visitors.</li>
            <li><strong>Luggage Carousel Claim:</strong> Our porter handles loading suitcases from the belt.</li>
            <li><strong>Customs Green Channel:</strong> Smooth transition to airport pick-up zone.</li>
        </ol>
        '''
    },
    {
        'slug': 'dhaka-airport-meet-and-greet-foreign-visitors',
        'title': 'Dhaka Airport Meet and Greet for Foreign Visitors & Expats',
        'meta_desc': 'Essential guide for foreign travelers, garment buyers, diplomats, and tourists visiting Bangladesh through Dhaka Airport (HSIA). Visa on arrival support.',
        'h1': 'Dhaka Airport Meet and Greet for Foreign Visitors & Expats',
        'subtitle': 'বিদেশি নাগরিক, বায়ার ও পর্যটকদের জন্য ঢাকা বিমানবন্দর অভ্যর্থনা গাইডলাইন',
        'content': '''
        <p>For foreign nationals visiting Bangladesh for business or leisure, first impressions matter. Flight Care specializes in protocol assistance for international guests:</p>
        <ul>
            <li><strong>Visa on Arrival (VoA) Assistance:</strong> Guidance with the $50 USD government fee payment desk and required landing documents.</li>
            <li><strong>Currency Exchange & SIM Cards:</strong> Escort to official bank booths and telecom counters for local eSIM/SIM acquisition.</li>
            <li><strong>Hotel Chauffeur Linkup:</strong> Connecting foreign travelers directly with hotel shuttles (e.g. Radisson Blu, Le Méridien, InterContinental).</li>
            <li><strong>English & Multilingual Communication:</strong> Courteous, English-speaking officers ensuring safety and clarity.</li>
        </ul>
        '''
    },
    {
        'slug': 'airport-assistance-elderly-passengers-bangladesh',
        'title': 'Airport Assistance for Elderly Passengers in Bangladesh | HSIA Care',
        'meta_desc': 'Helpful tips and services for senior citizens and elderly parents traveling through Hazrat Shahjalal International Airport (HSIA), Dhaka. Wheelchairs & care.',
        'h1': 'Airport Assistance for Elderly Passengers in Bangladesh',
        'subtitle': 'বয়োজ্যেষ্ঠ পিতা-মাতা ও প্রবীণ যাত্রীদের বিমানবন্দর যাত্রা আরামদায়ক করার টিপস',
        'content': '''
        <p>When elderly parents travel alone from Bangladesh to visit children in the UK, USA, Canada, or the Middle East, family members often worry about their safety in huge airport terminals. Flight Care offers specialized senior passenger care:</p>
        <ul>
            <li>Dedicated companion from drop-off straight to the aircraft door.</li>
            <li>Comfortable wheelchair support with smooth elevator navigation.</li>
            <li>Help with immigration forms, boarding passes, and medicine luggage.</li>
            <li>Real-time WhatsApp photos sent to children abroad confirming their parents have boarded safely.</li>
        </ul>
        '''
    },
    {
        'slug': 'dhaka-airport-departure-process-guide',
        'title': 'Dhaka Airport Departure Process: Step-by-Step Guide | HSIA Outbound',
        'meta_desc': 'Comprehensive departure guide for Hazrat Shahjalal International Airport (HSIA), Dhaka. Terminal entry, check-in, customs declaration, and boarding.',
        'h1': 'Dhaka Airport Departure Process: Step-by-Step Guide',
        'subtitle': 'ঢাকা বিমানবন্দর থেকে বিদেশযাত্রার সম্পূর্ণ ধাপসমূহ ও সময় ব্যবস্থাপনা',
        'content': '''
        <p>Ensure a smooth departure from Dhaka Airport with this step-by-step itinerary:</p>
        <ol>
            <li><strong>Arrive 3 to 4 Hours Prior:</strong> International flights from HSIA require arriving early due to highway traffic and terminal security.</li>
            <li><strong>Terminal Gate Entry:</strong> Meet your Flight Care officer outside Terminal 1 or 2 curbside.</li>
            <li><strong>Airline Check-In:</strong> Weight verification and boarding pass collection.</li>
            <li><strong>Outgoing Customs:</strong> Currency declaration if carrying over $10,000 USD equivalent.</li>
            <li><strong>Immigration Stamping:</strong> Passport inspection and boarding gate transit.</li>
        </ol>
        '''
    }
]

def generate_page_html(item, is_guide=False):
    slug = item['slug']
    title = item['title']
    meta_desc = item['meta_desc']
    h1 = item['h1']
    subtitle = item['subtitle']
    content = item['content']
    url = f"https://flightcaresbd.com/{'guides/' if is_guide else ''}{slug}/"

    faq_schema = []
    if 'faqs' in item and item['faqs']:
        for q, a in item['faqs']:
            faq_schema.append({
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a}
            })

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <title>{title}</title>
    <meta name="title" content="{title}" />
    <meta name="description" content="{meta_desc}" />
    <meta name="keywords" content="Dhaka Airport Meet and Greet Service, Meet and Greet Service Dhaka, Airport Meet and Greet Bangladesh, Meet and Greet Service Bangladesh, Hazrat Shahjalal Airport Meet and Greet, Airport Assistance Dhaka, Dhaka Airport VIP Protocol Service, Dhaka Airport Arrival Assistance, Dhaka Airport Departure Assistance, Airport Baggage Assistance Dhaka, Dhaka Airport Wheelchair Assistance, VIP Airport Assistance Bangladesh, Airport Meet and Greet Price Bangladesh, Dhaka Airport Meet and Greet Charges, Book Meet and Greet Dhaka Airport, Airport Meet and Greet for Foreign Visitors, Bangladesh Airport Protocol Service, ঢাকা এয়ারপোর্ট মিট এন্ড গ্রিট সার্ভিস, ঢাকা বিমানবন্দর যাত্রী সহায়তা, ঢাকা বিমানবন্দর ভিআইপি প্রোটোকল সার্ভিস" />
    <link rel="canonical" href="{url}" />
    <link rel="alternate" hreflang="x-default" href="{url}" />
    <link rel="alternate" hreflang="bn" href="{url}?lang=bn" />
    <link rel="alternate" hreflang="en" href="{url}?lang=en" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />

    <!-- Google Analytics 4 (GA4) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-FLIGHTCARE1"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){{dataLayer.push(arguments);}}
      gtag('js', new Date());
      gtag('config', 'G-FLIGHTCARE1', {{ 'anonymize_ip': true }});
    </script>

    <!-- Open Graph -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Flight Care - Airport Protocol & Meet and Greet" />
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{meta_desc}" />
    <meta property="og:url" content="{url}" />
    <meta property="og:image" content="https://flightcaresbd.com/flightcare-og-banner-1200x630.png" />

    <!-- Favicon & Styles -->
    <link rel="shortcut icon" href="/favicon.ico" />
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
        body {{ background-color: #F8FAFC; color: #0F172A; line-height: 1.6; }}
        header {{ background: linear-gradient(135deg, #071A2E 0%, #0F2A4A 100%); color: #FFF; padding: 18px 24px; border-bottom: 2px solid #F59E0B; }}
        .header-wrap {{ max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; }}
        .brand {{ font-size: 22px; font-weight: 900; color: #FFF; text-decoration: none; }}
        .nav-links a {{ color: #E2E8F0; text-decoration: none; font-size: 14px; margin-left: 18px; font-weight: 600; }}
        .nav-links a:hover {{ color: #F59E0B; }}
        .hero {{ background: linear-gradient(180deg, #071A2E 0%, #0A2540 100%); color: #FFF; padding: 50px 24px 60px; text-align: center; }}
        .hero h1 {{ font-size: 32px; font-weight: 900; margin-bottom: 12px; }}
        .hero p {{ font-size: 16px; color: #94A3B8; max-width: 760px; margin: 0 auto 24px; }}
        .cta-btns {{ display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }}
        .btn-gold {{ background: #F59E0B; color: #0F172A; font-weight: 800; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 15px; transition: transform 0.2s; }}
        .btn-gold:hover {{ transform: translateY(-2px); }}
        .btn-wa {{ background: #25D366; color: #FFF; font-weight: 800; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 15px; transition: transform 0.2s; }}
        .btn-wa:hover {{ transform: translateY(-2px); }}
        .container {{ max-width: 980px; margin: -30px auto 50px; background: #FFF; border-radius: 16px; padding: 36px 32px; box-shadow: 0 10px 25px rgba(15,23,42,0.06); border: 1px solid #E2E8F0; }}
        .breadcrumbs {{ font-size: 13px; color: #64748B; margin-bottom: 20px; }}
        .breadcrumbs a {{ color: #0284C7; text-decoration: none; }}
        .content-body h2, .content-body h3 {{ color: #0B3B60; margin: 24px 0 12px; }}
        .content-body p {{ margin-bottom: 16px; color: #334155; font-size: 16px; }}
        .content-body ul, .content-body ol {{ margin: 12px 0 20px 24px; color: #334155; }}
        .content-body li {{ margin-bottom: 8px; }}
        .faq-card {{ background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px 20px; border-radius: 10px; margin-bottom: 12px; }}
        .faq-card h4 {{ color: #0F172A; margin-bottom: 6px; }}
        .faq-card p {{ color: #475569; margin: 0; font-size: 14.5px; }}
        .badge-cert {{ display: inline-block; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #B45309; padding: 6px 14px; border-radius: 20px; font-size: 12.5px; font-weight: 700; margin-bottom: 16px; }}
        footer {{ background: #071A2E; color: #94A3B8; padding: 40px 24px; font-size: 13.5px; text-align: center; border-top: 1px solid #1E293B; }}
        footer a {{ color: #38BDF8; text-decoration: none; }}
        .footer-links {{ display: flex; justify-content: center; flex-wrap: wrap; gap: 16px; margin: 16px 0; }}
    </style>

    <!-- Schema Markup -->
    <script type="application/ld+json">
    {{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://flightcaresbd.com/"}},
            {{"@type": "ListItem", "position": 2, "name": "{title.split('|')[0].strip()}", "item": "{url}"}}
        ]
    }}
    </script>
</head>
<body>
    <header>
        <div class="header-wrap">
            <a href="https://flightcaresbd.com/" class="brand">✈️ Flight Care</a>
            <div class="nav-links">
                <a href="https://flightcaresbd.com/">Home</a>
                <a href="https://flightcaresbd.com/meet-and-greet-dhaka-airport/">Meet & Greet</a>
                <a href="https://flightcaresbd.com/arrival-assistance-dhaka-airport/">Arrival</a>
                <a href="https://flightcaresbd.com/departure-assistance-dhaka-airport/">Departure</a>
                <a href="https://flightcaresbd.com/dhaka-airport-meet-greet-price/">Pricing</a>
                <a href="https://flightcaresbd.com/contact/">Contact</a>
            </div>
        </div>
    </header>

    <section class="hero">
        <div class="badge-cert">🛡️ Govt. Registered Commercial Protocol Facilitator · HSIA Dhaka</div>
        <h1>{h1}</h1>
        <p>{subtitle}</p>
        <div class="cta-btns">
            <a href="https://flightcaresbd.com/?utm_source=seo_page&service={slug}" onclick="if(typeof gtag==='function'){{gtag('event','booking_form_start',{{'service':'{slug}'}});}}" class="btn-gold">✈️ Book Service Online</a>
            <a href="https://wa.me/8801347570001?text=Hello%20Flight%20Care,%20I%20am%20inquiring%20about%20{slug}" onclick="if(typeof gtag==='function'){{gtag('event','whatsapp_click',{{'target':'8801347570001'}});}}" class="btn-wa">💬 WhatsApp Support (01347-570001)</a>
        </div>
    </section>

    <main class="container">
        <div class="breadcrumbs">
            <a href="https://flightcaresbd.com/">Home</a> &rsaquo; <span>{title.split('|')[0].strip()}</span>
        </div>

        <div class="content-body">
            {content}

            {"<h3>Frequently Asked Questions (FAQ)</h3>" if ('faqs' in item and item['faqs']) else ""}
            {"".join([f'<div class="faq-card"><h4>{q}</h4><p>{a}</p></div>' for q, a in item.get('faqs', [])])}
        </div>

        <div style="margin-top: 36px; padding: 24px; background: #F0FDF4; border-radius: 12px; border: 1px solid #BBF7D0; text-align: center;">
            <h3 style="color: #166534; margin-bottom: 8px;">Ready to Book Your Dhaka Airport Protocol Service?</h3>
            <p style="color: #15803D; font-size: 15px; margin-bottom: 16px;">Zero advance deposit required. Pay securely after service completion at Hazrat Shahjalal International Airport.</p>
            <div class="cta-btns">
                <a href="https://flightcaresbd.com/?utm_source=cta&service={slug}" onclick="if(typeof gtag==='function'){{gtag('event','booking_form_start',{{'service':'{slug}'}});}}" class="btn-gold">Book Now in 2 Minutes</a>
                <a href="tel:+8801347570000" onclick="if(typeof gtag==='function'){{gtag('event','call_hotline_click',{{'phone':'+8801347570000'}});}}" class="btn-wa" style="background: #0284C7;">📞 Call Hotline: 01347-570000</a>
            </div>
        </div>
    </main>

    <footer>
        <p><strong>Flight Care</strong> — Govt. Registered Commercial Protocol Facilitator at Hazrat Shahjalal International Airport (HSIA), Dhaka.</p>
        <p>Trade License: TRAD/DNCC/004721/2024 · 24/7 Hotlines: +880 1347-570000 | WhatsApp: +880 1347-570001 / +880 1347-570002</p>
        <div class="footer-links">
            <a href="https://flightcaresbd.com/">Home</a> |
            <a href="https://flightcaresbd.com/meet-and-greet-dhaka-airport/">Meet & Greet</a> |
            <a href="https://flightcaresbd.com/arrival-assistance-dhaka-airport/">Arrival</a> |
            <a href="https://flightcaresbd.com/departure-assistance-dhaka-airport/">Departure</a> |
            <a href="https://flightcaresbd.com/baggage-assistance-dhaka-airport/">Baggage</a> |
            <a href="https://flightcaresbd.com/vip-airport-protocol-dhaka/">VIP Protocol</a> |
            <a href="https://flightcaresbd.com/wheelchair-assistance-dhaka-airport/">Wheelchair</a> |
            <a href="https://flightcaresbd.com/dhaka-airport-meet-greet-price/">Price Guide</a> |
            <a href="https://flightcaresbd.com/corporate-airport-assistance/">Corporate</a> |
            <a href="https://flightcaresbd.com/contact/">Contact Us</a>
        </div>
        <p>&copy; 2026 Flight Care. All rights reserved.</p>
    </footer>
</body>
</html>'''
    return html

def main():
    generated_count = 0
    for svc in SERVICES:
        slug = svc['slug']
        html = generate_page_html(svc, is_guide=False)
        for target_dir in [WEB_DIR, DIST_DIR]:
            dest_dir = os.path.join(target_dir, slug)
            os.makedirs(dest_dir, exist_ok=True)
            with open(os.path.join(dest_dir, 'index.html'), 'w', encoding='utf-8') as f:
                f.write(html)
        generated_count += 1
        print(f"Generated Service Page: /{slug}/")

    for g in GUIDES:
        slug = g['slug']
        html = generate_page_html(g, is_guide=True)
        for target_dir in [WEB_DIR, DIST_DIR]:
            dest_dir = os.path.join(target_dir, 'guides', slug)
            os.makedirs(dest_dir, exist_ok=True)
            with open(os.path.join(dest_dir, 'index.html'), 'w', encoding='utf-8') as f:
                f.write(html)
        generated_count += 1
        print(f"Generated Guide Page: /guides/{slug}/")

    print(f"Successfully generated {generated_count} dedicated SEO landing pages with GA4 and Event Tracking!")

if __name__ == '__main__':
    main()
