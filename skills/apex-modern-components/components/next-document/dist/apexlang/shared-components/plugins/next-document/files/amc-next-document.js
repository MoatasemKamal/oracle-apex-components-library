/* APEX Modern Components - Next Document runtime (Next Collection)
 *
 * The report renders every line row as a plain list (<ol class="amc-NDocument-source">),
 * which is what users see without JavaScript. This file reads the rows and builds the
 * document next to that list:
 *
 * - Header fields (type, number, dates, party, issuer, currency, status, notes) are taken
 *   from the first row that has them, so they may be repeated on every row.
 * - Money is kept in integer minor units (halalas, fils). Line net = Qty x Unit price -
 *   Discount (or Line Total when given). VAT is computed per rate on the taxable total of
 *   that rate and rounded half up (EN 16931 / ZATCA rule), then Total = taxable + VAT.
 * - Currency decimals, money, numbers, percentages, dates and day counts come from Intl.
 *   Numbers use Western digits on Arabic pages, as Gulf tax invoices do.
 * - Amount in words: English, and Arabic tafqit for the Gulf currencies.
 * - Status paid / overdue / draft / void / sent / approved becomes a rubber-stamp element
 *   with a text alternative.
 * - Print document prints only this document (A4, 80 mm for the receipt).
 * - Text is inserted with textContent only; only parsed numbers reach CSS.
 * - Rebuilds when APEX refreshes the region. Motion is CSS only and stops under
 *   prefers-reduced-motion. */
