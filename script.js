const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.primary-nav');

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
  navigation.classList.toggle('is-open', !isOpen);
});

navigation.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    navigation.classList.remove('is-open');
  });
});

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
document.querySelector('#year').textContent = new Date().getFullYear();

document.querySelector('#inquiry-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.querySelector('#form-feedback');
  const submitButton = form.querySelector('button[type="submit"]');
  const payload = Object.fromEntries(new FormData(form).entries());
  feedback.textContent = '';
  submitButton.disabled = true;
  submitButton.querySelector('span').textContent = '…';

  fetch('/api/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your inquiry could not be saved. Please try again.');
      form.reset();
      feedback.textContent = 'Thank you — your inquiry has been received. We’ll be in touch soon.';
    })
    .catch((error) => {
      feedback.textContent = error.message || 'Connection error. Please try again in a moment.';
    })
    .finally(() => {
      submitButton.disabled = false;
      submitButton.querySelector('span').textContent = '↗';
    });
});
