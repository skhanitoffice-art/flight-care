# scripts/generate_frontdesk_excel.py
# Generates a comprehensive, beautifully-styled Excel master workbook for Flight Care Front Desk Officers.

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()

# Colors
NAVY = "0E2A47"
GOLD = "D97706"
GOLD_LIGHT = "FEF3C7"
BLUE_LIGHT = "EFF6FF"
BLUE_BORDER = "BAE6FD"
GREEN_LIGHT = "DCFCE7"
GREEN_BORDER = "86EFAC"
GRAY_LIGHT = "F8FAFC"
GRAY_BORDER = "CBD5E1"
WHITE = "FFFFFF"
DARK_GRAY = "334155"

font_title = Font(name="Segoe UI", size=16, bold=True, color=WHITE)
font_subtitle = Font(name="Segoe UI", size=11, italic=True, color="CBD5E1")
font_section_header = Font(name="Segoe UI", size=13, bold=True, color=NAVY)
font_table_header = Font(name="Segoe UI", size=11, bold=True, color=WHITE)
font_bold = Font(name="Segoe UI", size=10, bold=True, color="0F172A")
font_regular = Font(name="Segoe UI", size=10, color="1E293B")
font_italic = Font(name="Segoe UI", size=9, italic=True, color="64748B")
font_total = Font(name="Segoe UI", size=11, bold=True, color=NAVY)

fill_navy = PatternFill(start_color=NAVY, end_color=NAVY, fill_type="solid")
fill_gold = PatternFill(start_color=GOLD, end_color=GOLD, fill_type="solid")
fill_gold_light = PatternFill(start_color=GOLD_LIGHT, end_color=GOLD_LIGHT, fill_type="solid")
fill_blue_light = PatternFill(start_color=BLUE_LIGHT, end_color=BLUE_LIGHT, fill_type="solid")
fill_green_light = PatternFill(start_color=GREEN_LIGHT, end_color=GREEN_LIGHT, fill_type="solid")
fill_zebra = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
fill_card = PatternFill(start_color=GRAY_LIGHT, end_color=GRAY_LIGHT, fill_type="solid")

thin_border = Border(
    left=Side(style='thin', color=GRAY_BORDER),
    right=Side(style='thin', color=GRAY_BORDER),
    top=Side(style='thin', color=GRAY_BORDER),
    bottom=Side(style='thin', color=GRAY_BORDER)
)

header_border = Border(
    left=Side(style='thin', color=NAVY),
    right=Side(style='thin', color=NAVY),
    top=Side(style='thin', color=NAVY),
    bottom=Side(style='medium', color=NAVY)
)

total_border = Border(
    left=Side(style='thin', color=GRAY_BORDER),
    right=Side(style='thin', color=GRAY_BORDER),
    top=Side(style='thin', color=NAVY),
    bottom=Side(style='double', color=NAVY)
)

align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
align_right = Alignment(horizontal="right", vertical="center")

# ==============================================================================
# SHEET 1: 📋 নির্দেশিকা ও টিউটোরিয়াল (Guide & Tutorial)
# ==============================================================================
ws1 = wb.active
ws1.title = "📋 টিউটোরিয়াল ও নির্দেশিকা"
ws1.views.sheetView[0].showGridLines = True

# Title block
ws1.merge_cells("A1:H2")
title_cell = ws1["A1"]
title_cell.value = "✈️ FLIGHT CARE CONCIERGE – ফ্রন্ট ডেস্ক অপারেশনাল ম্যানুয়াল ও এক্সেল নির্দেশিকা"
title_cell.font = font_title
title_cell.fill = fill_navy
title_cell.alignment = Alignment(horizontal="center", vertical="center")

ws1.merge_cells("A3:H3")
sub_cell = ws1["A3"]
sub_cell.value = "হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর (HSIA), ঢাকা | ফ্রন্ট ডেস্ক ও কাউন্টার অফিসারদের প্রশিক্ষণ ও দৈনিক কাজের নির্দেশিকা"
sub_cell.font = Font(name="Segoe UI", size=10.5, italic=True, color="64748B")
sub_cell.alignment = Alignment(horizontal="center", vertical="center")

# Section: Overview
row = 5
ws1.cell(row=row, column=1, value="📌 ১. এই এক্সেল ওয়ার্কবুকের শীট পরিচিতি (Workbook Sheets Overview)").font = font_section_header
row += 1

