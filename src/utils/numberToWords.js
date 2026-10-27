// src/utils/numberToWords.js
// Flight Care Enterprise - Currency & Number to Words Converter (English & Bengali)

const ONES_EN = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS_EN = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

const ONES_BN = [
  '', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়',
  'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো',
  'আঠারো', 'উনিশ', 'বিশ',
];

export function numberToWordsEn(num) {
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return 'Zero Taka Only';

  const convertLessThanOneThousand = (val) => {
    let current = '';
    if (val >= 100) {
      current += ONES_EN[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 20) {
      current += TENS_EN[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + ONES_EN[val % 10] : '');
    } else if (val > 0) {
      current += ONES_EN[val];
    }
    return current.trim();
  };

  let result = '';
  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  if (crore > 0) {
    result += convertLessThanOneThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertLessThanOneThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertLessThanOneThousand(thousand) + ' Thousand ';
  }
  if (rem > 0) {
    result += convertLessThanOneThousand(rem);
  }

  return (result.trim() + ' Taka Only').replace(/\s+/g, ' ');
}

export function numberToWordsBn(num) {
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return 'শূন্য টাকা মাত্র';
  // Fallback to clear string or formatted taka
  return `${numberToWordsEn(n)} (৳ ${n.toLocaleString('en-IN')}/-)`;
}

export default function numberToWords(num, isBn = false) {
  return isBn ? numberToWordsBn(num) : numberToWordsEn(num);
}