(function () {
  "use strict";
  if (window.amcNextDocument) {
    return;
  }

  var STYLES = ["classicInvoice", "modernMinimal", "bilingualTax", "thermalReceipt", "payslip"];
  var STATUSES = ["paid", "overdue", "draft", "void", "sent", "approved"];
  var HEAD_FIELDS = ["issuerName", "issuerDetails", "issuerVat", "docType", "docNumber", "docDate", "dueDate", "partyName", "partyAddress", "vatNumber", "currency", "status", "notes"];
  var uidSeq = 0;

  /* Arabic labels for bilingual layouts. English labels come from the template (translatable). */
  var AR = {
    from: "المورد", billTo: "العميل", supplier: "المورد", employee: "الموظف", issued: "تاريخ الإصدار",
    due: "تاريخ الاستحقاق", valid: "صالح حتى", payDate: "تاريخ الصرف", vatNo: "الرقم الضريبي",
    currency: "العملة", no: "م", desc: "البيان", qty: "الكمية", unit: "سعر الوحدة", disc: "الخصم",
    rate: "نسبة الضريبة", vatAmount: "مبلغ الضريبة", amount: "المبلغ", taxable: "المبلغ الخاضع للضريبة",
    incl: "الإجمالي شامل الضريبة", subtotal: "المجموع", discount: "الخصم", vat: "ضريبة القيمة المضافة",
    total: "الإجمالي", totalDue: "المبلغ المستحق", totalPaid: "المبلغ المدفوع", words: "المبلغ كتابةً",
    notes: "ملاحظات", earnings: "الاستحقاقات", deductions: "الاستقطاعات", gross: "إجمالي الراتب",
    totalDeductions: "إجمالي الاستقطاعات", net: "صافي الراتب", items: "البنود",
    paid: "مدفوعة", stOverdue: "متأخرة", draft: "مسودة", "void": "ملغاة", sent: "مرسلة", approved: "معتمدة",
    hijri: "التاريخ الهجري"
  };
  var AR_TITLES = [
    ["simplified tax invoice", "فاتورة ضريبية مبسطة"], ["tax invoice", "فاتورة ضريبية"],
    ["proforma invoice", "فاتورة مبدئية"], ["credit note", "إشعار دائن"], ["debit note", "إشعار مدين"],
    ["invoice", "فاتورة"], ["quotation", "عرض سعر"], ["quote", "عرض سعر"], ["purchase order", "أمر شراء"],
    ["delivery note", "إشعار تسليم"], ["payment receipt", "إيصال دفع"], ["receipt", "إيصال"],
    ["payslip", "قسيمة راتب"], ["salary slip", "قسيمة راتب"]
  ];

  /* Currency words. ar: [one, two, few (3-10), many (11-99), hundreds], g = gender of the noun. */
  var CUR = {
    SAR: { en: ["Saudi riyal", "Saudi riyals"], enMinor: ["halala", "halalas"],
      ar: ["ريال سعودي واحد", "ريالان سعوديان", "ريالات سعودية", "ريالاً سعودياً", "ريال سعودي"], g: "m",
      arMinor: ["هللة واحدة", "هللتان", "هللات", "هللة", "هللة"], gMinor: "f" },
    AED: { en: ["UAE dirham", "UAE dirhams"], enMinor: ["fils", "fils"],
      ar: ["درهم إماراتي واحد", "درهمان إماراتيان", "دراهم إماراتية", "درهماً إماراتياً", "درهم إماراتي"], g: "m",
      arMinor: ["فلس واحد", "فلسان", "فلوس", "فلساً", "فلس"], gMinor: "m" },
    QAR: { en: ["Qatari riyal", "Qatari riyals"], enMinor: ["dirham", "dirhams"],
      ar: ["ريال قطري واحد", "ريالان قطريان", "ريالات قطرية", "ريالاً قطرياً", "ريال قطري"], g: "m",
      arMinor: ["درهم واحد", "درهمان", "دراهم", "درهماً", "درهم"], gMinor: "m" },
    KWD: { en: ["Kuwaiti dinar", "Kuwaiti dinars"], enMinor: ["fils", "fils"],
      ar: ["دينار كويتي واحد", "ديناران كويتيان", "دنانير كويتية", "ديناراً كويتياً", "دينار كويتي"], g: "m",
      arMinor: ["فلس واحد", "فلسان", "فلوس", "فلساً", "فلس"], gMinor: "m" },
    BHD: { en: ["Bahraini dinar", "Bahraini dinars"], enMinor: ["fils", "fils"],
      ar: ["دينار بحريني واحد", "ديناران بحرينيان", "دنانير بحرينية", "ديناراً بحرينياً", "دينار بحريني"], g: "m",
      arMinor: ["فلس واحد", "فلسان", "فلوس", "فلساً", "فلس"], gMinor: "m" },
    OMR: { en: ["Omani rial", "Omani rials"], enMinor: ["baisa", "baisa"],
      ar: ["ريال عماني واحد", "ريالان عمانيان", "ريالات عمانية", "ريالاً عمانياً", "ريال عماني"], g: "m",
      arMinor: ["بيسة واحدة", "بيستان", "بيسات", "بيسة", "بيسة"], gMinor: "f" },
    USD: { en: ["US dollar", "US dollars"], enMinor: ["cent", "cents"],
      ar: ["دولار أمريكي واحد", "دولاران أمريكيان", "دولارات أمريكية", "دولاراً أمريكياً", "دولار أمريكي"], g: "m",
      arMinor: ["سنت واحد", "سنتان", "سنتات", "سنتاً", "سنت"], gMinor: "m" },
    EUR: { en: ["euro", "euros"], enMinor: ["cent", "cents"],
      ar: ["يورو واحد", "يوروان", "يوروهات", "يورو", "يورو"], g: "m",
      arMinor: ["سنت واحد", "سنتان", "سنتات", "سنتاً", "سنت"], gMinor: "m" }
  };

  /* ---------- DOM helpers ---------- */
  function h(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) { el.className = cls; }
    if (text !== undefined && text !== null) { el.textContent = text; }
    return el;
  }
  // Free text (names, addresses, descriptions) goes in <bdi>: it keeps its own direction
  // on RTL pages ("Co." stays at the end) while the paragraph keeps the page alignment.
  function ht(tag, cls, text) {
    var el = h(tag, cls);
    el.appendChild(h("bdi", "", text));
    return el;
  }
  function add(parent) {
    for (var i = 1; i < arguments.length; i++) {
      if (arguments[i]) { parent.appendChild(arguments[i]); }
    }
    return parent;
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function uid() { uidSeq++; return "amc-ndoc-" + uidSeq; }
  function clean(t) { return String(t === undefined || t === null ? "" : t).replace(/\s+/g, " ").trim(); }
  function splitLines(t) {
    var out = [];
    String(t || "").split("|").forEach(function (p) { p = clean(p); if (p) { out.push(p); } });
    return out;
  }

  /* ---------- Numbers ---------- */
  function latinDigits(s) {
    return String(s)
      .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); })
      .replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); })
      .replace(/٫/g, ".").replace(/٬/g, ",").replace(/−/g, "-");
  }
  function num(text) {
    var s = latinDigits(clean(text));
    if (!s) { return NaN; }
    var neg = /^\(.*\)$/.test(s) || /^-/.test(s) || /-$/.test(s);
    s = s.replace(/[^0-9.,]/g, "");
    if (!s) { return NaN; }
    if (s.indexOf(".") >= 0 && s.indexOf(",") >= 0) {
      s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    } else if (s.indexOf(",") >= 0) {
      s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
    }
    var n = parseFloat(s);
    return isFinite(n) ? (neg ? -n : n) : NaN;
  }
  // Round half away from zero after removing binary noise (1.005 * 100 = 100.49999...).
  function roundHalf(x) {
    var a = Math.abs(Number(Math.abs(x).toFixed(6)));
    return (x < 0 ? -1 : 1) * Math.round(a);
  }
  function toMinor(x, d) { return roundHalf(x * Math.pow(10, d)); }

  /* ---------- Locale ---------- */
  function langOf(el) {
    var host = el.closest ? el.closest("[lang]") : null;
    return (host && host.getAttribute("lang")) || document.documentElement.lang || "en";
  }
  function numLocale(lang) {
    // Gulf tax invoices print Western digits even in Arabic.
    if (/^ar\b/i.test(lang) && !/-u-.*nu-/.test(lang)) {
      return lang + (/-u-/.test(lang) ? "-nu-latn" : "-u-nu-latn");
    }
    return lang;
  }
  function safeNF(loc, opts) {
    try { return new Intl.NumberFormat(loc, opts); } catch (e) {
      try { return new Intl.NumberFormat("en", opts); } catch (e2) { return new Intl.NumberFormat("en"); }
    }
  }
  function currencyDigits(code) {
    try {
      return new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits;
    } catch (e) { return 2; }
  }

  /* ---------- Dates ---------- */
  function parseISO(t) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean(t));
    if (!m) { return null; }
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  function fmtDate(inst, t) {
    var d = parseISO(t);
    if (!d) { return clean(t); }
    try { return new Intl.DateTimeFormat(inst.lang, { year: "numeric", month: "short", day: "numeric" }).format(d); } catch (e) { return clean(t); }
  }
  function fmtHijri(t) {
    var d = parseISO(t);
    if (!d) { return ""; }
    try {
      return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { year: "numeric", month: "long", day: "numeric" }).format(d);
    } catch (e) { return ""; }
  }
  function dayDiff(from, to) {
    var a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    var b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((b - a) / 86400000);
  }

  /* ---------- Amount in words: English ---------- */
  var EN_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  var EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  var EN_SCALES = ["", "thousand", "million", "billion", "trillion"];
  function enBelow1000(n) {
    var out = [];
    if (n >= 100) { out.push(EN_ONES[Math.floor(n / 100)] + " hundred"); n %= 100; }
    if (n >= 20) { out.push(EN_TENS[Math.floor(n / 10)] + (n % 10 ? "-" + EN_ONES[n % 10] : "")); }
    else if (n > 0) { out.push(EN_ONES[n]); }
    return out.join(" ");
  }
  function enWords(n) {
    if (n === 0) { return EN_ONES[0]; }
    var parts = [];
    var i = 0;
    while (n > 0 && i < EN_SCALES.length) {
      var g = n % 1000;
      if (g) { parts.unshift(enBelow1000(g) + (EN_SCALES[i] ? " " + EN_SCALES[i] : "")); }
      n = Math.floor(n / 1000);
      i++;
    }
    return parts.join(" ");
  }
  function amountEn(major, minor, code, d) {
    var c = CUR[code];
    var majorName = c ? c.en[major === 1 ? 0 : 1] : code;
    var s = enWords(major) + " " + majorName;
    if (minor > 0) {
      var minorName = c ? c.enMinor[minor === 1 ? 0 : 1] : "/ " + Math.pow(10, d);
      s += " and " + (c ? enWords(minor) : String(minor)) + " " + minorName;
    }
    s += " only";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ---------- Amount in words: Arabic tafqit (simplified, nominative) ---------- */
  var AR_M = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  var AR_F = ["", "واحدة", "اثنتان", "ثلاث", "أربع", "خمس", "ست", "سبع", "ثماني", "تسع"];
  var AR_TENS = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  var AR_HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  // g is the gender of the counted noun: 3-10 take the opposite form (ثلاثة ريالات, ثلاث هللات).
  function arBelow100(n, g) {
    var units = g === "f" ? AR_F : AR_M;
    if (n === 0) { return ""; }
    if (n < 10) { return units[n]; }
    if (n === 10) { return g === "f" ? "عشر" : "عشرة"; }
    if (n === 11) { return g === "f" ? "إحدى عشرة" : "أحد عشر"; }
    if (n === 12) { return g === "f" ? "اثنتا عشرة" : "اثنا عشر"; }
    if (n < 20) { return units[n - 10] + (g === "f" ? " عشرة" : " عشر"); }
    var u = n % 10;
    return (u ? units[u] + " و" : "") + AR_TENS[Math.floor(n / 10)];
  }
  function arBelow1000(n, g, construct) {
    var hnd = Math.floor(n / 100);
    var rest = n % 100;
    var parts = [];
    if (hnd) { parts.push(hnd === 2 && !rest && construct ? "مائتا" : AR_HUNDREDS[hnd]); }
    if (rest) { parts.push(arBelow100(rest, g)); }
    return parts.join(" و");
  }
  function arScale(k, forms) {
    // forms: [one, two, plural (3-10), accusative (11-99), singular]
    if (k === 1) { return forms[0]; }
    if (k === 2) { return forms[1]; }
    var last2 = k % 100;
    var noun = last2 >= 3 && last2 <= 10 ? forms[2] : last2 >= 11 ? forms[3] : forms[4];
    return arBelow1000(k, "m", true) + " " + noun;
  }
  function arNumber(n, g) {
    if (n === 0) { return "صفر"; }
    var parts = [];
    var bil = Math.floor(n / 1e9);
    var mil = Math.floor(n / 1e6) % 1000;
    var th = Math.floor(n / 1000) % 1000;
    var rest = n % 1000;
    if (bil) { parts.push(arScale(bil, ["مليار", "ملياران", "مليارات", "ملياراً", "مليار"])); }
    if (mil) { parts.push(arScale(mil, ["مليون", "مليونان", "ملايين", "مليوناً", "مليون"])); }
    if (th) { parts.push(arScale(th, ["ألف", "ألفان", "آلاف", "ألفاً", "ألف"])); }
    if (rest) { parts.push(arBelow1000(rest, g, false)); }
    return parts.join(" و");
  }
  function arCounted(n, forms, g) {
    if (n === 1) { return forms[0]; }
    if (n === 2) { return forms[1]; }
    var last2 = n % 100;
    var noun = last2 >= 3 && last2 <= 10 ? forms[2] : last2 >= 11 ? forms[3] : forms[4];
    // A dual directly before the counted noun takes the construct form: ألفا ريال, مائتا ريال.
    var words = arNumber(n, g).replace(/(ألف|مليون|مليار|مائت)ان$/, "$1ا");
    return words + " " + noun;
  }
  function amountAr(major, minor, code) {
    var c = CUR[code];
    var s;
    if (c) {
      s = major ? arCounted(major, c.ar, c.g) : "";
      if (minor > 0) { s += (s ? " و" : "") + arCounted(minor, c.arMinor, c.gMinor); }
      if (!s) { s = arCounted(0, c.ar, c.g); }
    } else {
      s = arNumber(major, "m") + " " + code + (minor > 0 ? " و" + arNumber(minor, "m") : "");
    }
    return "فقط " + s + " لا غير";
  }

  /* ---------- Reading rows ---------- */
  function fieldText(scope, key) {
    var el = scope.querySelector('[data-f="' + key + '"]');
    return el ? clean(el.textContent) : "";
  }
  function readDoc(root) {
    var rows = root.querySelectorAll(".amc-NDocument-source > .amc-NDocument-row");
    var head = {};
    var lines = [];
    each(rows, function (row) {
      HEAD_FIELDS.forEach(function (k) {
        if (!head[k]) { head[k] = fieldText(row, k); }
      });
      if (!head.qr) {
        var q = row.querySelector('[data-f="qr"]');
        if (q) { head.qr = clean(q.getAttribute("data-src")); }
      }
      var line = {
        desc: fieldText(row, "desc"),
        qty: fieldText(row, "qty"),
        price: fieldText(row, "price"),
        discount: fieldText(row, "discount"),
        rate: fieldText(row, "rate"),
        total: fieldText(row, "total")
      };
      if (line.desc || line.price || line.total) { lines.push(line); }
    });
    return { head: head, lines: lines };
  }

  /* ---------- Calculation ---------- */
  function compute(doc, opts) {
    var d = opts.digits;
    var res = { lines: [], subtotal: 0, discount: 0, taxable: 0, vat: 0, total: 0, rates: [], earnings: 0, deductions: 0, mixedRates: false, anyDiscount: false };
    var byRate = {};
    var firstRate = null;
    doc.lines.forEach(function (l, i) {
      var qty = num(l.qty);
      var price = num(l.price);
      var given = num(l.total);
      if (!isFinite(qty)) { qty = isFinite(price) ? 1 : NaN; }
      var gross = isFinite(qty) && isFinite(price) ? toMinor(qty * price, d) : NaN;
      var disc = 0;
      var dText = clean(l.discount);
      if (dText) {
        var dv = num(dText);
        if (isFinite(dv)) {
          disc = /%\s*$/.test(dText) ? (isFinite(gross) ? roundHalf(gross * dv / 100) : 0) : toMinor(dv, d);
        }
      }
      var net;
      if (isFinite(given)) {
        net = toMinor(given, d);
        if (isFinite(gross) && Math.abs(gross - disc - net) > 1 && window.console) {
          window.console.warn("amcNextDocument: line " + (i + 1) + " Line Total differs from Qty x Unit Price - Discount; Line Total is used.");
        }
        if (!isFinite(gross)) { gross = net + disc; }
      } else if (isFinite(gross)) {
        net = gross - disc;
      } else {
        return;
      }
      var rate = opts.noVat ? 0 : num(l.rate);
      if (!isFinite(rate)) { rate = opts.defaultRate; }
      var key = String(rate);
      if (firstRate === null) { firstRate = key; } else if (firstRate !== key) { res.mixedRates = true; }
      if (!byRate[key]) { byRate[key] = { rate: rate, taxable: 0, vat: 0 }; res.rates.push(byRate[key]); }
      byRate[key].taxable += net;
      var lineVat = roundHalf(net * rate / 100);
      if (disc) { res.anyDiscount = true; }
      res.lines.push({
        no: res.lines.length + 1, desc: l.desc, qty: isFinite(qty) ? qty : null, price: isFinite(price) ? toMinor(price, d) : null,
        discount: disc, discountText: /%\s*$/.test(dText) ? dText.replace(/\s+/g, "") : "", gross: gross, net: net, rate: rate, vat: lineVat, incl: net + lineVat
      });
      res.subtotal += gross;
      res.discount += disc;
      if (net >= 0) { res.earnings += net; } else { res.deductions -= net; }
    });
    res.rates.sort(function (a, b) { return b.rate - a.rate; });
    res.rates.forEach(function (r) {
      r.vat = roundHalf(r.taxable * r.rate / 100);
      res.vat += r.vat;
      res.taxable += r.taxable;
    });
    res.total = res.taxable + res.vat;
    return res;
  }

  /* ---------- Instance ---------- */
  function labelsOf(root) {
    var el = root.querySelector(".amc-NDocument-i18n");
    var L = {};
    var map = {
      from: "from", billTo: "bill-to", supplier: "supplier", employee: "employee", issued: "issued", due: "due", valid: "valid",
      payDate: "pay-date", vatNo: "vat-no", currency: "currency", no: "no", desc: "desc", qty: "qty", unit: "unit", disc: "disc",
      rate: "rate", vatAmount: "vat-amount", amount: "amount", taxable: "taxable", incl: "incl", subtotal: "subtotal",
      discount: "discount", vat: "vat", total: "total", totalDue: "total-due", totalPaid: "total-paid", words: "words",
      notes: "notes", print: "print", earnings: "earnings", deductions: "deductions", gross: "gross",
      totalDeductions: "total-deductions", net: "net", split: "split", dueIn: "due-in", overdue: "overdue", status: "status",
      paid: "paid", stOverdue: "st-overdue", draft: "draft", "void": "void", sent: "sent", approved: "approved",
      items: "items", qr: "qr", thanks: "thanks"
    };
    for (var k in map) {
      if (Object.prototype.hasOwnProperty.call(map, k)) {
        L[k] = (el && el.getAttribute("data-" + map[k])) || k;
      }
    }
    return L;
  }

  function Doc(root) {
    this.root = root;
    this.style = root.getAttribute("data-variant");
    if (STYLES.indexOf(this.style) < 0) { this.style = "classicInvoice"; }
    this.L = labelsOf(root);
    this.bi = this.style === "bilingualTax" || root.getAttribute("data-bilingual") === "Y";
    this.lang = langOf(root);
    this.loc = numLocale(this.lang);
  }

  // A label: English (from the template) plus the Arabic label in bilingual layouts.
  Doc.prototype.lab = function (key, tag, cls) {
    var el = h(tag || "span", "amc-NDocument-label" + (cls ? " " + cls : ""));
    if (this.bi && AR[key]) {
      add(el, h("span", "amc-NDocument-en", this.L[key]));
      var ar = h("span", "amc-NDocument-ar", AR[key]);
      ar.setAttribute("lang", "ar");
      ar.setAttribute("dir", "rtl");
      el.appendChild(ar);
    } else {
      el.textContent = this.L[key];
    }
    return el;
  };
  Doc.prototype.money = function (minor) {
    var v = minor / Math.pow(10, this.digits);
    return this.cf ? this.cf.format(v) : this.nf.format(v) + " " + this.code;
  };
  Doc.prototype.amount = function (minor) { return this.nf.format(minor / Math.pow(10, this.digits)); };
  Doc.prototype.pct = function (rate) { return this.pf.format(rate / 100); };

  Doc.prototype.build = function () {
    var root = this.root;
    root.setAttribute("data-amc-init", "Y");
    var old = root.querySelector(".amc-NDocument-desk");
    if (old) { old.parentNode.removeChild(old); }
    var doc = readDoc(root);
    this.head = doc.head;
    var code = clean(doc.head.currency).toUpperCase();
    this.code = /^[A-Z]{3}$/.test(code) ? code : "SAR";
    this.digits = currencyDigits(this.code);
    this.nf = safeNF(this.loc, { minimumFractionDigits: this.digits, maximumFractionDigits: this.digits });
    this.qf = safeNF(this.loc, { maximumFractionDigits: 3 });
    this.pf = safeNF(this.loc, { style: "percent", maximumFractionDigits: 2 });
    try { this.cf = new Intl.NumberFormat(this.loc, { style: "currency", currency: this.code }); } catch (e) { this.cf = null; }
    var rate = num(root.getAttribute("data-tax-rate"));
    this.calc = compute(doc, { digits: this.digits, defaultRate: isFinite(rate) ? rate : 15, noVat: this.style === "payslip" });
    var st = clean(doc.head.status).toLowerCase();
    this.status = STATUSES.indexOf(st) >= 0 ? st : "";

    var desk = h("div", "amc-NDocument-desk");
    if (root.getAttribute("data-print") !== "N") { desk.appendChild(this.printBar()); }
    var sheet = h("article", "amc-NDocument-sheet");
    var titleId = uid();
    sheet.setAttribute("aria-labelledby", titleId);
    this.titleId = titleId;
    this["build_" + this.style](sheet);
    var paper = h("div", "amc-NDocument-paper");
    paper.appendChild(sheet);
    desk.appendChild(paper);
    root.appendChild(desk);
    root.classList.add("is-built");
    if (this.status) { root.setAttribute("data-status", this.status); } else { root.removeAttribute("data-status"); }
  };

  /* ---------- Shared parts ---------- */
  Doc.prototype.printBar = function () {
    var bar = h("div", "amc-NDocument-tools");
    var b = h("button", "t-Button t-Button--noUI t-Button--iconLeft amc-NDocument-print");
    b.type = "button";
    b.setAttribute("data-amc-act", "print");
    var ic = h("span", "t-Icon t-Icon--left fa fa-print");
    ic.setAttribute("aria-hidden", "true");
    add(b, ic, h("span", "t-Button-label", this.L.print));
    bar.appendChild(b);
    return bar;
  };
  Doc.prototype.title = function (tag) {
    var t = h(tag || "h3", "amc-NDocument-title");
    t.id = this.titleId;
    var parts = String(this.head.docType || "").split("|");
    var en = clean(parts[0]);
    var ar = clean(parts[1]);
    if (!ar && this.bi) {
      var low = en.toLowerCase();
      for (var i = 0; i < AR_TITLES.length; i++) {
        if (low.indexOf(AR_TITLES[i][0]) === 0) { ar = AR_TITLES[i][1]; break; }
      }
    }
    add(t, h("span", "amc-NDocument-en", en));
    if (ar && this.bi) {
      var a = h("span", "amc-NDocument-ar", ar);
      a.setAttribute("lang", "ar");
      a.setAttribute("dir", "rtl");
      t.appendChild(a);
    }
    return t;
  };
  Doc.prototype.docNo = function () {
    if (!this.head.docNumber) { return null; }
    var p = h("p", "amc-NDocument-number", this.head.docNumber);
    return p;
  };
  Doc.prototype.issuer = function () {
    var hd = this.head;
    if (!hd.issuerName && !hd.issuerDetails && !hd.issuerVat) { return null; }
    var box = h("div", "amc-NDocument-issuer");
    if (hd.issuerName) {
      var names = String(hd.issuerName).split("|");
      var n = h("p", "amc-NDocument-issuerName");
      add(n, ht("span", "amc-NDocument-en", clean(names[0])));
      if (names[1] && clean(names[1])) {
        var ar = h("span", "amc-NDocument-ar", clean(names[1]));
        ar.setAttribute("lang", "ar");
        n.appendChild(ar);
      }
      box.appendChild(n);
    }
    splitLines(hd.issuerDetails).forEach(function (l) { box.appendChild(ht("p", "amc-NDocument-issuerLine", l)); });
    if (hd.issuerVat) { box.appendChild(this.pair("vatNo", hd.issuerVat, "amc-NDocument-vat")); }
    return box;
  };
  // Inline "label value" pair used for VAT numbers.
  Doc.prototype.pair = function (key, value, cls) {
    var p = h("p", cls || "");
    add(p, this.lab(key), h("span", "amc-NDocument-num", value));
    return p;
  };
  Doc.prototype.party = function (key) {
    var hd = this.head;
    if (!hd.partyName && !hd.partyAddress) { return null; }
    var box = h("div", "amc-NDocument-party");
    box.appendChild(this.lab(key, "h4", "amc-NDocument-partyLabel"));
    if (hd.partyName) { box.appendChild(ht("p", "amc-NDocument-partyName", hd.partyName)); }
    splitLines(hd.partyAddress).forEach(function (l) { box.appendChild(ht("p", "amc-NDocument-partyLine", l)); });
    if (hd.vatNumber) { box.appendChild(this.pair("vatNo", hd.vatNumber, "amc-NDocument-vat")); }
    return box;
  };
  Doc.prototype.dueKey = function () {
    var t = String(this.head.docType || "").toLowerCase();
    return /quot|quote|proforma/.test(t) ? "valid" : "due";
  };
  Doc.prototype.meta = function (opts) {
    opts = opts || {};
    var hd = this.head;
    var dl = h("dl", "amc-NDocument-meta");
    var self = this;
    function row(key, value, cls, extra) {
      if (!value) { return; }
      var r = h("div", "amc-NDocument-metaRow" + (cls ? " " + cls : ""));
      var dt = h("dt");
      dt.appendChild(self.lab(key));
      var dd = h("dd", "amc-NDocument-metaValue", value);
      if (extra) { dd.appendChild(extra); }
      add(r, dt, dd);
      dl.appendChild(r);
    }
    if (opts.number && hd.docNumber) { row("no", hd.docNumber, "is-number"); }
    var hij = null;
    if (opts.hijri && parseISO(hd.docDate)) {
      hij = h("span", "amc-NDocument-hijri", fmtHijri(hd.docDate));
      hij.setAttribute("lang", "ar");
    }
    row(opts.payslip ? "payDate" : "issued", fmtDate(this, opts.payslip ? (hd.dueDate || hd.docDate) : hd.docDate), "", hij);
    if (!opts.payslip) {
      var dueExtra = null;
      if (opts.relative) { dueExtra = this.relative(); }
      row(this.dueKey(), fmtDate(this, hd.dueDate), this.status === "overdue" ? "is-overdue" : "", dueExtra);
    }
    if (opts.currency) { row("currency", this.code); }
    return dl.childNodes.length ? dl : null;
  };
  Doc.prototype.relative = function () {
    var due = parseISO(this.head.dueDate);
    if (!due || this.status === "paid" || this.status === "void") { return null; }
    var diff = dayDiff(new Date(), due);
    var text;
    try {
      if (diff < 0) {
        var nfu = new Intl.NumberFormat(this.lang, { style: "unit", unit: "day", unitDisplay: "long" });
        text = this.L.overdue.replace("%0", nfu.format(-diff));
      } else {
        var rtf = new Intl.RelativeTimeFormat(this.lang, { numeric: "auto" });
        text = this.L.dueIn.replace("%0", rtf.format(diff, "day"));
      }
    } catch (e) { return null; }
    var s = h("span", "amc-NDocument-rel" + (diff < 0 ? " is-late" : ""), text);
    return s;
  };

  Doc.prototype.linesTable = function (opts) {
    opts = opts || {};
    var self = this;
    var c = this.calc;
    var cols = [{ k: "no", cls: "amc-NDocument-cNo" }, { k: "desc", cls: "amc-NDocument-cDesc" }, { k: "qty", cls: "amc-NDocument-cNum" }, { k: "unit", cls: "amc-NDocument-cNum" }];
    if (c.anyDiscount) { cols.push({ k: "disc", cls: "amc-NDocument-cNum" }); }
    if (opts.zatca) {
      cols.push({ k: "taxable", cls: "amc-NDocument-cNum" }, { k: "rate", cls: "amc-NDocument-cNum" }, { k: "vatAmount", cls: "amc-NDocument-cNum" }, { k: "incl", cls: "amc-NDocument-cNum amc-NDocument-cStrong" });
    } else {
      if (c.mixedRates) { cols.push({ k: "rate", cls: "amc-NDocument-cNum" }); }
      cols.push({ k: "amount", cls: "amc-NDocument-cNum amc-NDocument-cStrong" });
    }
    var wrap = h("div", "amc-NDocument-linesWrap");
    var table = h("table", "amc-NDocument-lines");
    var cap = h("caption", "amc-NDocument-sr", this.L.items);
    table.appendChild(cap);
    var thead = h("thead");
    var tr = h("tr");
    cols.forEach(function (col) {
      var th = h("th", col.cls);
      th.setAttribute("scope", "col");
      th.appendChild(self.lab(col.k));
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
    var tbody = h("tbody");
    c.lines.forEach(function (l) {
      var r = h("tr");
      cols.forEach(function (col) {
        var td = h(col.k === "desc" ? "th" : "td", col.cls);
        if (col.k === "desc") {
          td.setAttribute("scope", "row");
          var parts = splitLines(l.desc);
          add(td, ht("span", "amc-NDocument-desc", parts[0] || ""));
          if (parts[1]) { td.appendChild(ht("span", "amc-NDocument-detail", parts.slice(1).join(" "))); }
        } else {
          td.textContent = self.cell(col.k, l);
          td.setAttribute("data-label", self.L[col.k]);
        }
        r.appendChild(td);
      });
      tbody.appendChild(r);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  };
  Doc.prototype.cell = function (k, l) {
    switch (k) {
    case "no": return String(l.no);
    case "qty": return l.qty === null ? "" : this.qf.format(l.qty);
    case "unit": return l.price === null ? "" : this.amount(l.price);
    case "disc": return l.discount ? (l.discountText || this.amount(l.discount)) : "";
    case "rate": return this.pct(l.rate);
    case "taxable": return this.amount(l.net);
    case "vatAmount": return this.amount(l.vat);
    case "incl": return this.amount(l.incl);
    default: return this.amount(l.net);
    }
  };

  Doc.prototype.totals = function (opts) {
    opts = opts || {};
    var self = this;
    var c = this.calc;
    var dl = h("dl", "amc-NDocument-totals");
    function row(labelNode, value, cls) {
      var r = h("div", "amc-NDocument-tRow" + (cls ? " " + cls : ""));
      var dt = h("dt");
      dt.appendChild(labelNode);
      add(r, dt, h("dd", "amc-NDocument-num", value));
      dl.appendChild(r);
    }
    row(this.lab("subtotal"), this.money(c.subtotal), "is-sub");
    if (c.discount) {
      row(this.lab("discount"), this.money(-c.discount), "is-disc");
      row(this.lab("taxable"), this.money(c.taxable));
    }
    c.rates.forEach(function (r) {
      if (!r.rate && c.rates.length === 1 && !opts.zatca) { return; }
      var l = self.lab("vat");
      (l.querySelector(".amc-NDocument-en") || l).appendChild(h("span", "amc-NDocument-rate", self.pct(r.rate)));
      row(l, self.money(r.vat), "is-vat");
    });
    row(this.lab(opts.grand || (this.status === "paid" ? "totalPaid" : "totalDue")), this.money(c.total), "is-grand");
    return dl;
  };

  Doc.prototype.words = function (minor) {
    var mode = this.root.getAttribute("data-words") || "english";
    if (mode === "none") { return null; }
    var neg = minor < 0;
    var abs = Math.abs(minor);
    var p = Math.pow(10, this.digits);
    var major = Math.floor(abs / p);
    var mnr = abs - major * p;
    var box = h("div", "amc-NDocument-words");
    box.appendChild(this.lab("words", "p", "amc-NDocument-wordsLabel"));
    if (mode === "english" || mode === "both") {
      box.appendChild(ht("p", "amc-NDocument-wordsText", (neg ? "Minus " : "") + amountEn(major, mnr, this.code, this.digits)));
    }
    if (mode === "arabic" || mode === "both") {
      var ar = h("p", "amc-NDocument-wordsText amc-NDocument-ar", (neg ? "سالب " : "") + amountAr(major, mnr, this.code));
      ar.setAttribute("lang", "ar");
      ar.setAttribute("dir", "rtl");
      box.appendChild(ar);
    }
    return box;
  };
  Doc.prototype.notes = function () {
    var lines = splitLines(this.head.notes);
    if (!lines.length) { return null; }
    var box = h("div", "amc-NDocument-notes");
    box.appendChild(this.lab("notes", "h4", "amc-NDocument-notesLabel"));
    lines.forEach(function (l) { box.appendChild(ht("p", "", l)); });
    return box;
  };
  Doc.prototype.stamp = function () {
    if (!this.status) { return null; }
    var key = this.status === "overdue" ? "stOverdue" : this.status;
    var s = h("div", "amc-NDocument-stamp amc-NDocument-stamp--" + this.status);
    s.setAttribute("role", "img");
    s.setAttribute("aria-label", this.L.status + ": " + this.L[key]);
    var ink = h("span", "amc-NDocument-stampInk");
    ink.setAttribute("aria-hidden", "true");
    add(ink, h("span", "amc-NDocument-stampWord", this.L[key]));
    if (this.bi && AR[key]) {
      var ar = h("span", "amc-NDocument-stampAr", AR[key]);
      ar.setAttribute("lang", "ar");
      ink.appendChild(ar);
    }
    var sub = this.head.docDate && parseISO(this.head.docDate) ? fmtDate(this, this.head.docDate) : this.head.docNumber;
    if (sub) { ink.appendChild(h("span", "amc-NDocument-stampSub", sub)); }
    s.appendChild(ink);
    return s;
  };
  Doc.prototype.qr = function () {
    var src = this.head.qr;
    if (!src || !/^(data:image\/(png|gif|jpeg|svg\+xml);|https?:|\/|\.{0,2}\/|[a-z0-9_\-]+\.)/i.test(src) || /^\s*(javascript|vbscript):/i.test(src)) { return null; }
    var fig = h("figure", "amc-NDocument-qr");
    var img = h("img", "amc-NDocument-qrImg");
    img.setAttribute("src", src);
    img.setAttribute("width", "112");
    img.setAttribute("height", "112");
    img.setAttribute("alt", this.L.qr);
    img.setAttribute("loading", "lazy");
    fig.appendChild(img);
    return fig;
  };

  /* ---------- Styles ---------- */
  Doc.prototype.build_classicInvoice = function (sheet) {
    var top = h("header", "amc-NDocument-top");
    var tb = h("div", "amc-NDocument-titleBlock");
    add(tb, this.title(), this.docNo());
    add(top, this.issuer() || h("div"), tb);
    var parties = h("div", "amc-NDocument-parties");
    add(parties, this.party("billTo") || h("div"), this.meta({ currency: true }));
    var foot = h("div", "amc-NDocument-foot");
    var left = h("div", "amc-NDocument-footStart");
    add(left, this.words(this.calc.total), this.notes());
    var right = h("div", "amc-NDocument-footEnd");
    add(right, this.totals());
    add(foot, left, this.stamp(), right);
    add(sheet, top, parties, this.linesTable(), foot);
  };

  Doc.prototype.build_modernMinimal = function (sheet) {
    var self = this;
    var rail = h("aside", "amc-NDocument-rail");
    var due = h("div", "amc-NDocument-dueBox");
    add(due, this.lab(this.status === "paid" ? "totalPaid" : "totalDue", "p", "amc-NDocument-dueLabel"), h("p", "amc-NDocument-dueAmount", this.money(this.calc.total)));
    add(rail, this.title(), this.docNo(), due, this.stamp(), this.meta({ relative: true }), this.party("billTo"));
    var main = h("div", "amc-NDocument-main");
    var list = h("ul", "amc-NDocument-items");
    list.setAttribute("aria-label", this.L.items);
    this.calc.lines.forEach(function (l) {
      var li = h("li", "amc-NDocument-item");
      var what = h("div", "amc-NDocument-itemWhat");
      var parts = splitLines(l.desc);
      add(what, ht("p", "amc-NDocument-desc", parts[0] || ""));
      var bits = [];
      if (l.qty !== null && l.price !== null) { bits.push(self.qf.format(l.qty) + " × " + self.amount(l.price)); }
      if (l.discount) { bits.push(self.L.discount + " " + (l.discountText || self.amount(l.discount))); }
      if (self.calc.mixedRates) { bits.push(self.L.vat + " " + self.pct(l.rate)); }
      if (parts[1]) { what.appendChild(ht("p", "amc-NDocument-detail", parts.slice(1).join(" "))); }
      if (bits.length) { what.appendChild(ht("p", "amc-NDocument-calc", bits.join(", "))); }
      add(li, what, h("p", "amc-NDocument-itemAmount amc-NDocument-num", self.amount(l.net)));
      list.appendChild(li);
    });
    add(main, list, this.totals(), this.words(this.calc.total), this.notes());
    add(sheet, rail, main);
  };

  Doc.prototype.build_bilingualTax = function (sheet) {
    var top = h("header", "amc-NDocument-top");
    add(top, this.title(), this.docNo());
    var parties = h("div", "amc-NDocument-parties");
    var seller = this.issuer();
    if (seller) {
      var sBox = h("div", "amc-NDocument-party amc-NDocument-party--seller");
      sBox.appendChild(this.lab("supplier", "h4", "amc-NDocument-partyLabel"));
      while (seller.firstChild) { sBox.appendChild(seller.firstChild); }
      parties.appendChild(sBox);
    }
    add(parties, this.party("billTo"));
    var meta = this.meta({ hijri: true, currency: true });
    var foot = h("div", "amc-NDocument-foot");
    var left = h("div", "amc-NDocument-footStart");
    add(left, this.qr(), this.words(this.calc.total), this.notes());
    var right = h("div", "amc-NDocument-footEnd");
    add(right, this.totals({ zatca: true }));
    add(foot, left, this.stamp(), right);
    add(sheet, top, meta, parties, this.linesTable({ zatca: true }), foot);
  };

  Doc.prototype.build_thermalReceipt = function (sheet) {
    var self = this;
    var top = h("header", "amc-NDocument-top");
    var iss = this.issuer();
    add(top, iss, this.title(), this.meta({ number: true }));
    var list = h("ul", "amc-NDocument-items");
    list.setAttribute("aria-label", this.L.items);
    this.calc.lines.forEach(function (l) {
      var li = h("li", "amc-NDocument-item");
      li.appendChild(ht("p", "amc-NDocument-desc", splitLines(l.desc).join(" ")));
      var row = h("p", "amc-NDocument-lead");
      var calc = l.qty !== null && l.price !== null ? self.qf.format(l.qty) + " × " + self.amount(l.price) : "";
      if (l.discount) { calc += (calc ? ", " : "") + "-" + (l.discountText || self.amount(l.discount)); }
      add(row, ht("span", "amc-NDocument-calc", calc), h("span", "amc-NDocument-dots"), h("span", "amc-NDocument-num", self.amount(l.net)));
      li.appendChild(row);
      list.appendChild(li);
    });
    var end = h("footer", "amc-NDocument-end");
    add(end, this.stamp(), this.qr(), this.notes(), h("p", "amc-NDocument-thanks", this.L.thanks));
    add(sheet, top, list, this.totals({ grand: this.status === "paid" || !this.status ? "totalPaid" : "totalDue" }), this.words(this.calc.total), end);
  };

  Doc.prototype.build_payslip = function (sheet) {
    var self = this;
    var c = this.calc;
    var top = h("header", "amc-NDocument-top");
    var tb = h("div", "amc-NDocument-titleBlock");
    add(tb, this.title(), this.docNo());
    add(top, this.issuer() || h("div"), tb);
    var parties = h("div", "amc-NDocument-parties");
    add(parties, this.party("employee") || h("div"), this.meta({ payslip: true }));
    var cols = h("div", "amc-NDocument-payCols");
    function side(key, sign, totalKey, total) {
      var sec = h("section", "amc-NDocument-paySide amc-NDocument-paySide--" + key);
      var hd = self.lab(key, "h4", "amc-NDocument-payHead");
      var table = h("table", "amc-NDocument-payTable");
      table.appendChild(h("caption", "amc-NDocument-sr", self.L[key]));
      var tb2 = h("tbody");
      c.lines.forEach(function (l) {
        if ((sign > 0) !== (l.net >= 0)) { return; }
        var r = h("tr");
        var th = h("th");
        th.setAttribute("scope", "row");
        th.appendChild(h("bdi", "", splitLines(l.desc).join(" ")));
        add(r, th, h("td", "amc-NDocument-num", self.amount(Math.abs(l.net))));
        tb2.appendChild(r);
      });
      // A plain last row, not tfoot: Chrome moves a tfoot to the next printed page.
      var fr = h("tr", "amc-NDocument-payTotal");
      var fth = h("th");
      fth.setAttribute("scope", "row");
      fth.appendChild(self.lab(totalKey));
      add(fr, fth, h("td", "amc-NDocument-num", self.amount(total)));
      tb2.appendChild(fr);
      table.appendChild(tb2);
      add(sec, hd, table);
      return sec;
    }
    add(cols, side("earnings", 1, "gross", c.earnings), side("deductions", -1, "totalDeductions", c.deductions));
    var net = c.earnings - c.deductions;
    var sum = h("div", "amc-NDocument-netBox");
    var netRow = h("p", "amc-NDocument-net");
    add(netRow, this.lab("net"), h("span", "amc-NDocument-netAmount amc-NDocument-num", this.money(net)));
    sum.appendChild(netRow);
    if (c.earnings > 0) {
      var share = Math.max(0, Math.min(1, net / c.earnings));
      var fig = h("figure", "amc-NDocument-split");
      var bar = h("div", "amc-NDocument-splitBar");
      bar.setAttribute("aria-hidden", "true");
      var fill = h("span", "amc-NDocument-splitNet");
      fill.style.setProperty("--amc-ndoc-net", String(Math.round(share * 10000) / 10000));
      bar.appendChild(fill);
      var cap = h("figcaption", "amc-NDocument-splitKey");
      var k1 = h("span", "amc-NDocument-key amc-NDocument-key--net");
      k1.textContent = this.L.net + " " + this.pf.format(share);
      var k2 = h("span", "amc-NDocument-key amc-NDocument-key--ded");
      k2.textContent = this.L.deductions + " " + this.pf.format(1 - share);
      add(cap, k1, k2);
      fig.setAttribute("aria-label", this.L.split);
      add(fig, bar, cap);
      sum.appendChild(fig);
    }
    add(sum, this.stamp());
    add(sheet, top, parties, cols, sum, this.words(net), this.notes());
  };

  /* ---------- Print ---------- */
  function printDoc(root) {
    var html = document.documentElement;
    html.classList.add("amc-NDocument-printing");
    root.classList.add("is-printing");
    var done = false;
    function cleanup() {
      if (done) { return; }
      done = true;
      html.classList.remove("amc-NDocument-printing");
      root.classList.remove("is-printing");
      window.removeEventListener("afterprint", cleanup);
    }
    window.addEventListener("afterprint", cleanup);
    window.print();
    // Some browsers return from print() before afterprint; keep the class for that print.
    window.setTimeout(cleanup, 1000);
  }

  function onClick(e) {
    var b = e.target && e.target.closest ? e.target.closest(".amc-NDocument [data-amc-act=print]") : null;
    if (!b) { return; }
    printDoc(b.closest(".amc-NDocument"));
  }

  /* ---------- Boot ---------- */
  function init(scope) {
    each((scope || document).querySelectorAll(".amc-NDocument:not([data-amc-init])"), function (root) {
      try { new Doc(root).build(); } catch (err) {
        root.setAttribute("data-amc-init", "E");
        if (window.console) { window.console.error("amcNextDocument", err); }
      }
    });
  }
  function rebuild(root) {
    root.removeAttribute("data-amc-init");
    init(root.parentNode || document);
  }

  function start() {
    init(document);
    document.addEventListener("click", onClick);
    if (window.MutationObserver) {
      var pending = 0;
      new MutationObserver(function () {
        if (pending) { return; }
        pending = window.requestAnimationFrame(function () { pending = 0; init(document); });
      }).observe(document.body, { childList: true, subtree: true });
    }
    if (window.apex && window.apex.jQuery) {
      window.apex.jQuery(document).on("apexafterrefresh", function (ev) {
        var el = ev.target;
        if (el && el.querySelectorAll) { each(el.querySelectorAll(".amc-NDocument"), rebuild); }
      });
    }
  }

  window.amcNextDocument = { init: init, rebuild: rebuild, words: { en: amountEn, ar: amountAr }, compute: compute };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