sheets_info = [
    ("১. টিউটোরিয়াল ও নির্দেশিকা (এই শীট)", "কাজের যাবতীয় নিয়ম, সফটওয়্যারের সাথে মিলানোর পদ্ধতি ও সতর্কতাসমূহ।"),
    ("২. কাউন্টার দৈনিক সার্ভিস লগ (Daily Count)", "ফটোকপি, প্রিন্টিং, ফর্ম ফিলাপ ও অন্যান্য কাউন্টার সেবার হিসাব ও ফর্মুলা।"),
    ("৩. অফলাইন যাত্রী বুকিং লগ (Passenger Bookings)", "ওয়াক-ইন যাত্রী, ভিআইপি প্রোটোকল, মিট অ্যান্ড গ্রিট বুকিং ও অ্যাসাইনমেন্ট।"),
    ("৪. দৈনিক ক্যাশ ও রাজস্ব সারসংক্ষেপ (Cash Summary)", "দিনভিত্তিক মোট আয়, কাউন্টার খরচ, নেট জমা ও শিফট হ্যান্ডওভার হিসাব।"),
]

ws1.cell(row=row, column=1, value="শীটের নাম").font = font_table_header
ws1.cell(row=row, column=1).fill = fill_navy
ws1.cell(row=row, column=1).alignment = align_left
ws1.merge_cells(f"B{row}:H{row}")
ws1.cell(row=row, column=2, value="কাজের বিবরণ ও ব্যবহার").font = font_table_header
ws1.cell(row=row, column=2).fill = fill_navy
ws1.cell(row=row, column=2).alignment = align_left
row += 1

for s_name, s_desc in sheets_info:
    ws1.cell(row=row, column=1, value=s_name).font = font_bold
    ws1.cell(row=row, column=1).fill = fill_card
    ws1.cell(row=row, column=1).border = thin_border
    ws1.merge_cells(f"B{row}:H{row}")
    desc_cell = ws1.cell(row=row, column=2, value=s_desc)
    desc_cell.font = font_regular
    desc_cell.fill = fill_card
    desc_cell.border = thin_border
    row += 1

row += 1
# Section: Step-by-Step Tutorial
ws1.cell(row=row, column=1, value="📝 ২. ফ্রন্ট ডেস্ক অফিসারের দৈনিক রুটিন ও ধাপে ধাপে কাজের নিয়ম (Step-by-Step Instructions)").font = font_section_header
row += 1

steps = [
    ("ধাপ ১: শিফট শুরু (Shift Startup)", "ডিউটি শুরুর সাথে সাথে কাউন্টারে তারিখ, নিজের নাম ও শিফট (Morning / Evening / Night) নির্বাচন করুন। ক্যাশ ড্রয়ার ও প্রিন্টার/ফটোকপি পেপারের স্টক যাচাই করে নিন।"),
    ("ধাপ ২: সার্ভিস এন্ট্রি (Service Entry)", "যখনই কোনো যাত্রী ফটোকপি, টিকিট/ভিসা প্রিন্ট বা ফর্ম ফিলাপ নেবেন, সাথে সাথে সংখ্যা লিখুন। 'Daily Total (মোট কাজ)' ঘরে ফর্মুলা দেওয়া আছে, স্বয়ংক্রিয়ভাবে হিসাব হবে।"),
    ("ধাপ ৩: অফলাইন বুকিং (Passenger Bookings)", "কোনো যাত্রী কাউন্টারে এসে VIP Protocol বা Meet & Greet চাইলে ৩নং শীটে যাত্রীর নাম, মোবাইল নম্বর, ফ্লাইট নং ও সার্ভিস প্যাকেজ লিখুন এবং সফটওয়্যারে '+ Offline Booking'-এ এন্ট্রি দিন।"),
    ("ধাপ ৪: পেমেন্ট ও রসিদ (Cash & Receipt)", "ক্যাশ বা বিকাশ/নগদে টাকা বুঝে নিয়ে অবশ্যই কাস্টমারকে মানিম্যামো/রসিদ প্রদান করুন। রসিদ নম্বর বা TrxID এক্সেলে লিপিবদ্ধ করুন।"),
    ("ধাপ ৫: শিফট সমাপ্তি ও ক্যাশ হ্যান্ডওভার (Shift Handover)", "শিফট শেষে এক্সেলের মোট টাকার সাথে ড্রয়ারের ক্যাশ মিলিয়ে নিন। পরবর্তী শিফট অফিসার বা ডিউটি ম্যানেজারের কাছে ক্যাশ বুঝিয়ে দিয়ে ৪নং শীটে স্বাক্ষর নিন।"),
]

