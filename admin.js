const loginPanel = document.querySelector('#login-panel');
const inboxPanel = document.querySelector('#inbox-panel');
const feedback = document.querySelector('#login-feedback');
const status = document.querySelector('#inbox-status');
const list = document.querySelector('#inquiry-list');

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Something went wrong.');
  return result;
}

function makeText(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderInquiries(inquiries) {
  list.replaceChildren();
  status.textContent = `${inquiries.length} ${inquiries.length === 1 ? 'inquiry' : 'inquiries'}`;
  if (inquiries.length === 0) {
    list.append(makeText('p', 'empty-state', 'No inquiries yet. New messages will appear here.'));
    return;
  }

  inquiries.forEach((inquiry) => {
    const card = document.createElement('article');
    card.className = 'inquiry-card';
    const top = document.createElement('div');
    top.className = 'inquiry-top';
    const person = makeText('h2', 'inquiry-name', inquiry.name);
    const date = makeText('time', 'inquiry-date', new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium', timeStyle: 'short',
    }).format(new Date(inquiry.submittedAt)));
    date.dateTime = inquiry.submittedAt;
    top.append(person, date);
    const contact = document.createElement('a');
    contact.className = 'inquiry-email';
    contact.href = `mailto:${encodeURIComponent(inquiry.email)}`;
    contact.textContent = inquiry.email;
    card.append(top, makeText('p', 'inquiry-interest', inquiry.interest), contact,
      makeText('p', 'inquiry-message', inquiry.message));
    list.append(card);
  });
}

async function loadInbox() {
  try {
    const result = await api('/api/admin/inquiries');
    renderInquiries(result.inquiries);
  } catch (error) {
    status.textContent = error.message;
    loginPanel.hidden = false;
    inboxPanel.hidden = true;
  }
}

document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button');
  button.disabled = true;
  feedback.textContent = '';
  try {
    await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: new FormData(form).get('password') }),
    });
    form.reset();
    loginPanel.hidden = true;
    inboxPanel.hidden = false;
    await loadInbox();
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST', body: '{}' });
  inboxPanel.hidden = true;
  loginPanel.hidden = false;
});

api('/api/admin/session')
  .then(async (result) => {
    if (result.authenticated) {
      inboxPanel.hidden = false;
      await loadInbox();
    } else {
      loginPanel.hidden = false;
    }
  })
  .catch((error) => {
    loginPanel.hidden = false;
    feedback.textContent = error.message;
  });
