document.documentElement.classList.remove('no-js');
document.documentElement.classList.add('js');

const invitationShell = document.querySelector('[data-invitation-shell]');
const deliverySequence = document.querySelector('[data-delivery-sequence]');
const deliveryEnvelope = document.querySelector('[data-delivery-envelope]');
const deliveryPaper = document.querySelector('[data-delivery-paper]');
const invitationContent = document.querySelector('[data-invitation-content]');
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const DELIVERY_PAPER_EXPAND_MS = 740;
const DELIVERY_ENVELOPE_FADE_DELAY_MS = 1300;
const DELIVERY_CLOSE_AFTER_EXPAND_DELAY_MS = 260;
const DELIVERY_EXIT_FADE_MS = 260;

let deliveryTimeoutIds = [];
let invitationHasRevealed = false;
let revealViewportSnapshot = null;
let latestRevealGeometry = null;

const getLiveViewportSize = () => {
	if (window.visualViewport) {
		return {
			width: window.visualViewport.width,
			height: window.visualViewport.height,
		};
	}

	return {
		width: window.innerWidth,
		height: window.innerHeight,
	};
};

const getStableViewportSize = () => {
	if (revealViewportSnapshot) {
		return revealViewportSnapshot;
	}

	return getLiveViewportSize();
};

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

	const viewport = getStableViewportSize();

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
	let paperStartWidth = (viewport.width + 4) * paperStartScaleX;
	let paperStartHeight = (viewport.height + 4) * paperStartScaleY;

	if (deliveryEnvelope) {
		const envelopeRect = deliveryEnvelope.getBoundingClientRect();
		const isMobileViewport = window.matchMedia('(max-width: 41.99rem)').matches;

		// Keep the paper shape aligned to the envelope (3:2) across all viewports.
		let desiredPaperWidth = envelopeRect.width * (isMobileViewport ? 0.82 : 1.1);
		let desiredPaperHeight = (desiredPaperWidth / 1.5) * 1.08;
		const maxPaperHeight = envelopeRect.height * 0.92;

		if (desiredPaperHeight > maxPaperHeight) {
			desiredPaperHeight = maxPaperHeight;
			desiredPaperWidth = desiredPaperHeight * 1.5;
		}

		paperStartWidth = desiredPaperWidth;
		paperStartHeight = desiredPaperHeight;
		paperStartScaleX = Math.min(1, Math.max(0.05, desiredPaperWidth / Math.max(1, viewport.width)));
		paperStartScaleY = Math.min(1, Math.max(0.05, desiredPaperHeight / Math.max(1, viewport.height)));
	}

	const originX = anchorX - invitationRect.left;
	const originY = anchorY - invitationRect.top;
	const startScaleX = Math.min(1, Math.max(0.05, paperRect.width / invitationRect.width));
	const startScaleY = Math.min(1, Math.max(0.05, paperRect.height / invitationRect.height));
	// Fit reveal to paper using an effective height so long page content does not collapse into a tiny framed thumbnail on mobile.
	const effectiveInvitationHeight = Math.min(
		invitationRect.height,
		Math.max(viewport.height * 1.08, invitationRect.width * 1.25)
	);
	const fitByWidth = paperStartWidth / invitationRect.width;
	const fitByEffectiveHeight = paperStartHeight / effectiveInvitationHeight;
	const revealFitScale = Math.min(
		0.42,
		Math.max(0.12, Math.min(fitByWidth, fitByEffectiveHeight))
	);
	const revealStartScaleX = revealFitScale;
	const revealStartScaleY = revealFitScale;
	const invitationCenterX = invitationRect.left + invitationRect.width / 2;
	const invitationCenterY = invitationRect.top + invitationRect.height / 2;
	const revealTranslateX = anchorX - invitationCenterX;
	const revealTranslateY = anchorY - invitationCenterY;

	const revealWidth = Math.max(40, paperRect.width);
	const revealHeight = Math.max(40, paperRect.height);
	const neededHalfWidth = Math.max(anchorX, viewport.width - anchorX) + 64;
	const neededHalfHeight = Math.max(anchorY, viewport.height - anchorY) + 64;
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

	const viewportWidth = viewport.width;
	const viewportHeight = viewport.height;
	const paperBaseWidth = viewportWidth + 32;
	const paperBaseHeight = viewportHeight + 32;
	const paperTargetWidth = viewportWidth + 96;
	const paperTargetHeight = viewportHeight + 96;
	const paperEndScaleX = Math.max(1, paperTargetWidth / Math.max(1, paperBaseWidth));
	const paperEndScaleY = Math.max(1, paperTargetHeight / Math.max(1, paperBaseHeight));
	revealTarget.style.setProperty('--delivery-paper-end-scale-x', `${paperEndScaleX}`);
	revealTarget.style.setProperty('--delivery-paper-end-scale-y', `${paperEndScaleY}`);

	const geometry = {
		revealStartScaleX,
		revealStartScaleY,
		revealTranslateX,
		revealTranslateY,
	};

	latestRevealGeometry = geometry;
	return geometry;
};