for s_title, s_detail in steps:
    ws1.cell(row=row, column=1, value=s_title).font = font_bold
    ws1.cell(row=row, column=1).fill = fill_blue_light
    ws1.cell(row=row, column=1).border = thin_border
    ws1.merge_cells(f"B{row}:H{row}")
    d_cell = ws1.cell(row=row, column=2, value=s_detail)
    d_cell.font = font_regular
    d_cell.fill = fill_blue_light
    d_cell.border = thin_border
    row += 1

row += 1
# Section: Important Rules & Precautions
ws1.cell(row=row, column=1, value="⚠️ ৩. জরুরি সতর্কতা ও নিয়মানুবর্তিতা (Golden Rules for Front Desk)").font = font_section_header
row += 1

rules = [
    ("১. ফর্মুলাযুক্ত ঘর (Formula Cells)", "যেসব ঘরে স্বয়ংক্রিয় যোগফল ফর্মুলা (=SUM) আছে, যেমন: 'Daily Total (মোট কাজ)' ও 'AMOUNT', সেগুলোতে ভুলেও হাতে কিছু টাইপ করবেন না। কোনো ভুল হলে Ctrl+Z চাপুন।"),
    ("২. সফটওয়্যারের সাথে সিঙ্ক (Software Sync)", "কাউন্টার থেকে কোনো অফলাইন বুকিং নিলে অবশ্যই ফ্লাইট কেয়ার সফটওয়্যারে '+ Offline Booking' বাটনে ক্লিক করে সাথে সাথে অন্তর্ভুক্ত করতে হবে।"),
    ("৩. রসিদ বাধ্যতামূলক (Mandatory Receipts)", "সফটওয়্যারের প্রিন্ট ক্যাশ মেমো / মানিম্যামো ছাড়া কোনো যাত্রীর কাছ থেকে ক্যাশ টাকা গ্রহণ সম্পূর্ণ নিষিদ্ধ।"),
    ("৪. সিক্রেট ভল্ট ও প্রাইভেসী (Secret Vault Privacy)", "সফটওয়্যারে 'db' লেখার উপর স্পর্শকাতর কোনো কাজ বা অপ্রয়োজনীয় ক্লিক করবেন না। বহিরাগত কেউ তাকালে সব সময় সাধারণ অডিটর মোডে সফটওয়্যার ওপেন রাখবেন।"),
]

for r_title, r_desc in rules:
    ws1.cell(row=row, column=1, value=r_title).font = font_bold
    ws1.cell(row=row, column=1).fill = fill_gold_light
    ws1.cell(row=row, column=1).border = thin_border
    ws1.merge_cells(f"B{row}:H{row}")
    r_cell = ws1.cell(row=row, column=2, value=r_desc)
    r_cell.font = font_regular
    r_cell.fill = fill_gold_light
    r_cell.border = thin_border
    row += 1

row += 2
ws1.merge_cells(f"A{row}:H{row}")
ws1.cell(row=row, column=1, value="📞 ২৪/৭ সেন্ট্রাল কন্ট্রোল রুম হেল্পলাইন: +880 1347-570001 | হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা").font = Font(name="Segoe UI", size=10, bold=True, color="0369A1")
ws1.cell(row=row, column=1).alignment = align_center

ws1.column_dimensions['A'].width = 30
for c in ['B', 'C', 'D', 'E', 'F', 'G', 'H']:
    ws1.column_dimensions[c].width = 16

# ==============================================================================
# SHEET 2: 📊 কাউন্টার দৈনিক সার্ভিস লগ (Daily Counter Services)
# ==============================================================================
ws2 = wb.create_sheet(title="📊 কাউন্টার দৈনিক সার্ভিস লগ")
ws2.views.sheetView[0].showGridLines = True

# Title
ws2.merge_cells("A1:L2")
h2 = ws2["A1"]
h2.value = "FRONT DESK – DAILY SERVICE COUNT (কাউন্টার দৈনিক সেবা লগ)"
h2.font = font_title
h2.fill = fill_navy
h2.alignment = Alignment(horizontal="center", vertical="center")

ws2.merge_cells("A3:L3")
ws2["A3"].value = "Flight Care Concierge Ltd. | Hazrat Shahjalal International Airport (HSIA), Dhaka"
ws2["A3"].font = font_italic
ws2["A3"].alignment = Alignment(horizontal="center", vertical="center")

