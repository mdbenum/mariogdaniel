document.documentElement.classList.remove('no-js');
document.documentElement.classList.add('js');

const invitationShell = document.querySelector('[data-invitation-shell]');
const deliverySequence = document.querySelector('[data-delivery-sequence]');
const deliveryBgReveal = document.querySelector('[data-delivery-bg-reveal]');
const deliveryEnvelope = document.querySelector('[data-delivery-envelope]');
const deliveryPaper = document.querySelector('[data-delivery-paper]');
const invitationContent = document.querySelector('[data-invitation-content]');
const fireworksContainer = document.querySelector('[data-fireworks-container]');
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const DELIVERY_PAPER_EXPAND_MS = 700;
const DELIVERY_PAPER_REVEAL_PROGRESS = 0;
const DELIVERY_PAPER_REVEAL_MS = 1520 + Math.round(DELIVERY_PAPER_EXPAND_MS * DELIVERY_PAPER_REVEAL_PROGRESS);
const DELIVERY_ENVELOPE_FADE_DELAY_MS = 1300;

let deliveryTimeoutIds = [];
let invitationHasRevealed = false;

const clearDeliveryTimeouts = () => {
	deliveryTimeoutIds.forEach((timeoutId) => {
		window.clearTimeout(timeoutId);
	});
	deliveryTimeoutIds = [];
};

const updateInvitationRevealOrigin = () => {
	if (!deliveryPaper || !invitationContent) {
		return null;
	}

	const paperRect = deliveryPaper.getBoundingClientRect();
	const savedInlineStyle = invitationContent.getAttribute('style');

	invitationContent.style.animation = 'none';
	invitationContent.style.transform = 'none';
	invitationContent.style.opacity = '1';
	invitationContent.style.visibility = 'hidden';
	invitationContent.style.pointerEvents = 'none';

	const invitationRect = invitationContent.getBoundingClientRect();

	if (savedInlineStyle === null) {
		invitationContent.removeAttribute('style');
	} else {
		invitationContent.setAttribute('style', savedInlineStyle);
	}

	if (!invitationRect.width || !invitationRect.height) {
		return null;
	}

	let anchorX = paperRect.left + paperRect.width / 2;
	let anchorY = paperRect.top + paperRect.height / 2;
	let paperStartScaleX = 0.22;
	let paperStartScaleY = 0.3;
	let paperStartWidth = (window.innerWidth + 4) * paperStartScaleX;
	let paperStartHeight = (window.innerHeight + 4) * paperStartScaleY;

	if (deliveryEnvelope) {
		const envelopeRect = deliveryEnvelope.getBoundingClientRect();

		// Keep the paper shape aligned to the envelope (3:2) across all viewports.
		let desiredPaperWidth = envelopeRect.width * 1.1;
		let desiredPaperHeight = desiredPaperWidth / 1.5;
		const maxPaperHeight = envelopeRect.height * 0.92;

		if (desiredPaperHeight > maxPaperHeight) {
			desiredPaperHeight = maxPaperHeight;
			desiredPaperWidth = desiredPaperHeight * 1.5;
		}

		paperStartWidth = desiredPaperWidth;
		paperStartHeight = desiredPaperHeight;
		paperStartScaleX = Math.min(1, Math.max(0.05, desiredPaperWidth / window.innerWidth));
		paperStartScaleY = Math.min(1, Math.max(0.05, desiredPaperHeight / window.innerHeight));
	}

	const originX = anchorX - invitationRect.left;
	const originY = anchorY - invitationRect.top;
	const startScaleX = Math.min(1, Math.max(0.05, paperRect.width / invitationRect.width));
	const startScaleY = Math.min(1, Math.max(0.05, paperRect.height / invitationRect.height));
	// Fit invitation to the paper's actual start size before paper expand begins.
	const revealFitScale = Math.min(
		1,
		Math.max(0.04, Math.min(paperStartWidth / invitationRect.width, paperStartHeight / invitationRect.height))
	);
	const revealStartScaleX = revealFitScale;
	const revealStartScaleY = revealFitScale;
	const invitationCenterX = invitationRect.left + invitationRect.width / 2;
	const invitationCenterY = invitationRect.top + invitationRect.height / 2;
	const revealTranslateX = anchorX - invitationCenterX;
	const revealTranslateY = anchorY - invitationCenterY;

	const revealWidth = Math.max(40, paperRect.width);
	const revealHeight = Math.max(40, paperRect.height);
	const neededHalfWidth = Math.max(anchorX, window.innerWidth - anchorX) + 64;
	const neededHalfHeight = Math.max(anchorY, window.innerHeight - anchorY) + 64;
	const scaleForWidth = neededHalfWidth / (revealWidth / 2);
	const scaleForHeight = neededHalfHeight / (revealHeight / 2);
	const revealEndScale = Math.max(scaleForWidth, scaleForHeight);
	const revealStartScale = 1;

	invitationContent.style.setProperty('--invitation-origin-x', `${originX}px`);
	invitationContent.style.setProperty('--invitation-origin-y', `${originY}px`);
	invitationContent.style.setProperty('--invitation-start-scale-x', `${startScaleX}`);
	invitationContent.style.setProperty('--invitation-start-scale-y', `${startScaleY}`);
	invitationContent.style.setProperty('--invitation-reveal-start-scale-x', `${revealStartScaleX}`);
	invitationContent.style.setProperty('--invitation-reveal-start-scale-y', `${revealStartScaleY}`);
	invitationContent.style.setProperty('--invitation-reveal-translate-x', `${revealTranslateX}px`);
	invitationContent.style.setProperty('--invitation-reveal-translate-y', `${revealTranslateY}px`);

	const revealTarget = document.documentElement;
	revealTarget.style.setProperty('--delivery-reveal-origin-x', `${anchorX}px`);
	revealTarget.style.setProperty('--delivery-reveal-origin-y', `${anchorY}px`);
	revealTarget.style.setProperty('--delivery-reveal-width', `${revealWidth}px`);
	revealTarget.style.setProperty('--delivery-reveal-height', `${revealHeight}px`);
	revealTarget.style.setProperty('--delivery-reveal-start-scale', `${revealStartScale}`);
	revealTarget.style.setProperty('--delivery-reveal-end-scale', `${revealEndScale}`);
	revealTarget.style.setProperty('--delivery-paper-start-scale-x', `${paperStartScaleX}`);
	revealTarget.style.setProperty('--delivery-paper-start-scale-y', `${paperStartScaleY}`);

	return {
		revealStartScaleX,
		revealStartScaleY,
		revealTranslateX,
		revealTranslateY,
	};
};

