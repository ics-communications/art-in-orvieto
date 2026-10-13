/**
 * ART in Orvieto — application receiver (Google Apps Script web app)
 *
 * The application form on art-in-orvieto.icscanada.edu (application.js) takes
 * the CAD $90 fee through PayPal, then posts the application here. This script:
 *
 *   1. checks every answer again (never trusts the browser),
 *   2. asks PayPal directly whether the order was paid in full to ICS,
 *      and refuses an order number that has already been used,
 *   3. creates a Drive folder for the applicant holding their uploaded work
 *      samples and a PDF of their answers,
 *   4. adds a row to the "Applications" Google Sheet,
 *   5. emails the Registrar and staff (PDF attached) and sends the applicant
 *      a confirmation.
 *
 * Setup and yearly maintenance: see _scripts/SETUP.md.
 * The PayPal client ID below is public (it is also on the website). The PayPal
 * secret is optional: without it every application is saved and marked
 * "CHECK PAYMENT" for the Registrar to match in PayPal; with it, payments are
 * checked automatically. The secret lives in Project Settings → Script
 * properties as PAYPAL_SECRET, never in this file and never on the website.
 */

/* ── Settings you may change ─────────────────────────────────────────────── */

var CONFIG = {
  PROGRAM_YEAR: '2027',
  FEE: 90,                       // application fee, CAD
  CURRENCY: 'CAD',
  // ICS's live PayPal app: the same client ID as application.js and the F2BF page.
  PAYPAL_CLIENT_ID: 'AdZ0cWK3Bl7wjgmrmgk_On-ac13XCdpZxx8te_4IPlRDVoYx3ZNoGG8vK7mb8VXdKH2L-TM1M3sMj6oI',
  ROOT_FOLDER_NAME: 'ART in Orvieto Applications',
  SHEET_NAME: 'ART in Orvieto Applications',
  // People who receive every application and get edit access to the folder.
  STAFF: ['academic-registrar@icscanada.edu', 'haceroferrer@icscanada.edu'],
  REPLY_TO: 'academic-registrar@icscanada.edu',
  SENDER_NAME: 'ART in Orvieto · Institute for Christian Studies',
  MAX_FILES: 2,
  MAX_FILE_BYTES: 10 * 1024 * 1024,
  ALLOWED_TYPES: {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'image/heic': 'heic', 'image/heif': 'heif', 'image/tiff': 'tif', 'application/pdf': 'pdf'
  }
};

/* Choice values the form may send, and how they read in the Sheet/PDF. */
var CHOICES = {
  courses: { seminar: 'Graduate Seminar only', residency: "Artists' Studio Residency only", both: 'Seminar and Studio Residency' },
  credit: { credit: 'Graduate credit', audit: 'Audit' },
  room: { double: 'Shared room', single: 'Single room' },
  grant: {
    graduate: 'Graduate student taking the program for credit',
    teacher: 'K–12 school teacher',
    artist: 'Professional artist',
    none: 'Not applying'
  }
};

var HEADERS = [
  'Submitted', 'Reference', 'Payment status', 'First name', 'Last name', 'Email', 'Phone',
  'Street address', 'City', 'Province / State', 'Postal code', 'Country',
  'Education', 'Courses', 'Credit option', 'Credit institution', 'Room preference',
  'Financial need grant', 'Seminar statement', 'Residency statement', 'Work sample link',
  'Uploaded files', 'Folder', 'Application PDF', 'PayPal order ID', 'PayPal capture ID',
  'Amount paid', 'PayPal payer email'
];

/* ── One-time setup (run from the editor) ─────────────────────────────────── */

/**
 * Creates the Drive folder and the Sheet, shares the folder with STAFF as
 * editors, and remembers both IDs. Safe to run again: it reuses what exists.
 */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var folder = getRootFolder_();
  if (!folder) {
    folder = DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);
    props.setProperty('ROOT_FOLDER_ID', folder.getId());
  }
  CONFIG.STAFF.forEach(function (email) { folder.addEditor(email); });

  var sheet = getSheet_();
  if (!sheet) {
    var ss = SpreadsheetApp.create(CONFIG.SHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    sheet = ss.getSheets()[0];
    sheet.setName('Applications');
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // Everything below the header is stored as plain text, never as formulas.
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, HEADERS.length).setNumberFormat('@');
    props.setProperty('SHEET_ID', ss.getId());
  }
  Logger.log('Folder: ' + folder.getUrl());
  Logger.log('Sheet:  ' + SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getUrl());
  Logger.log('PayPal: ' + checkPayPal_());
}