headers2 = [
    "Date\n(তারিখ)",
    "Shift\n(শিফট)",
    "Duty Officer\n(দায়িত্বরত অফিসার)",
    "Photocopy\n(কতটি)",
    "Printing\n(কতটি)",
    "Form Fill-up\n(কতটি)",
    "Luggage Wrap\n(ব্যাগ সিল)",
    "Other\n(অন্যান্য কাজ)",
    "Daily Total\n(মোট কাজ)",
    "AMOUNT ৳\n(আদায়কৃত টাকা)",
    "Payment Method\n(পেমেন্ট মাধ্যম)",
    "Remarks / Handover\n(মন্তব্য ও হস্তান্তর)",
]

header_row = 5
for col_idx, h_text in enumerate(headers2, start=1):
    cell = ws2.cell(row=header_row, column=col_idx, value=h_text)
    cell.font = font_table_header
    cell.fill = fill_navy
    cell.alignment = align_center
    cell.border = header_border

ws2.row_dimensions[header_row].height = 36

# Sample Data
sample_data2 = [
    ("27.10.2026", "Morning (06:00 - 14:00)", "Md. Rafiqul Islam", 45, 28, 6, 4, 3, 1420, "Cash", "Deposited to Desk Cash"),
    ("27.10.2026", "Evening (14:00 - 22:00)", "Tanvir Ahmed", 62, 35, 12, 8, 5, 2350, "Cash / bKash", "Handed over to Night Shift"),
    ("27.10.2026", "Night (22:00 - 06:00)", "Kamrul Hasan", 20, 15, 4, 3, 2, 850, "Cash", "Morning Shift Handover"),
    ("28.10.2026", "Morning (06:00 - 14:00)", "Md. Rafiqul Islam", 50, 30, 8, 5, 4, 1680, "Cash", "All receipts issued"),
    ("28.10.2026", "Evening (14:00 - 22:00)", "Tanvir Ahmed", 55, 40, 10, 6, 3, 2100, "bKash / Cash", "Checked with POS machine"),
    ("28.10.2026", "Night (22:00 - 06:00)", "Kamrul Hasan", 18, 12, 3, 2, 1, 720, "Cash", "Handover OK"),
]

current_row = 6
for row_data in sample_data2:
    date_val, shift_val, officer_val, photo, print_val, form, wrap, other, amt, pay_method, remarks = row_data
    ws2.cell(row=current_row, column=1, value=date_val).alignment = align_center
    ws2.cell(row=current_row, column=2, value=shift_val).alignment = align_left
    ws2.cell(row=current_row, column=3, value=officer_val).alignment = align_left
    ws2.cell(row=current_row, column=4, value=photo).alignment = align_center
    ws2.cell(row=current_row, column=5, value=print_val).alignment = align_center
    ws2.cell(row=current_row, column=6, value=form).alignment = align_center
    ws2.cell(row=current_row, column=7, value=wrap).alignment = align_center
    ws2.cell(row=current_row, column=8, value=other).alignment = align_center

    # Formula for Daily Total: SUM(D{row}:H{row})
    total_cell = ws2.cell(row=current_row, column=9, value=f"=SUM(D{current_row}:H{current_row})")
    total_cell.alignment = align_center
    total_cell.font = font_bold
    total_cell.fill = fill_blue_light

    amt_cell = ws2.cell(row=current_row, column=10, value=amt)
    amt_cell.alignment = align_right
    amt_cell.number_format = '#,##0 "৳"'
    amt_cell.font = font_bold

    ws2.cell(row=current_row, column=11, value=pay_method).alignment = align_center
    ws2.cell(row=current_row, column=12, value=remarks).alignment = align_left

    for c in range(1, 13):
        cell = ws2.cell(row=current_row, column=c)
        cell.border = thin_border
        if current_row % 2 == 1:
            if c != 9:
                cell.fill = fill_zebra
    current_row += 1

# Blank rows for user entry (25 empty rows)
start_empty = current_row
for i in range(25):
    for c in range(1, 13):
        cell = ws2.cell(row=current_row, column=c)
        cell.border = thin_border
        if c == 9:
            cell.value = f"=IF(COUNT(D{current_row}:H{current_row})>0, SUM(D{current_row}:H{current_row}), \"\")"
            cell.alignment = align_center
            cell.font = font_bold
            cell.fill = fill_blue_light
        elif c == 10:
            cell.alignment = align_right
            cell.number_format = '#,##0 "৳"'
        else:
            cell.alignment = align_center if c in [1, 4, 5, 6, 7, 8, 11] else align_left
        if current_row % 2 == 1 and c != 9:
            cell.fill = fill_zebra
    current_row += 1

