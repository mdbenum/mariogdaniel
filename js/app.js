document.documentElement.classList.remove('no-js');
document.documentElement.classList.add('js');

const invitationShell = document.querySelector('[data-invitation-shell]');
const deliverySequence = document.querySelector('[data-delivery-sequence]');
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

let deliveryTimeoutIds = [];

const clearDeliveryTimeouts = () => {
	deliveryTimeoutIds.forEach((timeoutId) => {
		window.clearTimeout(timeoutId);
	});
	deliveryTimeoutIds = [];
};

const revealInvitationContent = () => {
	document.body.classList.add('is-content-revealed');
	startTimelineAnimation();
	startTimelineOnboarding();
};

const runDeliverySequence = () => {
	if (!deliverySequence || reduceMotionQuery.matches) {
		revealInvitationContent();
		return;
	}

	deliverySequence.hidden = false;
	deliverySequence.classList.remove('is-exit');
	requestAnimationFrame(() => {
		deliverySequence.classList.add('is-playing');
	});

	deliveryTimeoutIds.push(
		window.setTimeout(() => {
			revealInvitationContent();
		}, 2340)
	);

	deliveryTimeoutIds.push(
		window.setTimeout(() => {
			deliverySequence.classList.add('is-exit');
		}, 2540)
	);

	deliveryTimeoutIds.push(
		window.setTimeout(() => {
			deliverySequence.hidden = true;
			deliverySequence.classList.remove('is-playing', 'is-exit');
		}, 2820)
	);
};

// Start delivery sequence immediately on load
requestAnimationFrame(() => {
	requestAnimationFrame(() => {
		document.body.classList.add('is-loaded');
		runDeliverySequence();
	});
});

// ─── Countdown ───────────────────────────────────────────────
const countdownEl = document.querySelector('[data-countdown]');
if (countdownEl) {
	const weddingDate = new Date('2027-07-03');
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const diff = Math.ceil((weddingDate - today) / (1000 * 60 * 60 * 24));
	countdownEl.textContent = diff > 0 ? diff : 0;
}

// ─── Timeline modal interactions ─────────────────────────────
const timelineOpenStops = document.querySelectorAll('[data-tl-open]');
const timelineContainer = document.querySelector('[data-tl-container]');
const timelineHint = document.querySelector('[data-tl-hint]');
const tlModal = document.querySelector('[data-tl-modal]');
const tlModalTitle = document.querySelector('[data-tl-modal-title]');
const tlModalCloseTargets = document.querySelectorAll('[data-tl-close]');

let timelineHintDismissed = false;

const dismissTimelineHint = () => {
	timelineHintDismissed = true;

	if (timelineHint) {
		timelineHint.classList.add('is-hidden');
	}

	if (timelineContainer) {
		timelineContainer.classList.remove('is-pulsing');
	}
};

const startTimelineOnboarding = () => {
	if (!timelineContainer || timelineHintDismissed) {
		return;
	}

	if (timelineHint) {
		timelineHint.classList.remove('is-hidden');
	}
	timelineContainer.classList.remove('is-pulsing');

	window.setTimeout(() => {
		if (timelineHintDismissed) {
			return;
		}

		timelineContainer.classList.add('is-pulsing');
	}, 280);

	window.setTimeout(() => {
		timelineContainer.classList.remove('is-pulsing');
	}, 5600);
};

const closeTimelineModal = () => {
	if (!tlModal) {
		return;
	}

	document.body.classList.remove('tl-modal-open');
	tlModal.setAttribute('aria-hidden', 'true');
	window.setTimeout(() => {
		tlModal.hidden = true;
	}, 260);
};

const openTimelineModal = (titleText) => {
	if (!tlModal || !tlModalTitle) {
		return;
	}

	tlModalTitle.textContent = titleText || 'Detaljer';
	tlModal.hidden = false;
	tlModal.setAttribute('aria-hidden', 'false');
	requestAnimationFrame(() => {
		document.body.classList.add('tl-modal-open');
	});
};

if (timelineOpenStops.length) {
	timelineOpenStops.forEach((stop) => {
		stop.setAttribute('role', 'button');
		stop.setAttribute('tabindex', '0');

		const heading = stop.querySelector('.timeline__heading');
		const titleText = heading ? heading.textContent.trim() : 'Detaljer';

		stop.addEventListener('click', () => {
				dismissTimelineHint();
			openTimelineModal(titleText);
		});

			stop.addEventListener('touchstart', () => {
				dismissTimelineHint();
			}, { once: true, passive: true });

		stop.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
					dismissTimelineHint();
				openTimelineModal(titleText);
			}
		});
	});
}

if (tlModalCloseTargets.length) {
	tlModalCloseTargets.forEach((closeTarget) => {
		closeTarget.addEventListener('click', closeTimelineModal);
	});
}

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && tlModal && !tlModal.hidden) {
		closeTimelineModal();
	}
});

// ─── Timeline animation ───────────────────────────────────────
const tlStops = document.querySelectorAll('[data-tl-stop]');

const startTimelineAnimation = () => {
	if (!tlStops.length || reduceMotionQuery.matches) {
		tlStops.forEach((stop) => stop.classList.add('is-visible'));
		return;
	}

	const lineMs = 2000; // must match CSS transition duration
	const timeline = document.querySelector('.timeline');
	const timelineLine = document.querySelector('.timeline__line');
	const timelineHeight = timelineLine ? timelineLine.offsetHeight : (timeline ? timeline.offsetHeight : 1);

	tlStops.forEach((stop) => {
		const marker = stop.querySelector('.timeline__marker');
		const markerTop = marker
			? marker.getBoundingClientRect().top - timeline.getBoundingClientRect().top
			: stop.offsetTop;
		const pct = Math.min(Math.max(markerTop / timelineHeight, 0), 1);
		const delay = Math.round(lineMs * pct);
		stop.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
		window.setTimeout(() => {
			stop.classList.add('is-visible');
		}, delay);
	});
};