/* ── Web endpoints ────────────────────────────────────────────────────────── */

/** GET: a health check you can open in a browser after deploying. */
function doGet() {
  return json_({
    ok: true,
    service: 'ART in Orvieto applications',
    storage: !!(getRootFolder_() && getSheet_()),
    paypal: hasSecret_() ? (checkPayPal_() === 'connected' ? 'checked automatically' : 'secret not working') : 'not checked automatically'
  });
}

/** POST: one application, sent by application.js after PayPal approves. */
function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_request', message: 'The application could not be read.' });
  }

  var problems = validate_(data);
  if (problems.length) {
    return json_({ ok: false, error: 'invalid', message: 'Some answers need attention: ' + problems.join('; ') + '.' });
  }

  var payment = verifyPayment_(data.orderId, data.ref);
  if (payment.status === 'rejected') {
    return json_({ ok: false, error: 'payment', message: payment.reason });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheet_();
    if (!sheet) throw new Error('Run setup() first: the Applications sheet does not exist.');

    var existing = findOrder_(sheet, data.orderId);
    if (existing) {
      // The same applicant retrying after a dropped connection: already saved.
      if (existing.ref === data.ref) return json_({ ok: true, ref: data.ref, duplicate: true });
      return json_({ ok: false, error: 'payment', message: 'This PayPal payment has already been used for another application.' });
    }

    var record = buildRecord_(data, payment);
    var folder = getRootFolder_().createFolder(record.folderName);
    var savedFiles = (data.files || []).map(function (f, i) {
      var ext = CONFIG.ALLOWED_TYPES[f.type];
      var name = 'Work sample ' + (i + 1) + ' - ' + safeName_(f.name, ext);
      var blob = Utilities.newBlob(Utilities.base64Decode(f.data), f.type, name);
      return folder.createFile(blob);
    });
    record.fileNames = savedFiles.map(function (f) { return f.getName(); });

    var pdf = folder.createFile(buildPdf_(record));

    sheet.appendRow(rowFor_(record, folder, pdf).map(plain_));
    SpreadsheetApp.flush();

    notifyStaff_(record, folder, pdf);
    confirmApplicant_(record);

    return json_({ ok: true, ref: record.ref });
  } catch (err) {
    console.error(err && err.stack || err);
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(),
      'ART in Orvieto: an application failed to save',
      'Reference ' + data.ref + ', PayPal order ' + data.orderId + ', ' + data.email + '\n\n' + (err && err.stack || err));
    return json_({ ok: false, error: 'server', message: 'Your application could not be saved.' });
  } finally {
    lock.releaseLock();
  }
}

/* ── Validation ───────────────────────────────────────────────────────────── */