# Total Summary Row
total_row2 = current_row
ws2.cell(row=total_row2, column=1, value="TOTAL SUMMARY (মোট যোগফল):").font = font_total
ws2.cell(row=total_row2, column=1).alignment = align_left
ws2.merge_cells(f"A{total_row2}:C{total_row2}")

for c in range(4, 9):
    col_letter = get_column_letter(c)
    cell = ws2.cell(row=total_row2, column=c, value=f"=SUM({col_letter}6:{col_letter}{total_row2-1})")
    cell.font = font_total
    cell.alignment = align_center
    cell.fill = fill_gold_light

amt_sum_cell = ws2.cell(row=total_row2, column=10, value=f"=SUM(J6:J{total_row2-1})")
amt_sum_cell.font = font_total
amt_sum_cell.alignment = align_right
amt_sum_cell.number_format = '#,##0 "৳"'
amt_sum_cell.fill = fill_gold_light

ws2.cell(row=total_row2, column=11, value="✓ All Accounts Checked").font = font_italic
ws2.cell(row=total_row2, column=11).alignment = align_center
ws2.cell(row=total_row2, column=12, value="Duty Manager Sign: ____________").font = font_bold
ws2.cell(row=total_row2, column=12).alignment = align_left

for c in range(1, 13):
    ws2.cell(row=total_row2, column=c).border = total_border

ws2.column_dimensions['A'].width = 13
ws2.column_dimensions['B'].width = 24
ws2.column_dimensions['C'].width = 20
ws2.column_dimensions['D'].width = 14
ws2.column_dimensions['E'].width = 14
ws2.column_dimensions['F'].width = 15
ws2.column_dimensions['G'].width = 15
ws2.column_dimensions['H'].width = 14
ws2.column_dimensions['I'].width = 15
ws2.column_dimensions['J'].width = 18
ws2.column_dimensions['K'].width = 18
ws2.column_dimensions['L'].width = 28

# ==============================================================================
# SHEET 3: ✈️ অফলাইন যাত্রী বুকিং লগ (Passenger Bookings)
# ==============================================================================
ws3 = wb.create_sheet(title="✈️ অফলাইন যাত্রী বুকিং লগ")
ws3.views.sheetView[0].showGridLines = True

ws3.merge_cells("A1:P2")
h3 = ws3["A1"]
h3.value = "OFFLINE PASSENGER BOOKING & CONCIERGE LOG (কাউন্টার যাত্রী বুকিং লগ)"
h3.font = font_title
h3.fill = fill_navy
h3.alignment = Alignment(horizontal="center", vertical="center")

ws3.merge_cells("A3:P3")
ws3["A3"].value = "Walk-in & Offline VIP Meet & Greet Protocol Registrations | Hazrat Shahjalal International Airport (HSIA)"
ws3["A3"].font = font_italic
ws3["A3"].alignment = Alignment(horizontal="center", vertical="center")

headers3 = [
    "SL\n(ক্রমিক)",
    "Date\n(তারিখ)",
    "Time\n(সময়)",
    "Booking ID\n(বুকিং রেফারেন্স)",
    "Passenger Name\n(যাত্রীর নাম)",
    "Phone Number\n(মোবাইল নম্বর)",
    "Flight No\n(ফ্লাইট নং)",
    "Airline\n(এয়ারলাইন)",
    "Direction\n(দিক)",
    "Package / Service\n(সার্ভিস প্যাকেজ)",
    "Pax\n(যাত্রী)",
    "Amount ৳\n(টাকা)",
    "Payment\n(পেমেন্ট অবস্থা)",
    "Assigned Officer\n(দায়িত্বরত অফিসার)",
    "Synced?\n(সফটওয়্যারে?)",
    "Remarks\n(মন্তব্য)",
]

header_row3 = 5
for col_idx, h_text in enumerate(headers3, start=1):
    cell = ws3.cell(row=header_row3, column=col_idx, value=h_text)
    cell.font = font_table_header
    cell.fill = fill_navy
    cell.alignment = align_center
    cell.border = header_border

ws3.row_dimensions[header_row3].height = 36

