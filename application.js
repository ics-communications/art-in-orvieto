/* ART in Orvieto: the application form.
 *
 * Flow: the applicant completes the form → pays the CAD $90 fee with PayPal →
 * once PayPal confirms the payment, the application (with any work samples) is
 * posted to the Google Apps Script in _scripts/, which re-checks the payment
 * with PayPal before saving anything. Setup: _scripts/SETUP.md.
 */
(function () {
  'use strict';

  /* ── Settings ────────────────────────────────────────────────────────────── */

  var CONFIG = {
    // The Apps Script web app URL (ends in /exec). Until it is set, the form
    // shows a "write to the Registrar" notice instead of the payment buttons.
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxwi5txfdscD1o8PoiPQ1-eV9QRa67GAcrUdg_GgsT26BPDdLiSUAaSJXD5UqNLl8Xm/exec',
    // ICS's live PayPal client ID (the same PayPal app as the F2BF courses page).
    PAYPAL_CLIENT_ID: 'AdZ0cWK3Bl7wjgmrmgk_On-ac13XCdpZxx8te_4IPlRDVoYx3ZNoGG8vK7mb8VXdKH2L-TM1M3sMj6oI',
    PROGRAM_YEAR: '2027',
    FEE: '90.00',
    MAX_FILES: 2,
    MAX_FILE_BYTES: 10 * 1024 * 1024,
    MAX_EDU_ROWS: 6,
    DRAFT_KEY: 'aio-application-draft-2027'
  };
  var FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/tiff', 'application/pdf'];
  var REGISTRAR = 'academic-registrar@icscanada.edu';

  var form = document.getElementById('application');
  if (!form) return;
  var stateBox = document.getElementById('app-state');
  var errorBox = document.getElementById('app-error');
  var paySlot = document.getElementById('paypal-slot');
  var eduRows = document.getElementById('edu-rows');
  var eduTemplate = document.getElementById('edu-template');
  var eduAdd = document.getElementById('edu-add');
  var fileInput = document.getElementById('f-files');
  var fileList = document.getElementById('file-list');
  var drop = document.getElementById('drop');

  var files = [];          // File objects chosen for work samples
  var attempted = false;   // show inline errors live once a send was attempted
  var draft = loadDraft();
  var ref = draft.ref || newRef();
  var paidOrderId = draft.paidOrderId || null;  // payment taken, application not yet delivered

  /* ── Small helpers ───────────────────────────────────────────────────────── */

  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function val(name) {
    var el = form.elements[name];
    if (!el) return '';
    if (el instanceof RadioNodeList || (el.length && el[0] && el[0].type === 'radio')) return el.value || '';
    return (el.value || '').trim();
  }
  function newRef() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
    var bytes = new Uint8Array(6);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    for (var i = 0; i < 6; i++) out += chars[bytes[i] % chars.length];
    return 'AIO-' + CONFIG.PROGRAM_YEAR + '-' + out;
  }
  function words(text) { var m = text.trim().match(/\S+/g); return m ? m.length : 0; }
  function sizeLabel(bytes) { return bytes < 1048576 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB'; }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function icon(path) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '"/></svg>'; }

  /* ── Draft (this device only; files are never stored) ────────────────────── */

  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(CONFIG.DRAFT_KEY)) || {}; } catch (e) { return {}; }
  }
  var saveTimer;
  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var data = { ref: ref, paidOrderId: paidOrderId, fields: {}, education: readEducation(true) };
      $all('input[name], textarea[name]', form).forEach(function (el) {
        if (el.type === 'radio') { if (el.checked) data.fields[el.name] = el.value; }
        else data.fields[el.name] = el.value;
      });
      try { localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
    }, 300);
  }
  function clearDraft() { clearTimeout(saveTimer); try { localStorage.removeItem(CONFIG.DRAFT_KEY); } catch (e) { /* ignore */ } }
  function restoreDraft() {
    var f = draft.fields || {};
    Object.keys(f).forEach(function (name) {
      $all('[name="' + name + '"]', form).forEach(function (el) {
        if (el.type === 'radio') el.checked = el.value === f[name];
        else el.value = f[name];
      });
    });
  }

  /* ── Education rows ──────────────────────────────────────────────────────── */

  var eduCount = 0;
  function addEduRow(data) {
    var row = eduTemplate.content.firstElementChild.cloneNode(true);
    var n = eduCount++;
    $all('.field', row).forEach(function (field) {
      var input = field.querySelector('input');
      var id = 'edu-' + n + '-' + input.getAttribute('data-edu');
      input.id = id;
      field.querySelector('label').setAttribute('for', id);
      if (data) input.value = data[input.getAttribute('data-edu')] || '';
    });
    row.querySelector('.edu-remove').addEventListener('click', function () {
      row.remove();
      syncEdu();
      saveDraft();
      var first = eduRows.querySelector('input');
      if (first) first.focus();
    });
    eduRows.appendChild(row);
    syncEdu();
    return row;
  }
  function syncEdu() {
    var rows = $all('.edu-row', eduRows);
    rows.forEach(function (r) { r.querySelector('.edu-remove').hidden = rows.length === 1; });
    eduAdd.hidden = rows.length >= CONFIG.MAX_EDU_ROWS;
  }
  function readEducation(all) {
    return $all('.edu-row', eduRows).map(function (r) {
      var o = {};
      $all('input', r).forEach(function (i) { o[i.getAttribute('data-edu')] = i.value.trim(); });
      return o;
    }).filter(function (o) { return all || o.institution || o.degree || o.year; });
  }
  eduAdd.addEventListener('click', function () {
    addEduRow().querySelector('input').focus();
  });

  /* ── Conditional sections ────────────────────────────────────────────────── */

  function syncConditions() {
    $all('[data-show-when]', form).forEach(function (el) {
      var rule = el.getAttribute('data-show-when').split('=');
      var show = rule[1].split('|').indexOf(val(rule[0])) !== -1;
      el.hidden = !show;
    });
    form.querySelector('.materials-empty').hidden = !!val('courses');
    document.getElementById('set-materials').querySelector('legend').textContent =
      val('courses') === 'seminar' ? 'Your statement' : val('courses') === 'residency' ? 'Your statement and work' : val('courses') === 'both' ? 'Your statements and work' : 'Your statements';
  }

  /* ── Word counts ─────────────────────────────────────────────────────────── */

  function syncCount(textarea) {
    var out = document.getElementById(textarea.id + '-count');
    var n = words(textarea.value);
    out.classList.toggle('over', n > 300);
    out.textContent = n === 0 ? 'About 250 words'
      : n + (n === 1 ? ' word' : ' words') + (n > 300 ? ' · please trim to about 250' : ' of about 250');
  }

  /* ── Work samples ────────────────────────────────────────────────────────── */

  function addFiles(list) {
    var problems = [];
    Array.prototype.forEach.call(list, function (file) {
      var type = file.type || (/\.(heic|heif)$/i.test(file.name) ? 'image/heic' : '');
      if (files.length >= CONFIG.MAX_FILES) { problems.push('You can upload up to ' + CONFIG.MAX_FILES + ' files.'); return; }
      if (FILE_TYPES.indexOf(type) === -1) { problems.push('“' + file.name + '” isn’t an image or PDF.'); return; }
      if (file.size > CONFIG.MAX_FILE_BYTES) { problems.push('“' + file.name + '” is ' + sizeLabel(file.size) + '; the limit is 10 MB. Try a smaller export, or share it as a link.'); return; }
      if (files.some(function (f) { return f.name === file.name && f.size === file.size; })) return;
      files.push(file);
    });
    renderFiles(problems);
  }
  function renderFiles(problems) {
    fileList.innerHTML = '';
    files.forEach(function (file, i) {
      var li = document.createElement('li');
      li.innerHTML = icon(file.type === 'application/pdf' ? 'M7 3h7l5 5v13H7zM14 3v5h5' : 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4') +
        '<span class="file-name">' + esc(file.name) + '</span><span class="file-size">' + sizeLabel(file.size) + '</span>' +
        '<button type="button" class="file-remove">Remove<span class="sr-only"> ' + esc(file.name) + '</span></button>';
      li.querySelector('button').addEventListener('click', function () {
        files.splice(i, 1);
        renderFiles();
        fileInput.focus();
        revalidate();
      });
      fileList.appendChild(li);
    });
    (problems || []).forEach(function (msg) {
      var li = document.createElement('li');
      li.className = 'file-problem';
      li.textContent = msg;
      fileList.appendChild(li);
    });
    drop.classList.toggle('is-full', files.length >= CONFIG.MAX_FILES);
    fileInput.disabled = files.length >= CONFIG.MAX_FILES;
  }
  fileInput.addEventListener('change', function () { addFiles(fileInput.files); fileInput.value = ''; revalidate(); });
  ['dragenter', 'dragover'].forEach(function (t) {
    drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
  });
  ['dragleave', 'drop'].forEach(function (t) {
    drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
  });
  drop.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); revalidate(); });

  /* ── Validation ──────────────────────────────────────────────────────────── */

  var LABELS = {
    firstName: 'Enter your first name.', lastName: 'Enter your last name.', email: 'Enter your email address.',
    phone: 'Enter a phone number.', street: 'Enter your street address.', city: 'Enter your city.',
    region: 'Enter your province or state.', postal: 'Enter your postal or zip code.', country: 'Enter your country.',
    creditInstitution: 'Name the institution that will grant your credit.',
    seminarStatement: 'Write your statement for the Seminar.', residencyStatement: 'Write your statement for the Studio Residency.'
  };

  function setError(target, message) {
    var host = target.closest('.field, .choice-group, .samples, .edu-rows');
    if (!host) return;
    var box = host.querySelector(':scope > .field-error');
    if (!box) {
      box = document.createElement('p');
      box.className = 'field-error';
      box.id = (target.id || target.name || 'x') + '-error';
      host.appendChild(box);
    }
    box.textContent = message;
    host.classList.add('has-error');
    $all('input, textarea', host).forEach(function (el) {
      if (el.type !== 'file') { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-errormessage', box.id); }
    });
  }
  function clearErrors() {
    $all('.field-error', form).forEach(function (e) { e.remove(); });
    $all('.has-error', form).forEach(function (e) { e.classList.remove('has-error'); });
    $all('[aria-invalid]', form).forEach(function (e) { e.removeAttribute('aria-invalid'); e.removeAttribute('aria-errormessage'); });
  }

  /** Returns the first problem element, or null when the form is complete. */
  function validate() {
    clearErrors();
    var first = null;
    function fail(el, msg) { setError(el, msg); if (!first) first = el; }

    ['firstName', 'lastName', 'email', 'phone', 'street', 'city', 'region', 'postal', 'country'].forEach(function (name) {
      if (!val(name)) fail(form.elements[name], LABELS[name]);
    });
    if (val('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) fail(form.elements.email, 'Check your email address; it should look like name@example.com.');

    var edu = readEducation();
    var firstEduInput = eduRows.querySelector('input');
    if (!edu.length) fail(firstEduInput, 'List at least one institution where you have studied.');
    else if (edu.some(function (r) { return !r.institution; })) {
      var blank = $all('.edu-row', eduRows).filter(function (r) { return !r.querySelector('[data-edu="institution"]').value.trim() && (r.querySelector('[data-edu="degree"]').value.trim() || r.querySelector('[data-edu="year"]').value.trim()); })[0];
      fail(blank ? blank.querySelector('input') : firstEduInput, 'Add the institution’s name and location to each row.');
    }

    if (!val('courses')) fail(form.elements.courses[0], 'Choose the Seminar, the Studio Residency, or both.');
    if (!val('credit')) fail(form.elements.credit[0], 'Choose graduate credit or audit.');
    else if (val('credit') === 'credit' && !val('creditInstitution')) fail(form.elements.creditInstitution, LABELS.creditInstitution);
    if (!val('room')) fail(form.elements.room[0], 'Choose a room preference.');
    if (!val('grant')) fail(form.elements.grant[0], 'Choose whether to apply for a financial need grant.');

    var c = val('courses');
    if ((c === 'seminar' || c === 'both') && !val('seminarStatement')) fail(form.elements.seminarStatement, LABELS.seminarStatement);
    if (c === 'residency' || c === 'both') {
      if (!val('residencyStatement')) fail(form.elements.residencyStatement, LABELS.residencyStatement);
      var link = val('workLink');
      if (link && !/^https?:\/\/\S+\.\S+/i.test(link)) fail(form.elements.workLink, 'Enter the full link, starting with https://');
      else if (!files.length && !link) fail(fileInput, 'Upload at least one work sample, or share a link to your work.');
    }
    return first;
  }

  function showError(html) {
    errorBox.innerHTML = html;
    errorBox.hidden = false;
  }
  function hideError() { errorBox.hidden = true; errorBox.innerHTML = ''; }

  function checkBeforePaying() {
    attempted = true;
    var first = validate();
    if (!first) { hideError(); return true; }
    var count = $all('.field-error', form).length;
    showError('<strong>' + (count === 1 ? 'One answer needs' : count + ' answers need') + ' attention</strong> before you pay. ' +
      '<a href="#' + (first.id || '') + '" class="jump">Go to the first one</a>.');
    first.closest('.field, .choice-group, .samples, .edu-rows').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { first.focus({ preventScroll: true }); }, 350);
    return false;
  }
  errorBox.addEventListener('click', function (e) {
    var a = e.target.closest('.jump');
    if (!a) return;
    e.preventDefault();
    var first = validate();
    if (first) { first.closest('.field, .choice-group, .samples, .edu-rows').scrollIntoView({ behavior: 'smooth', block: 'center' }); first.focus({ preventScroll: true }); }
  });

  /* ── Sending ─────────────────────────────────────────────────────────────── */

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        resolve({ name: file.name, type: file.type || 'image/heic', data: String(r.result).split(',')[1] });
      };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(file);
    });
  }

  function payload() {
    var c = val('courses');
    var residency = c === 'residency' || c === 'both';
    var data = {
      ref: ref, orderId: paidOrderId,
      firstName: val('firstName'), lastName: val('lastName'), email: val('email'), phone: val('phone'),
      street: val('street'), city: val('city'), region: val('region'), postal: val('postal'), country: val('country'),
      education: readEducation(),
      courses: c, credit: val('credit'), creditInstitution: val('credit') === 'credit' ? val('creditInstitution') : '',
      room: val('room'), grant: val('grant'),
      seminarStatement: c === 'seminar' || c === 'both' ? val('seminarStatement') : '',
      residencyStatement: residency ? val('residencyStatement') : '',
      workLink: residency ? val('workLink') : ''
    };
    return Promise.all(residency ? files.map(readFile) : []).then(function (encoded) {
      data.files = encoded;
      return data;
    });
  }

  function showState(html) {
    stateBox.innerHTML = html;
    stateBox.hidden = false;
    form.hidden = true;
    stateBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    stateBox.focus({ preventScroll: true });
  }

  function send() {
    var hasFiles = files.length && (val('courses') === 'residency' || val('courses') === 'both');
    showState(
      '<div class="state-sending">' +
      '<h3>Sending your application</h3>' +
      '<p>Your payment went through. Please keep this page open while we send your application' + (hasFiles ? ' and work samples' : '') + '; it can take up to a minute.</p>' +
      '<div class="sending-rule" aria-hidden="true"></div></div>');

    payload().then(function (data) {
      return fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },  // a "simple" request: no CORS preflight
        body: JSON.stringify(data)
      });
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (res) {
      if (res.ok) return succeed();
      sendFailed(res.message || 'Your application could not be saved.', res.error === 'payment');
    }).catch(function (err) {
      console.error('Application send failed:', err);
      sendFailed('We couldn’t reach our application server. This is usually a brief connection problem.', false);
    });
  }

  function succeed() {
    var name = val('firstName');
    clearDraft();
    showState(
      '<div class="state-done">' +
      '<p class="apply-ornament" aria-hidden="true">✣</p>' +
      '<h3>Thank you, ' + esc(name) + '. Your application is in.</h3>' +
      '<p>We’ve emailed a confirmation to <strong>' + esc(val('email')) + '</strong>, and your PayPal receipt will arrive separately. ' +
      'The Academic Registrar will write to you with an admission decision by April 15, 2027.</p>' +
      '<dl class="state-facts"><div><dt>Your reference</dt><dd>' + esc(ref) + '</dd></div>' +
      '<div><dt>PayPal order</dt><dd>' + esc(paidOrderId) + '</dd></div></dl>' +
      '</div>');
    paidOrderId = null;
  }

  /* Payment taken but the application didn't arrive: keep everything, offer a resend. */
  function sendFailed(message, paymentProblem) {
    stateBox.hidden = true;
    form.hidden = false;
    var mail = 'mailto:' + REGISTRAR + '?subject=' + encodeURIComponent('ART in Orvieto application (' + ref + ')') +
      '&body=' + encodeURIComponent('My application fee was paid (PayPal order ' + paidOrderId + ', reference ' + ref + ') but the application did not go through.');
    showError('<strong>' + esc(message) + '</strong> ' +
      (paymentProblem
        ? 'Please <a href="' + mail + '">write to the Academic Registrar</a> and quote PayPal order ' + esc(paidOrderId) + '.'
        : 'Your payment is safe (PayPal order ' + esc(paidOrderId) + '), and you won’t be charged again. Press <em>Send application</em> to try once more, or <a href="' + mail + '">write to the Registrar</a>.'));
    renderPaySlot();
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    errorBox.focus({ preventScroll: true });
  }

  /* ── PayPal ──────────────────────────────────────────────────────────────── */

  function renderPaySlot() {
    form.querySelector('.pay-lede').hidden = !CONFIG.SCRIPT_URL || !!paidOrderId;
    if (!CONFIG.SCRIPT_URL) {
      paySlot.innerHTML = '<p class="pay-status">Online applications open shortly. Until then, please <a href="mailto:' + REGISTRAR +
        '?subject=ART%20in%20Orvieto%20application">write to the Academic Registrar</a> to apply.</p>';
      return;
    }
    if (paidOrderId) {
      // Already paid: never show the payment buttons again for this application.
      paySlot.innerHTML = '<p class="pay-status paid">' + icon('M5 12.5l4.5 4.5L19 7') + 'Fee paid · PayPal order ' + esc(paidOrderId) + '</p>' +
        '<button type="button" class="btn btn-solid btn-send">Send application</button>';
      paySlot.querySelector('.btn-send').addEventListener('click', function () {
        if (checkBeforePaying()) send();
      });
      return;
    }
    if (!window.paypal) { loadPayPal(); return; }

    paySlot.innerHTML = '';
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 48 },
      onClick: function (data, actions) {
        return checkBeforePaying() ? actions.resolve() : actions.reject();
      },
      createOrder: function (data, actions) {
        return actions.order.create({
          purchase_units: [{
            description: 'ART in Orvieto ' + CONFIG.PROGRAM_YEAR + ' application fee | ' + val('firstName') + ' ' + val('lastName') + ' | ' + val('email'),
            custom_id: ref,
            invoice_id: ref,
            amount: { currency_code: 'CAD', value: CONFIG.FEE }
          }],
          application_context: { brand_name: 'ART in Orvieto - ICS', shipping_preference: 'NO_SHIPPING' }
        });
      },
      onApprove: function (data, actions) {
        return actions.order.capture().then(function (details) {
          paidOrderId = details.id || data.orderID;
          saveDraft();
          send();
        });
      },
      onCancel: function () {
        showError('Payment cancelled. Your application hasn’t been sent; you can pay whenever you’re ready.');
      },
      onError: function (err) {
        console.error('PayPal error:', err);
        if (String(err && err.message || err).indexOf('DUPLICATE_INVOICE_ID') !== -1) {
          showError('<strong>This application has already been paid for.</strong> Please <a href="mailto:' + REGISTRAR + '?subject=' +
            encodeURIComponent('ART in Orvieto application (' + ref + ')') + '">write to the Academic Registrar</a> and quote reference ' + esc(ref) + '.');
        } else {
          showError('<strong>The payment didn’t go through.</strong> You haven’t been charged. Please try again, or <a href="mailto:' + REGISTRAR + '">write to the Registrar</a> if it keeps happening.');
        }
      }
    }).render(paySlot);
  }

  var paypalRequested = false;
  function loadPayPal() {
    if (paypalRequested) return;
    paypalRequested = true;
    var s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(CONFIG.PAYPAL_CLIENT_ID) +
      '&currency=CAD&intent=capture&components=buttons&disable-funding=paylater';
    s.async = true;
    s.onload = renderPaySlot;
    s.onerror = function () {
      paySlot.innerHTML = '<p class="pay-status">The payment buttons didn’t load. Check your connection and <a href="#application" onclick="location.reload();return false">reload the page</a>; your answers are saved on this device.</p>';
    };
    document.head.appendChild(s);
  }

  /* ── Wire up ─────────────────────────────────────────────────────────────── */

  restoreDraft();
  (draft.education && draft.education.length ? draft.education : [null]).forEach(addEduRow);
  syncConditions();
  $all('textarea', form).forEach(syncCount);

  /* After a first attempt, errors update as the applicant fixes them. */
  function revalidate() {
    if (!attempted || paidOrderId) { if (attempted && !validate()) hideError(); return; }
    if (!validate()) { hideError(); return; }
    var count = $all('.field-error', form).length;
    var strong = errorBox.querySelector('strong');
    if (strong) strong.textContent = count === 1 ? 'One answer needs attention' : count + ' answers need attention';
  }

  form.addEventListener('input', function (e) {
    if (e.target.tagName === 'TEXTAREA') syncCount(e.target);
    saveDraft();
    revalidate();
  });
  form.addEventListener('change', function (e) {
    if (e.target.type === 'radio') { syncConditions(); saveDraft(); revalidate(); }
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  // Load PayPal only when the applicant gets near the form.
  if (!CONFIG.SCRIPT_URL || paidOrderId || !('IntersectionObserver' in window)) {
    renderPaySlot();
  } else {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); renderPaySlot(); }
    }, { rootMargin: '1200px 0px' });
    io.observe(form);
  }

  // A payment from an earlier visit that never reached us: offer to send it.
  if (paidOrderId && CONFIG.SCRIPT_URL) {
    showError('<strong>Your fee was paid on an earlier visit</strong> (PayPal order ' + esc(paidOrderId) + '), but the application wasn’t sent. ' +
      'Check your answers' + (val('courses') !== 'seminar' ? ', add your work samples again' : '') + ', and press <em>Send application</em>.');
  }
})();
