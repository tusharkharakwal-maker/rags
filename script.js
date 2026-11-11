(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const config = window.PIGEON_CHAT_CONFIG || {};
  const status = document.querySelector("#reply-status");
  const retry = document.querySelector("#copy-again");
  const copyInvite = document.querySelector("#copy-invite");
  const chatPanel = document.querySelector("#chat-panel");
  const chatConnection = document.querySelector("#chat-connection");
  const chatMessages = document.querySelector("#chat-messages");
  const chatEmpty = document.querySelector("#chat-empty");
  const chatForm = document.querySelector("#chat-form");
  const chatInput = document.querySelector("#chat-input");
  const chatName = document.querySelector("#chat-name");
  const noteButton = document.querySelector("#open-note");
  const noteText = document.querySelector("#note-letter-text");
  const noteStatus = document.querySelector("#note-status");
  const noteHint = document.querySelector("#note-hint");
  const room = getRoomFromUrl();
  const senderId = getOrCreateId(`pigeon-chat-sender:${room.id}`);
  let chosenReply = "";
  let roomReady = false;
  let pollTimer = null;
  let renderedMessages = "";

  chatName.value = storageGet(`pigeon-chat-name:${room.id}`) || "You";
  chatName.addEventListener("change", () => {
    const name = chatName.value.trim().slice(0, 24) || "You";
    chatName.value = name;
    storageSet(`pigeon-chat-name:${room.id}`, name);
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

  function getRoomFromUrl() {
    const url = new URL(window.location.href);
    let roomId = url.searchParams.get("room");
    let roomToken = url.searchParams.get("chat");
    const roomPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!roomPattern.test(roomId || "") || !roomToken || roomToken.length < 40) {
      roomId = makeUuid();
      roomToken = makeToken();
      url.searchParams.set("room", roomId);
      url.searchParams.set("chat", roomToken);
      try {
        window.history.replaceState({}, "", url);
      } catch {
        // File previews may not allow changing their URL; the share link is still retained below.
      }
    }
    return { id: roomId, token: roomToken, inviteUrl: url.href };
  }

  function makeUuid() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function makeToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join("") )
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
  }

  function getOrCreateId(key) {
    let value = storageGet(key);
    if (!value) {
      value = makeUuid();
      storageSet(key, value);
    }
    return value;
  }

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Chat still works without local preferences. */ }
  }

  function isConfigured() {
    return Boolean(config.supabaseUrl && config.publishableKey);
  }

  async function apiCall(action, data = {}) {
    if (!isConfigured()) throw new Error("The shared chat needs its Supabase project settings.");
    const endpoint = `${config.supabaseUrl.replace(/\/$/, "")}/functions/v1/pigeon-chat`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.publishableKey,
        Authorization: `Bearer ${room.token}`
      },
      body: JSON.stringify({ action, roomId: room.id, ...data })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The chat service could not be reached.");
    return result;
  }

  function setConnection(message, connected = false) {
    chatConnection.textContent = message;
    chatConnection.classList.toggle("is-connected", connected);
  }

  function openChat(scrollToChat = true) {
    chatPanel.hidden = false;
    if (scrollToChat) {
      chatPanel.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
    }
  }

  function renderMessages(messages) {
    const signature = messages.map((message) => message.id).join("|");
    if (signature === renderedMessages) return;
    renderedMessages = signature;
    chatMessages.replaceChildren();
    if (!messages.length) {
      chatMessages.append(chatEmpty);
      chatEmpty.hidden = false;
      return;
    }
    chatEmpty.hidden = true;
    for (const message of messages) {
      const item = document.createElement("li");
      item.className = `chat-message-item${message.sender_id === senderId ? " is-mine" : ""}`;
      const meta = document.createElement("div");
      meta.className = "chat-message-meta";
      const name = document.createElement("span");
      name.className = "chat-message-name";
      name.textContent = message.sender_id === senderId ? "You" : message.sender_name;
      const time = document.createElement("time");
      time.className = "chat-message-time";
      time.dateTime = message.created_at;
      time.textContent = new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      meta.append(name, time);
      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";
      bubble.textContent = message.body;
      item.append(meta, bubble);
      chatMessages.append(item);
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function refreshMessages() {
    const result = await apiCall("history");
    const messages = result.messages || [];
    if (messages.some((message) => message.sender_id !== senderId) && chatPanel.hidden) openChat();
    renderMessages(messages);
    setConnection("Connected", true);
  }

  async function initializeRoom() {
    if (!isConfigured()) {
      setConnection("Shared chat setup is needed before messages can sync.");
      return;
    }
    try {
      await apiCall("init");
      roomReady = true;
      await refreshMessages();
      pollTimer = window.setInterval(() => {
        if (!document.hidden) refreshMessages().catch(() => setConnection("Reconnecting…"));
      }, 2500);
    } catch (error) {
      setConnection(error.message || "Reconnecting…");
    }
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.append(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    if (!copied) throw new Error("Clipboard unavailable");
  }

  copyInvite.addEventListener("click", async () => {
    try {
      await copyText(room.inviteUrl);
      status.textContent = "Private invitation link copied. Send that link so you both join the same chat.";
    } catch {
      status.textContent = "Copy the invitation link from your browser address bar to share this chat.";
    }
  });

  async function sendMessage(body) {
    if (!roomReady) throw new Error("The shared chat is not connected yet.");
    const name = (chatName.value.trim() || "You").slice(0, 24);
    chatName.value = name;
    storageSet(`pigeon-chat-name:${room.id}`, name);
    await apiCall("send", {
      senderId,
      senderName: name,
      body: body.trim().slice(0, 500)
    });
    await refreshMessages();
  }

  function revealChat() {
    openChat(false);
    chatPanel.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
  }

  document.querySelectorAll("[data-reply]").forEach((button) => {
    button.addEventListener("click", async () => {
      chosenReply = button.dataset.reply;
      revealChat();
      if (!roomReady) {
        try {
          await copyText(chosenReply);
          status.textContent = "Your reply was copied. Shared chat will work once its backend is connected.";
        } catch {
          status.textContent = `Your reply is ready: “${chosenReply}” Shared chat setup is still needed.`;
        }
        retry.classList.remove("dn");
        return;
      }
      button.disabled = true;
      try {
        await sendMessage(chosenReply);
        status.textContent = "Your reply has been sent in the chat.";
      } catch (error) {
        status.textContent = error.message || "Your reply could not be sent. Try again in the chat below.";
      } finally {
        button.disabled = false;
      }
    });
  });

  retry.addEventListener("click", async () => {
    if (!chosenReply) return;
    try {
      await copyText(chosenReply);
      status.textContent = `Copied: “${chosenReply}” Paste it into your message app.`;
    } catch {
      status.textContent = `Your reply is ready: “${chosenReply}” You can select and copy it.`;
    }
  });

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = chatInput.value.trim();
    if (!body) return;
    const sendButton = chatForm.querySelector("button[type='submit']");
    sendButton.disabled = true;
    try {
      await sendMessage(body);
      chatInput.value = "";
      chatInput.focus();
    } catch (error) {
      setConnection(error.message || "Message could not be sent.");
    } finally {
      sendButton.disabled = false;
    }
  });

  initializeRoom();
  window.addEventListener("pagehide", () => window.clearInterval(pollTimer));

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