sample_bookings = [
    (1, "27.10.2026", "08:30 AM", "DAC-OFF-101", "Al-Haj Nurul Islam", "+8801711223344", "BG-084", "Biman Bangladesh", "Departure", "Standard Economy Protocol", 1, 1500, "Paid (Cash)", "Md. Jahirul Islam", "Yes ✓", "Wheelchair requested"),
    (2, "27.10.2026", "11:15 AM", "DAC-OFF-102", "Barrister Nazmul Huda", "+8801819556677", "EK-582", "Emirates", "Arrival", "Business / Premium Protocol", 2, 5000, "Paid (Card)", "Sohel Tanvir (Lead)", "Yes ✓", "Fast Track Immigration"),
    (3, "27.10.2026", "03:45 PM", "DAC-OFF-103", "Dr. Farzana Yasmin", "+8801912334455", "QR-638", "Qatar Airways", "Departure", "VIP First Class Protocol", 1, 4000, "Paid (bKash)", "Tariqul Hasan", "Yes ✓", "VIP Lounge Access"),
    (4, "28.10.2026", "07:20 AM", "DAC-OFF-104", "Kamal Hossain & Family", "+8801733445566", "SV-804", "Saudia", "Arrival", "Standard Economy Protocol", 3, 3500, "Paid (Cash)", "Md. Jahirul Islam", "Yes ✓", "Porter luggage assistance"),
    (5, "28.10.2026", "01:00 PM", "DAC-OFF-105", "Mahfuzur Rahman", "+8801611889900", "BS-314", "US-Bangla", "Departure", "Business / Premium Protocol", 1, 2500, "Paid (Cash)", "Sohel Tanvir (Lead)", "Yes ✓", "Boarding Pass fast lane"),
]

row3 = 6
for b in sample_bookings:
    ws3.cell(row=row3, column=1, value=b[0]).alignment = align_center
    ws3.cell(row=row3, column=2, value=b[1]).alignment = align_center
    ws3.cell(row=row3, column=3, value=b[2]).alignment = align_center
    ws3.cell(row=row3, column=4, value=b[3]).alignment = align_center
    ws3.cell(row=row3, column=4).font = font_bold
    ws3.cell(row=row3, column=5, value=b[4]).alignment = align_left
    ws3.cell(row=row3, column=6, value=b[5]).alignment = align_center
    ws3.cell(row=row3, column=7, value=b[6]).alignment = align_center
    ws3.cell(row=row3, column=8, value=b[7]).alignment = align_left
    ws3.cell(row=row3, column=9, value=b[8]).alignment = align_center
    ws3.cell(row=row3, column=10, value=b[9]).alignment = align_left
    ws3.cell(row=row3, column=11, value=b[10]).alignment = align_center
    
    amt_cell = ws3.cell(row=row3, column=12, value=b[11])
    amt_cell.alignment = align_right
    amt_cell.number_format = '#,##0 "৳"'
    amt_cell.font = font_bold

    ws3.cell(row=row3, column=13, value=b[12]).alignment = align_center
    ws3.cell(row=row3, column=14, value=b[13]).alignment = align_left
    
    sync_cell = ws3.cell(row=row3, column=15, value=b[14])
    sync_cell.alignment = align_center
    sync_cell.font = font_bold
    sync_cell.fill = fill_green_light

    ws3.cell(row=row3, column=16, value=b[15]).alignment = align_left

    for col in range(1, 17):
        cell = ws3.cell(row=row3, column=col)
        cell.border = thin_border
        if row3 % 2 == 1 and col != 15:
            cell.fill = fill_zebra
    row3 += 1

# Empty rows for daily entry (25 empty rows)
for i in range(25):
    for col in range(1, 17):
        cell = ws3.cell(row=row3, column=col)
        cell.border = thin_border
        if col == 1:
            cell.value = row3 - 5
            cell.alignment = align_center
        elif col == 12:
            cell.alignment = align_right
            cell.number_format = '#,##0 "৳"'
        else:
            cell.alignment = align_center if col in [2, 3, 4, 6, 7, 9, 11, 13, 15] else align_left
        if row3 % 2 == 1:
            cell.fill = fill_zebra
    row3 += 1

# Total Row
total_row3 = row3
ws3.cell(row=total_row3, column=1, value="TOTAL (সর্বমোট):").font = font_total
ws3.merge_cells(f"A{total_row3}:J{total_row3}")
ws3.cell(row=total_row3, column=1).alignment = align_left

