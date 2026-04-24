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
		}, 1520)
	);

	deliveryTimeoutIds.push(
		window.setTimeout(() => {
			deliverySequence.classList.add('is-exit');
		}, 2140)
	);

	deliveryTimeoutIds.push(
		window.setTimeout(() => {
			deliverySequence.hidden = true;
			deliverySequence.classList.remove('is-playing', 'is-exit');
		}, 2440)
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
const tlModalContent = document.querySelector('.tl-modal__content');
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
	
	// Set content based on title
	if (titleText === 'Vi vil invitere DEG!') {
		tlModalContent.textContent = 'Vi er heldige som har deg i livet vårt, og håper du vil være med og sette prikken over i-en på feiringen ❤️';
	} else if (titleText === 'Gi oss beskjed om du kommer') {
		tlModalContent.innerHTML = 'For å hjelpe oss med planleggingen, fyll ut <a href="https://forms.gle/placeholder" target="_blank" style="color: var(--accent); text-decoration: underline; font-weight: 600;">skjemaet</a> så snart du kan og senest før fristen.';
	} else if (titleText === 'Bestill rom for overnatting') {
		tlModalContent.innerHTML = 'Bryllupet vil holde til på et Resort i Farsund. Resortet har holdt av rom spesifikt for våre gjester til en rabattert pris ved bestilling før fristen. Bestill via <a href="https://placeholder-link.no" target="_blank" style="color: var(--accent); text-decoration: underline; font-weight: 600;">denne bookinglenken</a> for å sikre en plass og få rabattert pris. Dere må garantere bookingen med bankkort.<br><br><span class="tl-modal__note"><strong>OBS!</strong> Dere trenger ikke velge frokost som tillegg, det er allerede i romprisen!</span>';
	} else if (titleText === 'Ankomst og bli kjent') {
		tlModalContent.innerHTML = 'Fredag er satt av til å lande, finne seg til rette på resorten og la forventningene bygge seg opp til den store dagen. Etter hvert som gjestene ankommer, møtes vi til en uformell middag på brygga og en kveld som setter tonen for resten av feiringen.<br><br><span class="tl-modal__note"><strong>DRESSCODE:</strong> Uformelt pent</span>';
	} else if (titleText === 'Vi gifter oss i Farsund!') {
		tlModalContent.innerHTML = 'Lørdagen blir en dag vi har gledet oss lenge til, fylt av små og store øyeblikk fra første kaffekopp til siste dans:<br><br>• Rolig morgen med kaffekoppen ved sjøen<br>• Tur inn til sørlandsidylliske Farsund<br>• Vielse i Farsund kirke<br>• Mingling ved brygga<br>• Middag i låven<br>• Fest og feiring utover kvelden<br><br><span class="tl-modal__note"><strong>DRESSCODE:</strong> Pent bryllupsantrekk</span>';
	} else if (titleText === 'Frokost og farvel') {
		tlModalContent.innerHTML = 'Vi samles til frokost før det blir pakking og hjemreise.<br><br><strong style="color: var(--signal);">Status etter helgen:</strong> Vi er mann og kone, litt svimle av alt det fine vi har opplevd, og akkurat passe vemodige over at helgen allerede er over.';
	} else {
		tlModalContent.textContent = 'Placeholder';
	}
	
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
	tlStops.forEach((stop) => {
		stop.classList.add('is-visible');
	});
};
