const EMAILJS_SERVICE_ID     = 'service_q1rfzzq';
const EMAILJS_TEMPLATE_HOST  = 'template_ggk7w5m';
const EMAILJS_TEMPLATE_GUEST = 'template_jmagriu';
const EMAILJS_PUBLIC_KEY     = 'n2FvekeI7Y6R5QDb9';
const HOST_EMAIL             = 'icy.cristy@gmail.com';

const TOTAL_SLOTS   = 7;
const STORAGE_KEY   = 'rsvp_confirmed_count';
const RSVP_DONE_KEY = 'rsvp_already_submitted'; // prevents duplicate submissions
const DATA_VERSION  = 'v3_final';               // bump this string to wipe old test data

/* ── Wipe old test data if version changed ── */
(function clearTestData() {
  if (localStorage.getItem('rsvp_data_version') !== DATA_VERSION) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RSVP_DONE_KEY);
    localStorage.removeItem('rsvp_guest_name');
    localStorage.setItem('rsvp_data_version', DATA_VERSION);
    console.log('RSVP data reset to final version.');
  }
})();

/* ── Read confirmed count from localStorage ── */
function getConfirmed() {
  return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
}

function saveConfirmed(n) {
  localStorage.setItem(STORAGE_KEY, String(n));
}

/* ── Update the slots badge on the invite card ── */
function updateSlotsBadge() {
  const confirmed = getConfirmed();
  const remaining = TOTAL_SLOTS - confirmed;
  const badge     = document.getElementById('slotsBadge');
  if (!badge) return;

  if (remaining <= 0) {
    badge.className = 'slots-badge full';
    badge.innerHTML = '<span>Sorry — slots are full!</span>';
    const btn = document.querySelector('.rsvp-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Slots Full'; }
  } else {
    badge.className = 'slots-badge';
    badge.innerHTML = '<span>✦ ' + remaining + ' slot' + (remaining === 1 ? '' : 's') + ' remaining</span>';
  }
}

/* ── Open / close modal ── */
function openModal() {
  if (getConfirmed() >= TOTAL_SLOTS) return;

  // Prevent re-submission from the same browser
  if (localStorage.getItem(RSVP_DONE_KEY)) {
    showAlreadyRSVPd();
    return;
  }

  document.getElementById('rsvpModal').classList.add('open');
}

/* ── Show already-RSVP'd message ── */
function showAlreadyRSVPd() {
  const modal = document.getElementById('rsvpModal');
  const name  = localStorage.getItem('rsvp_guest_name') || 'you';
  modal.classList.add('open');
  document.getElementById('modalContent').innerHTML =
    '<div class="success-icon">✦</div>' +
    '<h3 style="margin-bottom:8px;">Already RSVP\'d!</h3>' +
    '<p class="success-msg">You\'ve already submitted your RSVP, ' + name + '. We\'re excited to see you! 🎉</p>' +
    '<p style="font-size:0.75rem; color:#8B1A1A; opacity:0.7; margin-top:10px;">Please check your email for your confirmation.</p>' +
    '<button class="btn-confirm" style="margin-top:18px; width:100%;" ' +
    'onclick="document.getElementById(\'rsvpModal\').classList.remove(\'open\')">Close</button>';
}

document.addEventListener('DOMContentLoaded', function () {
  emailjs.init(EMAILJS_PUBLIC_KEY);
  updateSlotsBadge();

  // If already RSVP'd from this browser, update the button label
  if (localStorage.getItem(RSVP_DONE_KEY)) {
    const btn = document.querySelector('.rsvp-btn');
    if (btn) btn.textContent = '✓ RSVP Submitted';
  }

  document.getElementById('rsvpModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('open');
  });
});

/* ── Submit ── */
async function submitRSVP() {
  const name   = document.getElementById('guestName').value.trim();
  const email  = document.getElementById('guestEmail').value.trim();
  const attend = document.getElementById('guestAttend').value;
  const note   = document.getElementById('guestNote').value.trim();

  if (!name || !email || !attend) {
    alert('Please fill in your name, email and attendance.');
    return;
  }

  const btn = document.querySelector('.btn-confirm');
  btn.textContent = 'Sending...';
  btn.disabled = true;

  const messages = {
    yes: '🎉 See you at the party, ' + name + '!',
    no:  "We'll miss you, " + name + '! Thanks for letting Inah know.'
  };

  const templateParams = {
    guest_name  : name,
    guest_email : email,
    attendance  : attend === 'yes' ? "Yes, I'll be there! 🎉" : "Sorry, can't make it",
    guest_note  : note || '(none)',
    host_email  : HOST_EMAIL
  };

  /* 1️⃣ Host email — includes the note */
  try {
    const res1 = await emailjs.send(
      EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_HOST, templateParams, EMAILJS_PUBLIC_KEY
    );
    console.log('Host email OK:', res1.status, res1.text);
  } catch (err) {
    console.error('Host email FAILED:', JSON.stringify(err));
    btn.textContent = 'Confirm RSVP';
    btn.disabled = false;
    alert('Host email failed.\n\nError: ' + (err.text || err.message || JSON.stringify(err)));
    return;
  }

  /* 2️⃣ Guest email — no note exposed */
/* 2️⃣ Guest email — only sent if attending */
  if (attend === 'yes') {
    try {
      const res2 = await emailjs.send(
        EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_GUEST, templateParams, EMAILJS_PUBLIC_KEY
      );
      console.log('Guest email OK:', res2.status, res2.text);
    } catch (err) {
      console.error('Guest email FAILED:', JSON.stringify(err));
      btn.textContent = 'Confirm RSVP';
      btn.disabled = false;
      alert('Guest confirmation email failed.\n\nError: ' + (err.text || err.message || JSON.stringify(err)));
      return;
    }
  }

  /* 3️⃣ Count slot only for confirmed "yes" attendees */
  if (attend === 'yes') {
    const newCount = getConfirmed() + 1;
    saveConfirmed(newCount);
    updateSlotsBadge();
  }

  /* 4️⃣ Mark this browser as already submitted */
  localStorage.setItem(RSVP_DONE_KEY, '1');
  localStorage.setItem('rsvp_guest_name', name);

  /* 5️⃣ Success display — NO note shown to guest */
  await new Promise(r => setTimeout(r, 400));
  document.getElementById('modalContent').innerHTML =
    '<div class="success-icon">✦</div>' +
    '<h3 style="margin-bottom:8px;">RSVP Received!</h3>' +
    '<p class="success-msg">' + messages[attend] + '</p>' +
(attend === 'yes' ? '<p style="font-size:0.75rem; color:#8B1A1A; opacity:0.7; margin-top:10px;">📧 Please check your email to receive the confirmation.</p>' : '') +    '<button class="btn-confirm" style="margin-top:18px; width:100%;" ' +
    'onclick="document.getElementById(\'rsvpModal\').classList.remove(\'open\')">Close</button>';
}