const createFireworks = () => {
	if (!fireworksContainer || reduceMotionQuery.matches) {
		return;
	}

	const colors = ['#9c4f3d', '#c98368', '#b96c56', '#7a6159', '#34211d'];
	const particleCount = 100;
	const centerX = window.innerWidth / 2;
	const centerY = window.innerHeight * 0.25;

	fireworksContainer.innerHTML = '';

	for (let i = 0; i < particleCount; i++) {
		const particle = document.createElement('div');
		particle.className = 'firework-particle';
		particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
		
		const angle = (-60 + Math.random() * 300) * (Math.PI / 180);
		const distance = 150 + Math.random() * 200;
		const tx = Math.cos(angle) * distance;
		const ty = -Math.sin(angle) * distance;

		particle.style.left = centerX + 'px';
		particle.style.top = centerY + 'px';
		particle.style.setProperty('--tx', `${tx}px`);
		particle.style.setProperty('--ty', `${ty}px`);
		particle.style.animationDelay = (Math.random() * 0.3) + 's';

		fireworksContainer.appendChild(particle);
	}

	requestAnimationFrame(() => {
		fireworksContainer.classList.add('is-active');
	});

	deliveryTimeoutIds.push(
		window.setTimeout(() => {
			fireworksContainer.classList.remove('is-active');
		}, 3500)
	);
};

const settleInvitationContent = () => {
	document.body.classList.remove('is-content-visible');
	document.body.classList.add('is-invitation-settled');
};

const startDeliveryBackgroundReveal = () => {
	if (!deliverySequence) {
		return;
	}

	if (document.body.classList.contains('is-background-revealing')) {
		return;
	}

	updateInvitationRevealOrigin();
	document.body.classList.add('is-background-revealing');
};