const settleInvitationContent = () => {
	document.body.classList.remove('is-content-visible');
	document.body.classList.add('is-invitation-settled');
	revealViewportSnapshot = null;
	latestRevealGeometry = null;
};

const startDeliveryBackgroundReveal = () => {
	if (!deliverySequence) {
		return;
	}
};

const revealInvitationContent = () => {
	if (invitationHasRevealed) {
		return;
	}

	// Geometry is prepared right before reveal; avoid recalculating here to reduce flicker risk.
	const geometry = latestRevealGeometry || updateInvitationRevealOrigin();
	if (!geometry) {
		window.requestAnimationFrame(revealInvitationContent);
		return;
	}

	invitationHasRevealed = true;
	document.body.classList.remove('is-content-visible');
	document.body.classList.remove('is-content-revealed');

	if (reduceMotionQuery.matches || !invitationContent) {
		document.body.classList.add('is-content-visible', 'is-content-revealed');
		settleInvitationContent();
		return;
	}

	const stableStartScaleX = geometry.revealStartScaleX;
	const stableStartScaleY = geometry.revealStartScaleY;
	const stableStartTranslateX = geometry.revealTranslateX;
	const stableStartTranslateY = geometry.revealTranslateY;
	const revealDurationMs = DELIVERY_PAPER_EXPAND_MS;
	let revealFinished = false;

	const finishReveal = () => {
		if (revealFinished) {
			return;
		}

		revealFinished = true;
		invitationContent.removeEventListener('transitionend', handleRevealTransitionEnd);
		invitationContent.style.transition = '';
		document.body.classList.add('is-content-revealed');
		settleInvitationContent();
	};

	const handleRevealTransitionEnd = (event) => {
		if (event.target !== invitationContent || event.propertyName !== 'transform') {
			return;
		}

		finishReveal();
	};

	invitationContent.getAnimations().forEach((anim) => anim.cancel());
	invitationContent.style.transition = 'none';
	invitationContent.style.transform = `translate(${stableStartTranslateX}px, ${stableStartTranslateY}px) scale(${stableStartScaleX}, ${stableStartScaleY})`;
	invitationContent.style.opacity = '1';
	document.body.classList.add('is-content-visible');
	invitationContent.getBoundingClientRect();
	invitationContent.addEventListener('transitionend', handleRevealTransitionEnd);

	// Double rAF ensures Safari mobile commits the start-transform to the render pipeline
	// before the transition begins, preventing a jump or snap.
	window.requestAnimationFrame(() => {
		window.requestAnimationFrame(() => {
			invitationContent.style.transition = `transform ${revealDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
			invitationContent.style.transform = 'translate(0px, 0px) scale(1, 1)';
		});
	});
	startTimelineAnimation();
	startTimelineOnboarding();

	deliveryTimeoutIds.push(
		window.setTimeout(() => {
			finishReveal();
		}, revealDurationMs + 180)
	);
};

const runDeliverySequence = () => {
	if (!deliverySequence || reduceMotionQuery.matches) {
		revealInvitationContent();
		return;
	}

	revealViewportSnapshot = getLiveViewportSize();

	const tapPrompt = document.querySelector('[data-delivery-tap-prompt]');

	document.body.classList.add('is-delivery-running');
			document.body.classList.remove('is-background-revealing', 'is-content-revealed', 'is-content-visible');
	deliverySequence.hidden = false;
	deliverySequence.classList.remove('is-exit', 'is-complete');
	deliverySequence.style.background = '';
	if (deliveryEnvelope) {
		deliveryEnvelope.classList.remove('is-fading');
	}
	latestRevealGeometry = updateInvitationRevealOrigin();
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

			// Lock paper at full viewport coverage BEFORE class changes to prevent any one-frame stripe gap
			if (deliveryPaper) {
				deliveryPaper.style.position = 'fixed';
				deliveryPaper.style.inset = '-16px';
				deliveryPaper.style.width = 'auto';
				deliveryPaper.style.height = 'auto';
				deliveryPaper.style.transform = 'none';
				deliveryPaper.style.clipPath = 'none';
				deliveryPaper.style.borderRadius = '0';
				deliveryPaper.style.opacity = '1';
				deliveryPaper.style.visibility = 'visible';
				deliveryPaper.style.animation = 'none';
			}

			deliverySequence.hidden = false;
			deliverySequence.classList.remove('is-playing', 'is-opening', 'is-paper-sliding', 'is-paper-expanding', 'is-waiting', 'is-exit');
			deliverySequence.classList.add('is-complete');
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
					latestRevealGeometry = updateInvitationRevealOrigin();
				if (invitationContent && !invitationHasRevealed) {
						const preScaleX = latestRevealGeometry ? latestRevealGeometry.revealStartScaleX : 0.2;
						const preScaleY = latestRevealGeometry ? latestRevealGeometry.revealStartScaleY : 0.2;
						const preTranslateX = latestRevealGeometry ? latestRevealGeometry.revealTranslateX : 0;
						const preTranslateY = latestRevealGeometry ? latestRevealGeometry.revealTranslateY : 0;
					invitationContent.style.transform = `translate(${preTranslateX}px, ${preTranslateY}px) scale(${preScaleX}, ${preScaleY})`;
					invitationContent.style.opacity = '0';
				}
				deliverySequence.classList.add('is-paper-expanding');
				startDeliveryBackgroundReveal();
				revealInvitationContent();
				const handlePaperExpandEnd = (endEvent) => {
					if (endEvent.animationName !== 'delivery-paper-expand') {
						return;
					}
					deliveryPaper.removeEventListener('animationend', handlePaperExpandEnd);
					revealInvitationContent();
				closeDeliverySequence();
				};
				deliveryPaper.addEventListener('animationend', handlePaperExpandEnd);
			};
			deliveryPaper.addEventListener('animationstart', handlePaperExpandStart);
		}

		// Fallback reveal
		deliveryTimeoutIds.push(
			window.setTimeout(() => {
				startDeliveryBackgroundReveal();
				revealInvitationContent();
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
		tlModalContent.innerHTML = 'Vi er heldige som har deg i livet vårt, og håper du vil være med og sette prikken over i-en på feiringen <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--accent)" aria-hidden="true" style="display:inline-block;width:1em;height:1em;vertical-align:-0.15em;flex-shrink:0"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
	} else if (titleText === 'Send RSVP') {
		tlModalContent.innerHTML = 'For å hjelpe oss med planleggingen, vennligst fyll ut <a href="https://docs.google.com/forms/d/e/1FAIpQLSd9r-k_LBBe_fsEtJyv0wgeYjwVV7h2oyjlzLnIMInHHFg-iA/viewform?usp=publish-editor" target="_blank" style="color: var(--accent); text-decoration: underline; font-weight: 600;">skjemaet</a> så snart du kan og senest før fristen.';
	} else if (titleText === 'Bestill overnatting') {
		tlModalContent.innerHTML = 'Vi feirer anledningen på Farsund Resort og gleder oss til en fantastisk helg med deg! Resortet har holdt av rom spesifikt for våre gjester til en rabattert pris ved bestilling før fristen. Bestill via <a href="https://app.mews.com/distributor/67ceb772-ed80-4e54-be12-b36000895667?mewsAvailabilityBlockId=a7580c55-5661-4769-b0f1-b3ec00d78da3&mewsStart=2027-07-02&mewsEnd=2027-07-04" target="_blank" style="color: var(--accent); text-decoration: underline; font-weight: 600;">denne bookinglenken</a> for å sikre en plass og få rabattert pris. Du må garantere bookingen med bankkort.<br><br><span class="tl-modal__note"><strong>OBS:</strong> Du trenger ikke velge frokost som tillegg, det er allerede i romprisen!</span>';
	} else if (titleText === 'Velkommen') {
		tlModalContent.innerHTML = 'Fredag er satt av til å lande, finne seg til rette på resorten og la forventningene bygge seg opp til den store dagen. Gjestene ankommer resortet utover kvelden, men vi håper så mange som mulig rekker å være på plass til middag på brygga kl 18:00. Mat bestilles i restauranten. Ankommer du senere? Ikke stress, bare kom og finn oss på brygga når du er fremme.<br><br><span class="tl-modal__facts"><span class="tl-modal__fact"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" class="tl-modal__fact-icon"><path fill="currentColor" d="M12 2c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg><span class="tl-modal__fact-value"><a href="https://www.google.com/maps/place/Farsund+Resort/@58.0835472,6.9578762,17z/data=!3m1!4b1!4m9!3m8!1s0x4637795705a3f047:0x71c8a567d02f387d!5m2!4m1!1i2!8m2!3d58.0835472!4d6.9604511!16s%2Fg%2F1tcx5ld6?entry=ttu&g_ep=EgoyMDI2MDUwNi4wIKXMDSoASAFQAw%3D%3D" target="_blank">Farsund Resort</a></span></span><span class="tl-modal__fact"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" class="tl-modal__fact-icon"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4.5 14.5 12 11l7.5 3.5a1.9 1.9 0 0 1-.8 3.6H5.3a1.9 1.9 0 0 1-.8-3.6Z"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 11V7.8"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 7.8a2.6 2.6 0 1 1 2.6-2.6"/></svg><span class="tl-modal__fact-value">Akkurat det som måtte passe deg</span></span></span>';
	} else if (titleText === 'Bryllupsdagen') {
		tlModalContent.innerHTML = 'Lørdagen blir en dag vi har gledet oss lenge til, fylt av små og store øyeblikk fra første kaffekopp til siste dans:<br><br>• 13:30 Avreise til kirka (enten med felles buss eller egen bil)<br>• 14:30 Vielse i Frelserens kirke i Farsund sentrum<br>• 15:45 Avreise tilbake til Farsund Resort<br>• 16:00 Mingling og bobler ved brygga<br>• 18:00 Velkommen til bords<br>• 22:30 Fæst heilt te sola står opp!<br><br><span class="tl-modal__facts"><span class="tl-modal__fact"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" class="tl-modal__fact-icon"><path fill="currentColor" d="M12 2c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg><span class="tl-modal__fact-value">Vielse i <a href="https://www.google.com/maps/place/Frelserens+kirke/@58.09434,6.7992019,17z/data=!3m1!4b1!4m6!3m5!1s0x463764a144f4111d:0x6caf08cb53255ad!8m2!3d58.09434!4d6.8017768!16s%2Fg%2F121tyl00?entry=ttu&g_ep=EgoyMDI2MDUwNi4wIKXMDSoASAFQAw%3D%3D" target="_blank">Frelserens kirke</a> og fest på <a href="https://www.google.com/maps/place/Farsund+Resort/@58.0835472,6.9578762,17z/data=!3m1!4b1!4m9!3m8!1s0x4637795705a3f047:0x71c8a567d02f387d!5m2!4m1!1i2!8m2!3d58.0835472!4d6.9604511!16s%2Fg%2F1tcx5ld6?entry=ttu&g_ep=EgoyMDI2MDUwNi4wIKXMDSoASAFQAw%3D%3D" target="_blank">Farsund Resort</a></span></span><span class="tl-modal__fact"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" class="tl-modal__fact-icon"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4.5 14.5 12 11l7.5 3.5a1.9 1.9 0 0 1-.8 3.6H5.3a1.9 1.9 0 0 1-.8-3.6Z"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 11V7.8"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 7.8a2.6 2.6 0 1 1 2.6-2.6"/></svg><span class="tl-modal__fact-value">Smoking/Mørk dress</span></span><span class="tl-modal__fact"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" class="tl-modal__fact-icon"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 9h16v11H4z"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 9v11"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 13h16"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 9c0-2.2-2.2-3.6-3.9-2.6-1.3.8-1.4 2.7-.2 3.6.9.6 2.2.3 3-.5m1.1-.5c0-2.2 2.2-3.6 3.9-2.6 1.3.8 1.4 2.7.2 3.6-.9.6-2.2.3-3-.5"/></svg><span class="tl-modal__fact-value">Vår største glede er å ha med deg på feiringen. Vil du gi en gave, setter vi stor pris på bidrag til bryllupsreise og overraskelser</span></span></span>';
	} else if (titleText === 'På gjensyn') {
		tlModalContent.innerHTML = 'Vi samles til frokost før det blir pakking og hjemreise. Vi er forhåpentligvis mann og kone, litt svimle av alt det fine vi har opplevd, og akkurat passe vemodige over at helgen allerede er over <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="display:inline-block;width:1em;height:1em;vertical-align:-0.15em;flex-shrink:0;color:var(--accent)"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/><path d="M8.5 14c.9 1.2 2.1 1.8 3.5 1.8S14.6 15.2 15.5 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