function validate_(d) {
  var p = [];
  function text(key, label, max, required) {
    var v = d[key];
    if (v == null || v === '') { if (required) p.push(label + ' is required'); d[key] = ''; return; }
    if (typeof v !== 'string') { p.push(label + ' is not valid'); return; }
    d[key] = v.trim();
    if (required && !d[key]) p.push(label + ' is required');
    if (d[key].length > max) p.push(label + ' is too long');
  }
  function choice(key, label) {
    if (!Object.prototype.hasOwnProperty.call(CHOICES[key], d[key])) p.push('choose ' + label);
  }

  text('ref', 'Reference', 40, true);
  if (d.ref && !/^AIO-\d{4}-[A-Z0-9]{6}$/.test(d.ref)) p.push('reference is not valid');
  text('orderId', 'PayPal order', 40, true);
  if (d.orderId && !/^[A-Z0-9]{8,30}$/.test(d.orderId)) p.push('PayPal order is not valid');

  text('firstName', 'First name', 100, true);
  text('lastName', 'Last name', 100, true);
  text('email', 'Email', 200, true);
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) p.push('email address is not valid');
  text('phone', 'Phone', 40, true);
  text('street', 'Street address', 200, true);
  text('city', 'City', 100, true);
  text('region', 'Province / State', 100, true);
  text('postal', 'Postal code', 20, true);
  text('country', 'Country', 100, true);

  if (!Array.isArray(d.education) || !d.education.length) {
    p.push('list at least one institution');
  } else if (d.education.length > 8) {
    p.push('too many education entries');
  } else {
    d.education = d.education.map(function (row) {
      row = row || {};
      return {
        institution: String(row.institution || '').trim().slice(0, 200),
        degree: String(row.degree || '').trim().slice(0, 150),
        year: String(row.year || '').trim().slice(0, 30)
      };
    }).filter(function (row) { return row.institution; });
    if (!d.education.length) p.push('list at least one institution');
  }

  choice('courses', 'a course selection');
  choice('credit', 'a credit option');
  text('creditInstitution', 'Credit institution', 200, d.credit === 'credit');
  choice('room', 'a room preference');
  choice('grant', 'a financial need grant option');

  var seminar = d.courses === 'seminar' || d.courses === 'both';
  var residency = d.courses === 'residency' || d.courses === 'both';
  text('seminarStatement', 'Seminar statement', 4000, seminar);
  text('residencyStatement', 'Residency statement', 4000, residency);
  text('workLink', 'Work sample link', 500, false);
  if (d.workLink && !/^https?:\/\/\S+$/i.test(d.workLink)) p.push('the work sample link must start with http:// or https://');
  if (!seminar) d.seminarStatement = '';
  if (!residency) { d.residencyStatement = ''; d.workLink = ''; d.files = []; }

  var files = d.files || [];
  if (!Array.isArray(files) || files.length > CONFIG.MAX_FILES) {
    p.push('upload at most ' + CONFIG.MAX_FILES + ' files');
  } else {
    files.forEach(function (f) {
      if (!f || typeof f.data !== 'string' || !CONFIG.ALLOWED_TYPES[f.type]) { p.push('work samples must be images or PDFs'); return; }
      if (f.data.length * 0.75 > CONFIG.MAX_FILE_BYTES + 3) p.push('each work sample must be 10 MB or smaller');
    });
  }
  if (residency && !files.length && !d.workLink) p.push('add a work sample (a file or a link)');

  return p;
}

/* ── PayPal ───────────────────────────────────────────────────────────────── */

function paypalBase_() {
  return PropertiesService.getScriptProperties().getProperty('PAYPAL_ENV') === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}

function paypalToken_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('PAYPAL_CLIENT_ID') || CONFIG.PAYPAL_CLIENT_ID;
  var secret = props.getProperty('PAYPAL_SECRET');
  if (!secret) throw new Error('PayPal secret is not set in Script properties.');
  var res = UrlFetchApp.fetch(paypalBase_() + '/v1/oauth2/token', {
    method: 'post',
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(id + ':' + secret) },
    payload: { grant_type: 'client_credentials' },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('PayPal sign-in failed (' + res.getResponseCode() + ').');
  return JSON.parse(res.getContentText()).access_token;
}

function hasSecret_() {
  return !!PropertiesService.getScriptProperties().getProperty('PAYPAL_SECRET');
}

function checkPayPal_() {
  if (!hasSecret_()) return 'not checked automatically (no PAYPAL_SECRET); applications will be marked CHECK PAYMENT';
  try { paypalToken_(); return 'connected'; } catch (err) { return String(err.message || err); }
}

/**
 * Looks the order up with ICS's own PayPal credentials. An order made with any
 * other PayPal account can't be looked up at all, so a found, completed order
 * for the full fee is ICS's money.
 *
 * Returns status 'paid' | 'pending' | 'unverified' | 'rejected'.
 * 'unverified' means PayPal itself could not be reached: the application is
 * kept (the applicant has very likely paid) and flagged for a manual check.
 */