const revealInvitationContent = () => {
	if (invitationHasRevealed) {
		return;
	}

	updateInvitationRevealOrigin();
	invitationHasRevealed = true;
	document.body.classList.remove('is-content-visible');
	document.body.classList.remove('is-content-revealed');

	if (reduceMotionQuery.matches || !invitationContent) {
		document.body.classList.add('is-content-visible', 'is-content-revealed');
		settleInvitationContent();
		return;
	}

	const startScaleX = Number.parseFloat(invitationContent.style.getPropertyValue('--invitation-reveal-start-scale-x')) || 0.12;
	const startScaleY = Number.parseFloat(invitationContent.style.getPropertyValue('--invitation-reveal-start-scale-y')) || 0.12;
	const startTranslateX = Number.parseFloat(invitationContent.style.getPropertyValue('--invitation-reveal-translate-x')) || 0;
	const startTranslateY = Number.parseFloat(invitationContent.style.getPropertyValue('--invitation-reveal-translate-y')) || 0;

	window.requestAnimationFrame(() => {
		document.body.classList.add('is-content-visible');
		window.requestAnimationFrame(() => {
			invitationContent.style.transform = `translate(${startTranslateX}px, ${startTranslateY}px) scale(${startScaleX}, ${startScaleY})`;
			invitationContent.style.opacity = '1';
			void invitationContent.offsetWidth;

			invitationContent.getAnimations().forEach((anim) => anim.cancel());
			const revealAnimation = invitationContent.animate(
				[
					{
						transform: `translate(${startTranslateX}px, ${startTranslateY}px) scale(${startScaleX}, ${startScaleY})`,
						opacity: 1,
					},
					{
						transform: 'translate(0px, 0px) scale(1, 1)',
						opacity: 1,
					},
				],
				{
					duration: 900,
					easing: 'cubic-bezier(0.2, 0.6, 0.2, 1)',
					fill: 'forwards',
				}
			);

			revealAnimation.finished
				.then(() => {
					document.body.classList.add('is-content-revealed');
				})
				.catch(() => {
					// Ignore cancellation when a new reveal cycle restarts.
				});
		});
	});
	deliveryTimeoutIds.push(
		window.setTimeout(() => {
			createFireworks();
		}, 1180)
	);
	startTimelineAnimation();
	startTimelineOnboarding();

	const handleInvitationZoomEnd = (event) => {
		if (event.target !== invitationContent || event.animationName !== 'invitation-zoom-in') {
			return;
		}

		invitationContent.removeEventListener('animationend', handleInvitationZoomEnd);
		settleInvitationContent();
	};

	invitationContent.addEventListener('animationend', handleInvitationZoomEnd);

	deliveryTimeoutIds.push(
		window.setTimeout(() => {
			settleInvitationContent();
		}, 2260)
	);
};

