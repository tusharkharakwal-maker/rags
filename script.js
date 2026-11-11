(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const status = document.querySelector("#reply-status");
  const retry = document.querySelector("#copy-again");
  const noteButton = document.querySelector("#open-note");
  const noteText = document.querySelector("#note-letter-text");
  const noteStatus = document.querySelector("#note-status");
  const noteHint = document.querySelector("#note-hint");
  let chosenReply = "";

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

  async function copyReply(message) {
    chosenReply = message;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
      } else {
        const helper = document.createElement("textarea");
        helper.value = message;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        const copied = document.execCommand("copy");
        helper.remove();
        if (!copied) throw new Error("Clipboard unavailable");
      }
      status.textContent = `Copied: “${message}” Paste it into your message app.`;
      retry.classList.remove("dn");
    } catch (error) {
      status.textContent = `Your reply is ready: “${message}” You can copy it from here.`;
      retry.classList.remove("dn");
    }
  }

  document.querySelectorAll("[data-reply]").forEach((button) => {
    button.addEventListener("click", () => copyReply(button.dataset.reply));
  });
  retry.addEventListener("click", () => {
    if (chosenReply) copyReply(chosenReply);
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
  gsap.from(".reply-inner > *", {
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