ws3.cell(row=total_row3, column=11, value=f"=SUM(K6:K{total_row3-1})").font = font_total
ws3.cell(row=total_row3, column=11).alignment = align_center
ws3.cell(row=total_row3, column=11).fill = fill_gold_light

total_b_amt = ws3.cell(row=total_row3, column=12, value=f"=SUM(L6:L{total_row3-1})")
total_b_amt.font = font_total
total_b_amt.alignment = align_right
total_b_amt.number_format = '#,##0 "৳"'
total_b_amt.fill = fill_gold_light

ws3.cell(row=total_row3, column=13, value="Total Collections").font = font_italic
ws3.merge_cells(f"M{total_row3}:P{total_row3}")

for col in range(1, 17):
    ws3.cell(row=total_row3, column=col).border = total_border

ws3.column_dimensions['A'].width = 7
ws3.column_dimensions['B'].width = 13
ws3.column_dimensions['C'].width = 12
ws3.column_dimensions['D'].width = 16
ws3.column_dimensions['E'].width = 24
ws3.column_dimensions['F'].width = 17
ws3.column_dimensions['G'].width = 13
ws3.column_dimensions['H'].width = 18
ws3.column_dimensions['I'].width = 13
ws3.column_dimensions['J'].width = 26
ws3.column_dimensions['K'].width = 10
ws3.column_dimensions['L'].width = 16
ws3.column_dimensions['M'].width = 17
ws3.column_dimensions['N'].width = 20
ws3.column_dimensions['O'].width = 13
ws3.column_dimensions['P'].width = 25

# ==============================================================================
# SHEET 4: 💰 দৈনিক ক্যাশ ও রাজস্ব সারসংক্ষেপ (Daily Cash Summary)
# ==============================================================================
ws4 = wb.create_sheet(title="💰 দৈনিক ক্যাশ ও রাজস্ব হিসাব")
ws4.views.sheetView[0].showGridLines = True

ws4.merge_cells("A1:J2")
h4 = ws4["A1"]
h4.value = "DAILY REVENUE & CASH RECONCILIATION (দৈনিক রাজস্ব ও ক্যাশ হিসাব)"
h4.font = font_title
h4.fill = fill_navy
h4.alignment = Alignment(horizontal="center", vertical="center")

ws4.merge_cells("A3:J3")
ws4["A3"].value = "Daily Financial Settlement & Cash Handover between Shifts | Flight Care HSIA"
ws4["A3"].font = font_italic
ws4["A3"].alignment = Alignment(horizontal="center", vertical="center")

headers4 = [
    "Date\n(তারিখ)",
    "Counter Services\n(কাউন্টার সার্ভিস আয় ৳)",
    "Passenger Bookings\n(যাত্রী বুকিং আয় ৳)",
    "Gross Total Revenue\n(মোট দৈনিক আয় ৳)",
    "Petty Expenses\n(কাউন্টার খরচ ৳)",
    "Net Cash to Deposit\n(নিট জমা ক্যাশ ৳)",
    "Payment Split\n(ক্যাশ / ডিজিটাল)",
    "Deposited To\n(কোথায় জমা)",
    "Received By / Sign\n(হস্তান্তর গ্রহণকারী)",
    "Audit Status\n(অডিট অবস্থা)",
]

header_row4 = 5
for col_idx, h_text in enumerate(headers4, start=1):
    cell = ws4.cell(row=header_row4, column=col_idx, value=h_text)
    cell.font = font_table_header
    cell.fill = fill_navy
    cell.alignment = align_center
    cell.border = header_border

ws4.row_dimensions[header_row4].height = 36

sample_cash_data = [
    ("27.10.2026", 4620, 10500, 200, "Cash: 12,920 | bKash: 2,000", "Bank Deposit / Vault", "Manager Sohel Tanvir", "Verified ✓"),
    ("28.10.2026", 4500, 6000, 150, "Cash: 9,350 | bKash: 1,000", "Central Cashier", "Accounts Officer", "Verified ✓"),
    ("29.10.2026", 5200, 12000, 300, "Cash: 15,900 | Card: 1,000", "Bank Deposit", "Manager Sohel Tanvir", "Verified ✓"),
]

