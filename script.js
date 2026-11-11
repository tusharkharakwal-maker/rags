(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const status = document.querySelector("#reply-status");
  const noteButton = document.querySelector("#open-note");
  const noteText = document.querySelector("#note-letter-text");
  const noteStatus = document.querySelector("#note-status");
  const noteHint = document.querySelector("#note-hint");
  const secondaryReply = document.querySelector(".reply-secondary");
  let secondaryIsMoving = false;

  function dodgeSecondaryReply() {
    if (secondaryIsMoving) return;
    secondaryIsMoving = true;

    const rect = secondaryReply.getBoundingClientRect();
    secondaryReply.parentElement.style.minHeight = `${secondaryReply.parentElement.offsetHeight}px`;
    secondaryReply.classList.add("is-dodging");
    secondaryReply.style.left = `${rect.left}px`;
    secondaryReply.style.top = `${rect.top}px`;
    secondaryReply.style.pointerEvents = "none";

    const edge = 16;
    const maxX = Math.max(edge, window.innerWidth - secondaryReply.offsetWidth - edge);
    const maxY = Math.max(edge, window.innerHeight - secondaryReply.offsetHeight - edge);
    let nextX = edge;
    let nextY = edge;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      nextX = edge + Math.random() * Math.max(0, maxX - edge);
      nextY = edge + Math.random() * Math.max(0, maxY - edge);
      if (Math.hypot(nextX - rect.left, nextY - rect.top) > 120) break;
    }

    const finishMove = () => {
      secondaryReply.style.pointerEvents = "";
      secondaryIsMoving = false;
    };

    if (window.gsap && !prefersReducedMotion) {
      secondaryReply.classList.add("is-gsap-dodging");
      gsap.to(secondaryReply, {
        left: nextX,
        top: nextY,
        duration: 0.72,
        ease: "power3.out",
        overwrite: true,
        onComplete: finishMove
      });
    } else if (prefersReducedMotion) {
      secondaryReply.style.left = `${nextX}px`;
      secondaryReply.style.top = `${nextY}px`;
      finishMove();
    } else {
      requestAnimationFrame(() => {
        secondaryReply.style.left = `${nextX}px`;
        secondaryReply.style.top = `${nextY}px`;
        window.setTimeout(finishMove, 720);
      });
    }
  }

  window.addEventListener("resize", () => {
    if (!secondaryReply.classList.contains("is-dodging")) return;
    if (window.gsap) gsap.killTweensOf(secondaryReply);
    const rect = secondaryReply.getBoundingClientRect();
    const edge = 16;
    const maxX = Math.max(edge, window.innerWidth - rect.width - edge);
    const maxY = Math.max(edge, window.innerHeight - rect.height - edge);
    secondaryReply.style.left = `${Math.min(maxX, Math.max(edge, rect.left))}px`;
    secondaryReply.style.top = `${Math.min(maxY, Math.max(edge, rect.top))}px`;
    secondaryReply.style.pointerEvents = "";
    secondaryIsMoving = false;
  });

  noteButton.addEventListener("click", () => {
    const isOpen = noteButton.getAttribute("aria-expanded") !== "true";
    noteButton.setAttribute("aria-expanded", String(isOpen));
    noteButton.setAttribute("aria-label", isOpen ? "Close the note" : "Open the note");
    noteButton.classList.toggle("is-open", isOpen);
    noteButton.closest(".note-illustration").classList.toggle("note-open", isOpen);
    noteText.hidden = !isOpen;
    noteStatus.textContent = isOpen ? "The note is open." : "The note is closed.";
    noteHint.textContent = isOpen ? "tap to close" : "tap to open";
  });

  document.querySelectorAll(".reply-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (button === secondaryReply) {
        event.preventDefault();
        dodgeSecondaryReply();
        return;
      }
      const recipient = button.dataset.smsRecipient;
      status.textContent = `Opening Messages to ${recipient}.`;
      window.location.href = `sms:${recipient}`;
    });
  });

  if (prefersReducedMotion || !window.gsap || !window.ScrollTrigger) return;
  document.documentElement.classList.add("js-ready");
  gsap.registerPlugin(ScrollTrigger);

  gsap.from(".hero-copy > *", {
    y: 22,
    opacity: 0,
    duration: 0.85,
    stagger: 0.12,
    ease: "power2.out",
    delay: 0.15
  });
  gsap.from(".pigeon-hero", { x: 34, y: 15, rotation: -8, opacity: 0, duration: 1.05, ease: "power2.out", delay: 0.25 });
  gsap.to(".pigeon-hero", { y: -7, rotation: -2, duration: 2.8, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 1.3 });
  gsap.to(".wing-line", { strokeDashoffset: 0, duration: 0.9, stagger: 0.18, delay: 0.8, ease: "power1.out" });

  gsap.from(".note-copy > *", {
    scrollTrigger: { trigger: ".note-section", start: "top 70%" },
    y: 24,
    opacity: 0,
    duration: 0.75,
    stagger: 0.12,
    ease: "power2.out"
  });
  gsap.from(".envelope", {
    scrollTrigger: { trigger: ".note-section", start: "top 72%" },
    y: 35,
    rotation: -2,
    opacity: 0,
    duration: 0.9,
    ease: "back.out(1.25)"
  });
  gsap.from(".tiny-bird", {
    scrollTrigger: { trigger: ".note-section", start: "top 65%" },
    x: 45,
    y: 25,
    rotation: 18,
    opacity: 0,
    duration: 0.8,
    ease: "power2.out"
  });
  gsap.from(".ask-copy > *", {
    scrollTrigger: { trigger: ".ask-section", start: "top 68%" },
    y: 26,
    opacity: 0,
    duration: 0.8,
    stagger: 0.12,
    ease: "power2.out"
  });
  gsap.from(".pigeon-ask", {
    scrollTrigger: { trigger: ".ask-section", start: "top 70%" },
    x: -30,
    rotation: -7,
    opacity: 0,
    duration: 1,
    ease: "power2.out"
  });
  gsap.from(".reply-inner > *:not(.reply-actions)", {
    scrollTrigger: { trigger: ".reply-section", start: "top 72%" },
    y: 18,
    opacity: 0,
    duration: 0.7,
    stagger: 0.1,
    ease: "power2.out"
  });

  gsap.to(".orbit-one", {
    rotation: 0,
    scrollTrigger: { trigger: ".ask-section", start: "top bottom", end: "bottom top", scrub: 1 }
  });
})();