const runDeliverySequence = () => {
	if (!deliverySequence || reduceMotionQuery.matches) {
		revealInvitationContent();
		return;
	}

	const tapPrompt = document.querySelector('[data-delivery-tap-prompt]');

	document.body.classList.add('is-delivery-running');
			document.body.classList.remove('is-background-revealing', 'is-content-revealed', 'is-content-visible');
	deliverySequence.hidden = false;
	deliverySequence.classList.remove('is-exit');
	deliverySequence.style.background = '';
	if (deliveryEnvelope) deliveryEnvelope.classList.remove('is-fading');
	updateInvitationRevealOrigin();
	requestAnimationFrame(() => {
		deliverySequence.classList.add('is-playing');
	});

	// After envelope has landed, wait for click
	deliveryTimeoutIds.push(
		window.setTimeout(() => {
			deliverySequence.classList.add('is-waiting');
		}, 900)
	);

	const openEnvelope = () => {
		let hasClosedDelivery = false;

		const closeDeliverySequence = () => {
			if (!deliverySequence || hasClosedDelivery) {
				return;
			}

			hasClosedDelivery = true;
			deliverySequence.hidden = true;
			deliverySequence.classList.remove('is-playing', 'is-opening', 'is-paper-sliding', 'is-paper-expanding', 'is-waiting', 'is-exit');
			if (deliveryEnvelope) deliveryEnvelope.classList.remove('is-fading');
			document.body.classList.remove('is-background-revealing');
			document.body.classList.remove('is-delivery-running');
		};

		deliverySequence.removeEventListener('click', openEnvelope);
		deliverySequence.classList.remove('is-waiting');

		if (tapPrompt) {
			tapPrompt.style.opacity = '0';
		}

		deliverySequence.classList.add('is-opening');

		deliveryTimeoutIds.push(
			window.setTimeout(() => {
				deliverySequence.classList.add('is-paper-sliding');
			}, 460)
		);

		// Fade out envelope shortly before paper-expand starts
		deliveryTimeoutIds.push(
			window.setTimeout(() => {
				if (deliveryEnvelope) deliveryEnvelope.classList.add('is-fading');
			}, DELIVERY_ENVELOPE_FADE_DELAY_MS)
		);

		if (deliveryPaper) {
			const handlePaperExpandStart = (event) => {
				if (event.animationName !== 'delivery-paper-expand') {
					return;
				}
				deliveryPaper.removeEventListener('animationstart', handlePaperExpandStart);
				deliverySequence.classList.add('is-paper-expanding');
				startDeliveryBackgroundReveal();
				revealInvitationContent();
				const handlePaperExpandEnd = (endEvent) => {
					if (endEvent.animationName !== 'delivery-paper-expand') {
						return;
					}
					deliveryPaper.removeEventListener('animationend', handlePaperExpandEnd);
					deliverySequence.style.background = 'transparent';
					revealInvitationContent();
					window.requestAnimationFrame(() => {
						window.requestAnimationFrame(() => {
							closeDeliverySequence();
						});
					});
				};
				deliveryPaper.addEventListener('animationend', handlePaperExpandEnd);
			};
			deliveryPaper.addEventListener('animationstart', handlePaperExpandStart);
		}

		// Fallback reveal
		deliveryTimeoutIds.push(
			window.setTimeout(() => {
				startDeliveryBackgroundReveal();
				deliveryTimeoutIds.push(
					window.setTimeout(() => {
						revealInvitationContent();
					}, 360)
				);
			}, 2900)
		);

		deliveryTimeoutIds.push(
			window.setTimeout(() => {
				closeDeliverySequence();
			}, 4200)
		);
	};

	deliverySequence.addEventListener('click', openEnvelope);
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
	const weddingDate = new Date(2027, 6, 3, 0, 0, 0, 0);

	const updateCountdown = () => {
		const now = new Date();
		const diff = Math.ceil((weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		countdownEl.textContent = diff > 0 ? diff : 0;
	};

	updateCountdown();
	window.setInterval(updateCountdown, 60 * 1000);
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
		timelineContainer.classList.remove('is-hinting');
		timelineContainer.classList.remove('is-pulsing');
		timelineContainer.classList.remove('show-hint');
	}
};

const startTimelineOnboarding = () => {
	if (!timelineContainer || timelineHintDismissed) {
		return;
	}

	if (timelineHint) {
		timelineHint.classList.remove('is-hidden');
	}
	timelineContainer.classList.remove('is-hinting');
	timelineContainer.classList.remove('is-pulsing');
	timelineContainer.classList.add('is-hinting');
	timelineContainer.classList.add('show-hint');

	window.setTimeout(() => {
		if (timelineHintDismissed) {
			return;
		}

		timelineContainer.classList.add('is-pulsing');
	}, 1800);

	window.setTimeout(() => {
		timelineContainer.classList.remove('is-hinting');
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
	if (titleText === 'Du er invitert') {
		tlModalContent.textContent = 'Vi er heldige som har deg i livet vårt, og håper du vil være med og sette prikken over i-en på feiringen ❤️';
	} else if (titleText === 'Send RSVP') {
		tlModalContent.innerHTML = 'For å hjelpe oss med planleggingen, fyll ut <a href="https://forms.gle/placeholder" target="_blank" style="color: var(--accent); text-decoration: underline; font-weight: 600;">skjemaet</a> så snart du kan og senest før fristen.';
	} else if (titleText === 'Bestill overnatting') {
		tlModalContent.innerHTML = 'Bryllupet vil holde til på et Resort i Farsund. Resortet har holdt av rom spesifikt for våre gjester til en rabattert pris ved bestilling før fristen. Bestill via <a href="https://placeholder-link.no" target="_blank" style="color: var(--accent); text-decoration: underline; font-weight: 600;">denne bookinglenken</a> for å sikre en plass og få rabattert pris. Dere må garantere bookingen med bankkort.<br><br><span class="tl-modal__note"><strong>OBS!</strong> Dere trenger ikke velge frokost som tillegg, det er allerede i romprisen!</span>';
	} else if (titleText === 'Ankomst og bli kjent') {
		tlModalContent.innerHTML = 'Fredag er satt av til å lande, finne seg til rette på resorten og la forventningene bygge seg opp til den store dagen. Etter hvert som gjestene ankommer, møtes vi til en uformell middag på brygga og en kveld som setter tonen for resten av feiringen.<br><br><span class="tl-modal__note"><strong>DRESSCODE:</strong> Uformelt pent</span>';
	} else if (titleText === 'Vi gifter oss i Farsund') {
		tlModalContent.innerHTML = 'Lørdagen blir en dag vi har gledet oss lenge til, fylt av små og store øyeblikk fra første kaffekopp til siste dans:<br><br>• Rolig morgen med kaffekoppen ved sjøen<br>• Tur inn til sørlandsidylliske Farsund<br>• Vielse i Farsund kirke<br>• Mingling ved brygga<br>• Middag i låven<br>• Fest og feiring utover kvelden<br><br><span class="tl-modal__note"><strong>DRESSCODE:</strong> Pent bryllupsantrekk</span>';
	} else if (titleText === 'Frokost og på gjensyn') {
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