row4 = 6
for item in sample_cash_data:
    dt, s_cnt, s_bkg, exp, split, dep_to, rec_by, audit_stat = item
    ws4.cell(row=row4, column=1, value=dt).alignment = align_center

    c_cnt = ws4.cell(row=row4, column=2, value=s_cnt)
    c_cnt.alignment = align_right
    c_cnt.number_format = '#,##0 "৳"'

    c_bkg = ws4.cell(row=row4, column=3, value=s_bkg)
    c_bkg.alignment = align_right
    c_bkg.number_format = '#,##0 "৳"'

    # Formula for Gross: B + C
    gross_cell = ws4.cell(row=row4, column=4, value=f"=B{row4}+C{row4}")
    gross_cell.alignment = align_right
    gross_cell.number_format = '#,##0 "৳"'
    gross_cell.font = font_bold
    gross_cell.fill = fill_blue_light

    c_exp = ws4.cell(row=row4, column=5, value=exp)
    c_exp.alignment = align_right
    c_exp.number_format = '#,##0 "৳"'

    # Formula for Net Cash: D - E
    net_cell = ws4.cell(row=row4, column=6, value=f"=D{row4}-E{row4}")
    net_cell.alignment = align_right
    net_cell.number_format = '#,##0 "৳"'
    net_cell.font = font_bold
    net_cell.fill = fill_green_light

    ws4.cell(row=row4, column=7, value=split).alignment = align_left
    ws4.cell(row=row4, column=8, value=dep_to).alignment = align_left
    ws4.cell(row=row4, column=9, value=rec_by).alignment = align_left
    
    st_cell = ws4.cell(row=row4, column=10, value=audit_stat)
    st_cell.alignment = align_center
    st_cell.font = font_bold
    st_cell.fill = fill_green_light

    for col in range(1, 11):
        cell = ws4.cell(row=row4, column=col)
        cell.border = thin_border
        if row4 % 2 == 1 and col not in [4, 6, 10]:
            cell.fill = fill_zebra
    row4 += 1

# Empty rows for monthly entry (25 empty rows)
for i in range(25):
    for col in range(1, 11):
        cell = ws4.cell(row=row4, column=col)
        cell.border = thin_border
        if col in [2, 3, 5]:
            cell.alignment = align_right
            cell.number_format = '#,##0 "৳"'
        elif col == 4:
            cell.value = f"=IF(COUNT(B{row4}:C{row4})>0, B{row4}+C{row4}, \"\")"
            cell.alignment = align_right
            cell.number_format = '#,##0 "৳"'
            cell.font = font_bold
            cell.fill = fill_blue_light
        elif col == 6:
            cell.value = f"=IF(ISNUMBER(D{row4}), D{row4}-IF(ISNUMBER(E{row4}),E{row4},0), \"\")"
            cell.alignment = align_right
            cell.number_format = '#,##0 "৳"'
            cell.font = font_bold
            cell.fill = fill_green_light
        else:
            cell.alignment = align_center if col in [1, 10] else align_left
        if row4 % 2 == 1 and col not in [4, 6]:
            cell.fill = fill_zebra
    row4 += 1

# Total Summary Row for Sheet 4
total_row4 = row4
ws4.cell(row=total_row4, column=1, value="MONTHLY TOTALS (মাসিক সর্বমোট):").font = font_total
ws4.cell(row=total_row4, column=1).alignment = align_left

for col in [2, 3, 4, 5, 6]:
    col_letter = get_column_letter(col)
    cell = ws4.cell(row=total_row4, column=col, value=f"=SUM({col_letter}6:{col_letter}{total_row4-1})")
    cell.font = font_total
    cell.alignment = align_right
    cell.number_format = '#,##0 "৳"'
    cell.fill = fill_gold_light

ws4.cell(row=total_row4, column=7, value="Central Accounts Reconciliation").font = font_italic
ws4.merge_cells(f"G{total_row4}:H{total_row4}")

ws4.cell(row=total_row4, column=9, value="Managing Director Sign: ________").font = font_bold
ws4.merge_cells(f"I{total_row4}:J{total_row4}")

for col in range(1, 11):
    ws4.cell(row=total_row4, column=col).border = total_border

ws4.column_dimensions['A'].width = 14
ws4.column_dimensions['B'].width = 22
ws4.column_dimensions['C'].width = 22
ws4.column_dimensions['D'].width = 24
ws4.column_dimensions['E'].width = 18
ws4.column_dimensions['F'].width = 22
ws4.column_dimensions['G'].width = 26
ws4.column_dimensions['H'].width = 22
ws4.column_dimensions['I'].width = 26
ws4.column_dimensions['J'].width = 16

# Save workbook
output_path = "FlightCare_FrontDesk_Operations_Master.xlsx"
wb.save(output_path)
print(f"Successfully generated: {output_path}")