function verifyPayment_(orderId, ref) {
  if (!hasSecret_()) {
    return { status: 'unverified', note: 'Payments are not checked automatically yet; find this PayPal order ID in PayPal to confirm the $' + CONFIG.FEE + ' fee.' };
  }
  var res;
  try {
    var token = paypalToken_();
    res = UrlFetchApp.fetch(paypalBase_() + '/v2/checkout/orders/' + encodeURIComponent(orderId), {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
  } catch (err) {
    console.error('PayPal unreachable: ' + err);
    return { status: 'unverified', note: 'PayPal could not be reached; check this payment in PayPal.' };
  }

  var code = res.getResponseCode();
  if (code >= 500) return { status: 'unverified', note: 'PayPal returned an error; check this payment in PayPal.' };
  if (code !== 200) return { status: 'rejected', reason: 'We could not find this PayPal payment.' };

  var order = JSON.parse(res.getContentText());
  var unit = (order.purchase_units || [])[0] || {};
  var capture = ((unit.payments || {}).captures || [])[0] || {};
  var amount = capture.amount || unit.amount || {};

  if (order.status !== 'COMPLETED') return { status: 'rejected', reason: 'This PayPal payment was not completed.' };
  if (amount.currency_code !== CONFIG.CURRENCY || Number(amount.value) < CONFIG.FEE) {
    return { status: 'rejected', reason: 'This PayPal payment is not the CAD $' + CONFIG.FEE + ' application fee.' };
  }
  if (unit.custom_id && unit.custom_id !== ref) {
    return { status: 'rejected', reason: 'This PayPal payment belongs to a different application.' };
  }

  var result = {
    status: capture.status === 'COMPLETED' ? 'paid' : 'pending',
    captureId: capture.id || '',
    amount: amount.value + ' ' + amount.currency_code,
    payerEmail: (order.payer || {}).email_address || ''
  };
  if (result.status === 'pending') result.note = 'PayPal shows this payment as ' + (capture.status || 'pending') + '.';
  return result;
}

/* ── Records, PDF, emails ─────────────────────────────────────────────────── */

function buildRecord_(d, payment) {
  var now = new Date();
  var tz = Session.getScriptTimeZone();
  return {
    ref: d.ref,
    submitted: Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm'),
    submittedLong: Utilities.formatDate(now, tz, "MMMM d, yyyy 'at' h:mm a z"),
    folderName: Utilities.formatDate(now, tz, 'yyyy-MM-dd') + ' ' + d.lastName + ', ' + d.firstName + ' (' + d.ref + ')',
    d: d,
    payment: payment,
    paymentLabel: { paid: 'Paid', pending: 'Payment pending', unverified: 'CHECK PAYMENT' }[payment.status],
    seminar: d.courses === 'seminar' || d.courses === 'both',
    residency: d.courses === 'residency' || d.courses === 'both',
    fileNames: []
  };
}

function educationText_(rows) {
  return rows.map(function (r) {
    return [r.institution, r.degree, r.year].filter(String).join(' · ');
  }).join('\n');
}

function rowFor_(r, folder, pdf) {
  var d = r.d;
  return [
    r.submitted, r.ref, r.paymentLabel, d.firstName, d.lastName, d.email, d.phone,
    d.street, d.city, d.region, d.postal, d.country,
    educationText_(d.education), CHOICES.courses[d.courses], CHOICES.credit[d.credit],
    d.creditInstitution, CHOICES.room[d.room], CHOICES.grant[d.grant],
    d.seminarStatement, d.residencyStatement, d.workLink,
    r.fileNames.join('\n'), folder.getUrl(), pdf.getUrl(), d.orderId,
    r.payment.captureId || '', r.payment.amount || '', r.payment.payerEmail || ''
  ];
}

/** The application, laid out as a document. Used for the PDF and the staff email. */
function applicationHtml_(r) {
  var d = r.d;
  function row(label, value) {
    return '<tr><th>' + esc_(label) + '</th><td>' + esc_(value || '—').replace(/\n/g, '<br>') + '</td></tr>';
  }
  function statement(title, body) {
    return '<h2>' + esc_(title) + '</h2><div class="statement">' +
      esc_(body).split(/\n{2,}/).map(function (para) { return '<p>' + para.replace(/\n/g, '<br>') + '</p>'; }).join('') +
      '</div>';
  }
  var edu = d.education.map(function (e) {
    return '<tr><td>' + esc_(e.institution) + '</td><td>' + esc_(e.degree || '—') + '</td><td>' + esc_(e.year || '—') + '</td></tr>';
  }).join('');

  return '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;color:#2D373C;font-size:10.5pt;line-height:1.45;margin:0}' +
    'h1{color:#35596D;font-size:20pt;margin:0 0 2pt}' +
    'h2{color:#35596D;font-size:11pt;text-transform:uppercase;letter-spacing:1.5pt;border-bottom:1.5pt solid #35596D;padding-bottom:3pt;margin:18pt 0 6pt}' +
    '.meta{color:#A65A38;font-size:9pt;letter-spacing:1pt;text-transform:uppercase;margin:0 0 4pt}' +
    'table{border-collapse:collapse;width:100%}' +
    'th,td{text-align:left;vertical-align:top;padding:4pt 6pt 4pt 0;border-bottom:0.5pt solid #D8CFA8}' +
    'th{width:34%;color:#566A66;font-weight:normal}' +
    '.edu th{width:auto;color:#35596D;font-weight:bold}' +
    '.statement p{margin:0 0 6pt}' +
    '.note{color:#566A66;font-size:9pt}' +
    '</style></head><body>' +
    '<p class="meta">ART in Orvieto · ' + esc_(CONFIG.PROGRAM_YEAR) + ' application</p>' +
    '<h1>' + esc_(d.firstName + ' ' + d.lastName) + '</h1>' +
    '<p class="note">Reference ' + esc_(r.ref) + ' · submitted ' + esc_(r.submittedLong) + '</p>' +

    '<h2>Applicant</h2><table>' +
    row('Email', d.email) + row('Phone', d.phone) +
    row('Address', [d.street, d.city + ', ' + d.region, d.postal, d.country].join('\n')) +
    '</table>' +

    '<h2>Education</h2><table class="edu"><tr><th>Institution &amp; location</th><th>Degree</th><th>Date</th></tr>' + edu + '</table>' +

    '<h2>Program</h2><table>' +
    row('Courses', CHOICES.courses[d.courses]) +
    row('Credit option', CHOICES.credit[d.credit] + (d.credit === 'credit' ? ': ' + d.creditInstitution : '')) +
    row('Room preference', CHOICES.room[d.room]) +
    row('Financial need grant', CHOICES.grant[d.grant]) +
    '</table>' +

    (r.seminar ? statement('Graduate Seminar statement', d.seminarStatement) : '') +
    (r.residency ? statement('Studio Residency statement', d.residencyStatement) : '') +
    (r.residency ? '<h2>Work samples</h2><table>' +
      row('Uploaded files', r.fileNames.length ? r.fileNames.join('\n') + '\n(saved in this applicant’s folder)' : 'None') +
      row('Link', d.workLink) + '</table>' : '') +

    '<h2>Application fee</h2><table>' +
    row('Status', r.paymentLabel + (r.payment.note ? ' (' + r.payment.note + ')' : '')) +
    row('Amount', r.payment.amount || 'CAD $' + CONFIG.FEE + ' (not confirmed)') +
    row('PayPal order', d.orderId) + row('PayPal capture', r.payment.captureId) +
    row('PayPal payer email', r.payment.payerEmail) +
    '</table></body></html>';
}

function buildPdf_(r) {
  var name = 'Application - ' + r.d.lastName + ', ' + r.d.firstName + ' (' + r.ref + ').pdf';
  return Utilities.newBlob(applicationHtml_(r), MimeType.HTML, 'application.html')
    .getAs(MimeType.PDF).setName(safeName_(name, 'pdf'));
}

function notifyStaff_(r, folder, pdf) {
  var d = r.d;
  var flag = r.payment.status === 'paid' ? '' : '[' + r.paymentLabel + '] ';
  MailApp.sendEmail({
    to: CONFIG.STAFF.join(','),
    replyTo: d.email,
    name: CONFIG.SENDER_NAME,
    subject: flag + 'ART in Orvieto application: ' + d.firstName + ' ' + d.lastName + ' (' + CHOICES.courses[d.courses] + ')',
    htmlBody: '<p><a href="' + folder.getUrl() + '">Open the applicant’s folder</a> (PDF and work samples) · ' +
      '<a href="' + getSheet_().getParent().getUrl() + '">Open the Applications sheet</a></p>' +
      (r.payment.note ? '<p style="color:#A65A38"><b>' + esc_(r.payment.note) + '</b></p>' : '') +
      applicationHtml_(r).replace(/^[\s\S]*<body>|<\/body>[\s\S]*$/g, ''),
    attachments: [pdf.getBlob()]
  });
}

function confirmApplicant_(r) {
  var d = r.d;
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#2D373C;font-size:15px;line-height:1.55;max-width:560px">' +
    '<p style="color:#A65A38;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px">ART in Orvieto · ' + esc_(CONFIG.PROGRAM_YEAR) + '</p>' +
    '<p>Dear ' + esc_(d.firstName) + ',</p>' +
    '<p>Thank you for applying to ART in Orvieto. We have received your application and your CAD $' + CONFIG.FEE + ' application fee.</p>' +
    '<table style="border-collapse:collapse;margin:8px 0 20px">' +
    '<tr><td style="padding:3px 16px 3px 0;color:#566A66">Reference</td><td>' + esc_(r.ref) + '</td></tr>' +
    '<tr><td style="padding:3px 16px 3px 0;color:#566A66">Applying for</td><td>' + esc_(CHOICES.courses[d.courses]) + ' · ' + esc_(CHOICES.credit[d.credit]) + '</td></tr>' +
    '<tr><td style="padding:3px 16px 3px 0;color:#566A66">PayPal order</td><td>' + esc_(d.orderId) + '</td></tr>' +
    '</table>' +
    '<p>Applications are reviewed after the final application deadline, and the Academic Registrar will write to you about admission. ' +
    (d.grant !== 'none' ? 'Because you asked to be considered for a financial need grant, the Registrar will also be in touch about next steps for the grant. ' : '') +
    'Your PayPal receipt arrives separately.</p>' +
    '<p>If you have any questions, reply to this email or write to the Academic Registrar at ' +
    '<a href="mailto:academic-registrar@icscanada.edu" style="color:#35596D">academic-registrar@icscanada.edu</a>.</p>' +
    '<p style="margin-top:28px">Institute for Christian Studies<br>59 St. George Street, Toronto, Ontario M5S 2E6<br>1-416-979-2331 · toll free 1-888-326-5347</p>' +
    '</div>';
  MailApp.sendEmail({
    to: d.email,
    replyTo: CONFIG.REPLY_TO,
    name: CONFIG.SENDER_NAME,
    subject: 'Your ART in Orvieto application (' + r.ref + ')',
    htmlBody: html
  });
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function getRootFolder_() {
  var id = PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID');
  if (!id) return null;
  try { return DriveApp.getFolderById(id); } catch (err) { return null; }
}

function getSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) return null;
  try { return SpreadsheetApp.openById(id).getSheets()[0]; } catch (err) { return null; }
}

/** Finds an earlier row for this PayPal order; returns { ref } or null. */
function findOrder_(sheet, orderId) {
  var col = HEADERS.indexOf('PayPal order ID') + 1;
  var cell = sheet.getRange(1, col, Math.max(sheet.getLastRow(), 1), 1)
    .createTextFinder(orderId).matchEntireCell(true).findNext();
  if (!cell) return null;
  return { ref: sheet.getRange(cell.getRow(), HEADERS.indexOf('Reference') + 1).getDisplayValue() };
}

/** Text that Sheets must never treat as a formula. */
function plain_(v) {
  v = v == null ? '' : String(v);
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** A filesystem-safe name with the right extension. */
function safeName_(name, ext) {
  var base = String(name || 'file').replace(/\.[^.]*$/, '').replace(/[^\w\s.,()'-]+/g, '_').trim().slice(0, 80) || 'file';
  return base + '.' + ext;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
