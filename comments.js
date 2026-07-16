(() => {
  const form = document.getElementById("comment-form");
  const list = document.getElementById("comment-list");
  const count = document.getElementById("comment-count");
  const status = document.getElementById("comment-form-status");
  const loadMore = document.getElementById("comment-load-more");
  const previewNote = document.getElementById("comment-preview-note");
  const verification = document.getElementById("comment-verification");
  const submitButton = form?.querySelector("button[type='submit']");

  if (!form || !list || !count || !status || !loadMore || !submitButton) return;

  const metaContent = (name) => document.querySelector(`meta[name="${name}"]`)?.content.trim() || "";
  const API_URL = metaContent("comment-api-url").replace(/\/+$/, "");
  const TURNSTILE_SITEKEY = metaContent("turnstile-sitekey");
  const REMOTE_MODE = /^https?:\/\//.test(API_URL) && Boolean(TURNSTILE_SITEKEY);
  const LOCAL_PREVIEW = !REMOTE_MODE && ["127.0.0.1", "localhost"].includes(window.location.hostname);
  const STORAGE_KEY = "zhenhao-comment-preview-v1";
  const VOTER_KEY = "zhenhao-comment-voter-v1";
  const PAGE_SIZE = 8;
  const MAX_MESSAGE_LENGTH = 500;
  const expandedReplies = new Set();
  const turnstileWidgets = new WeakMap();
  let comments = [];
  let visibleRootCount = PAGE_SIZE;
  let activeReplyId = null;
  let nextCursor = null;
  let rootTotal = 0;
  let turnstileLoader = null;

  function makeId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `preview-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function voterId() {
    try {
      const existing = window.localStorage.getItem(VOTER_KEY);
      if (existing) return existing;
      const created = `v_${makeId()}`;
      window.localStorage.setItem(VOTER_KEY, created);
      return created;
    } catch {
      return `v_${makeId()}`;
    }
  }

  const currentVoterId = voterId();

  function normalizeComment(value, parentId = null) {
    if (!value || typeof value !== "object") return null;
    const id = String(value.id || "");
    const author = String(value.author || "Anonymous").trim().slice(0, 40) || "Anonymous";
    const body = String(value.body || "").trim().slice(0, MAX_MESSAGE_LENGTH);
    const createdAt = Number.isNaN(Date.parse(value.createdAt)) ? new Date().toISOString() : value.createdAt;
    if (!id || !body) return null;
    return {
      id,
      parentId: value.parentId ? String(value.parentId) : parentId,
      author,
      body,
      createdAt,
      likeCount: Math.max(0, Number(value.likeCount) || 0),
      liked: Boolean(value.liked),
    };
  }

  function flattenRoots(roots) {
    return (Array.isArray(roots) ? roots : []).flatMap((rootValue) => {
      const root = normalizeComment(rootValue);
      if (!root) return [];
      const replies = (Array.isArray(rootValue.replies) ? rootValue.replies : [])
        .map((reply) => normalizeComment(reply, root.id))
        .filter(Boolean);
      return [root, ...replies];
    });
  }

  function readPreviewComments() {
    if (!LOCAL_PREVIEW) return [];
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(stored) ? stored.map((entry) => normalizeComment(entry)).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function savePreviewComments() {
    if (!LOCAL_PREVIEW) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
    } catch {
      status.textContent = "This browser could not save the local preview.";
    }
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (typeof text === "string") element.textContent = text;
    return element;
  }

  function createAction(label, className = "") {
    const button = createElement("button", `comment-action ${className}`.trim(), label);
    button.type = "button";
    return button;
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    let payload = {};
    try { payload = await response.json(); } catch { /* A plain fallback follows. */ }
    if (!response.ok) throw new Error(payload.error || "The comment service is temporarily unavailable.");
    return payload;
  }

  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (turnstileLoader) return turnstileLoader;
    turnstileLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => reject(new Error("Verification could not load. Please check your connection."));
      document.head.append(script);
    });
    return turnstileLoader;
  }

  async function mountVerification(targetForm, container, button) {
    if (!REMOTE_MODE || !container) return;
    button.disabled = true;
    const turnstile = await loadTurnstile();
    const widget = turnstile.render(container, {
      sitekey: TURNSTILE_SITEKEY,
      theme: "dark",
      size: "flexible",
      callback: () => { button.disabled = false; },
      "expired-callback": () => { button.disabled = true; },
      "error-callback": () => { button.disabled = true; },
    });
    turnstileWidgets.set(targetForm, widget);
  }

  function verificationToken(targetForm) {
    if (!REMOTE_MODE) return "local-preview";
    const widget = turnstileWidgets.get(targetForm);
    return widget === undefined ? "" : window.turnstile?.getResponse(widget) || "";
  }

  function resetVerification(targetForm) {
    const widget = turnstileWidgets.get(targetForm);
    if (widget !== undefined) window.turnstile?.reset(widget);
    targetForm.querySelector("button[type='submit']").disabled = REMOTE_MODE;
  }

  async function loadRemoteComments({ reset = false } = {}) {
    if (!REMOTE_MODE) return;
    list.setAttribute("aria-busy", "true");
    loadMore.disabled = true;
    try {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE), voterId: currentVoterId });
      if (!reset && nextCursor) query.set("cursor", nextCursor);
      const payload = await apiRequest(`/api/comments?${query}`);
      const incoming = flattenRoots(payload.comments);
      comments = reset ? incoming : [...comments, ...incoming];
      rootTotal = Math.max(0, Number(payload.total) || 0);
      nextCursor = payload.nextCursor || null;
      render();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      list.setAttribute("aria-busy", "false");
      loadMore.disabled = false;
    }
  }

  function createReplyForm(parent) {
    const replyForm = createElement("form", "comment-reply-form");
    replyForm.id = `comment-reply-form-${parent.id}`;
    replyForm.setAttribute("aria-label", `Reply to ${parent.author}`);

    const nameField = createElement("div", "comment-field");
    const nameLabel = createElement("label", "", "Name");
    const nameInput = document.createElement("input");
    const nameId = `reply-name-${parent.id}`;
    nameLabel.htmlFor = nameId;
    nameInput.id = nameId;
    nameInput.name = "name";
    nameInput.type = "text";
    nameInput.maxLength = 40;
    nameInput.autocomplete = "name";
    nameInput.placeholder = "Anonymous";
    nameField.append(nameLabel, nameInput);

    const messageField = createElement("div", "comment-field");
    const messageLabel = createElement("label", "", "Reply");
    const messageInput = document.createElement("textarea");
    const messageId = `reply-message-${parent.id}`;
    messageLabel.htmlFor = messageId;
    messageInput.id = messageId;
    messageInput.name = "message";
    messageInput.rows = 3;
    messageInput.maxLength = MAX_MESSAGE_LENGTH;
    messageInput.required = true;
    messageInput.placeholder = "Write a public reply";
    messageField.append(messageLabel, messageInput);

    const replyVerification = createElement("div", "comment-verification");
    if (!REMOTE_MODE) replyVerification.hidden = true;
    const actions = createElement("div", "comment-reply-actions");
    const submit = createAction("Post reply");
    submit.type = "submit";
    submit.disabled = REMOTE_MODE;
    const cancel = createAction("Cancel");
    cancel.addEventListener("click", () => {
      activeReplyId = null;
      render({ commentId: parent.id, className: "comment-reply-toggle" });
    });
    const replyStatus = createElement("p", "comment-form-status");
    replyStatus.setAttribute("role", "status");
    actions.append(submit, cancel);
    replyForm.append(nameField, messageField, replyVerification, actions, replyStatus);

    replyForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = messageInput.value.trim();
      if (!body || body.length > MAX_MESSAGE_LENGTH) {
        messageInput.reportValidity();
        return;
      }
      const token = verificationToken(replyForm);
      if (REMOTE_MODE && !token) {
        replyStatus.textContent = "Please complete the verification check.";
        return;
      }
      submit.disabled = true;
      replyStatus.textContent = "Posting…";
      try {
        if (REMOTE_MODE) {
          const payload = await apiRequest("/api/comments", {
            method: "POST",
            body: JSON.stringify({
              name: nameInput.value.trim().slice(0, 40),
              message: body,
              parentId: parent.id,
              website: "",
              turnstileToken: token,
            }),
          });
          expandedReplies.add(parent.id);
          activeReplyId = null;
          status.textContent = payload.published ? "Reply posted." : "Reply received and awaiting review.";
          await loadRemoteComments({ reset: true });
          return;
        }
        comments.push({
          id: makeId(),
          parentId: parent.id,
          author: nameInput.value.trim().slice(0, 40) || "Anonymous",
          body,
          createdAt: new Date().toISOString(),
          likeCount: 0,
          liked: false,
        });
        expandedReplies.add(parent.id);
        activeReplyId = null;
        savePreviewComments();
        render({ commentId: parent.id, className: "comment-replies-toggle" });
      } catch (error) {
        replyStatus.textContent = error.message;
        resetVerification(replyForm);
      } finally {
        if (!REMOTE_MODE) submit.disabled = false;
      }
    });

    window.requestAnimationFrame(() => {
      messageInput.focus();
      if (REMOTE_MODE) mountVerification(replyForm, replyVerification, submit).catch((error) => {
        replyStatus.textContent = error.message;
      });
    });
    return replyForm;
  }

  function createReplyItem(comment) {
    const item = createElement("li", "comment-reply");
    const head = createElement("div", "comment-head");
    const author = createElement("strong", "", comment.author);
    const time = createElement("time", "", formatDate(comment.createdAt));
    time.dateTime = comment.createdAt;
    const body = createElement("p", "comment-body", comment.body);
    head.append(author, time);
    item.append(head, body);
    return item;
  }

  function createCommentItem(comment) {
    const item = createElement("li", "comment-entry");
    item.dataset.commentId = comment.id;
    const article = document.createElement("article");
    const head = createElement("div", "comment-head");
    const author = createElement("strong", "", comment.author);
    const time = createElement("time", "", formatDate(comment.createdAt));
    time.dateTime = comment.createdAt;
    const body = createElement("p", "comment-body", comment.body);
    const actions = createElement("div", "comment-actions");

    const likeLabel = comment.likeCount > 0
      ? `${comment.liked ? "Liked" : "Like"} ${comment.likeCount}`
      : (comment.liked ? "Liked 1" : "Like");
    const like = createAction(likeLabel, "comment-like");
    like.setAttribute("aria-pressed", String(comment.liked));
    like.setAttribute("aria-label", `${comment.liked ? "Remove like from" : "Like"} ${comment.author}'s comment`);
    like.addEventListener("click", async () => {
      if (REMOTE_MODE) {
        like.disabled = true;
        try {
          const payload = await apiRequest(`/api/comments/${encodeURIComponent(comment.id)}/like`, {
            method: "POST",
            body: JSON.stringify({ voterId: currentVoterId, liked: !comment.liked }),
          });
          comment.liked = Boolean(payload.liked);
          comment.likeCount = Math.max(0, Number(payload.likeCount) || 0);
          render({ commentId: comment.id, className: "comment-like" });
        } catch (error) {
          status.textContent = error.message;
          like.disabled = false;
        }
        return;
      }
      comment.liked = !comment.liked;
      comment.likeCount = Math.max(0, comment.likeCount + (comment.liked ? 1 : -1));
      savePreviewComments();
      render({ commentId: comment.id, className: "comment-like" });
    });

    const reply = createAction("Reply", "comment-reply-toggle");
    reply.setAttribute("aria-expanded", String(activeReplyId === comment.id));
    reply.setAttribute("aria-controls", `comment-reply-form-${comment.id}`);
    reply.addEventListener("click", () => {
      const opening = activeReplyId !== comment.id;
      activeReplyId = opening ? comment.id : null;
      render(opening ? null : { commentId: comment.id, className: "comment-reply-toggle" });
    });
    actions.append(like, reply);

    const replies = comments
      .filter((entry) => entry.parentId === comment.id)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    if (replies.length > 0) {
      const expanded = expandedReplies.has(comment.id);
      const toggle = createAction(`${expanded ? "Hide" : "View"} ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`, "comment-replies-toggle");
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute("aria-controls", `comment-replies-${comment.id}`);
      toggle.addEventListener("click", () => {
        if (expanded) expandedReplies.delete(comment.id);
        else expandedReplies.add(comment.id);
        render({ commentId: comment.id, className: "comment-replies-toggle" });
      });
      actions.append(toggle);
    }

    head.append(author, time);
    article.append(head, body, actions);
    if (activeReplyId === comment.id) article.append(createReplyForm(comment));
    if (replies.length > 0 && expandedReplies.has(comment.id)) {
      const replyList = createElement("ol", "comment-replies");
      replyList.id = `comment-replies-${comment.id}`;
      replies.forEach((entry) => replyList.append(createReplyItem(entry)));
      article.append(replyList);
    }
    item.append(article);
    return item;
  }

  function render(focusTarget = null) {
    const roots = comments
      .filter((comment) => !comment.parentId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const visible = REMOTE_MODE ? roots : roots.slice(0, visibleRootCount);
    list.replaceChildren(...visible.map(createCommentItem));
    list.hidden = roots.length === 0;
    loadMore.hidden = REMOTE_MODE ? !nextCursor : roots.length <= visibleRootCount;
    const total = REMOTE_MODE ? rootTotal : roots.length;
    count.textContent = `${total} ${total === 1 ? "comment" : "comments"}`;
    if (focusTarget) {
      window.requestAnimationFrame(() => {
        list.querySelector(`[data-comment-id="${focusTarget.commentId}"] .${focusTarget.className}`)?.focus();
      });
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim().slice(0, 40) || "Anonymous";
    const body = form.elements.message.value.trim();
    const honeypot = form.elements.website.value;
    if (honeypot) {
      form.reset();
      status.textContent = "Comment received.";
      return;
    }
    if (!body || body.length > MAX_MESSAGE_LENGTH) {
      form.elements.message.reportValidity();
      return;
    }
    const token = verificationToken(form);
    if (REMOTE_MODE && !token) {
      status.textContent = "Please complete the verification check.";
      return;
    }
    submitButton.disabled = true;
    status.textContent = "Posting…";
    try {
      if (REMOTE_MODE) {
        const payload = await apiRequest("/api/comments", {
          method: "POST",
          body: JSON.stringify({ name, message: body, parentId: null, website: "", turnstileToken: token }),
        });
        form.reset();
        resetVerification(form);
        status.textContent = payload.published ? "Comment posted." : "Comment received and awaiting review.";
        await loadRemoteComments({ reset: true });
        return;
      }
      if (!LOCAL_PREVIEW) {
        status.textContent = "The moderated comment service is not connected yet.";
        return;
      }
      comments.push({
        id: makeId(),
        parentId: null,
        author: name,
        body,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        liked: false,
      });
      visibleRootCount = PAGE_SIZE;
      savePreviewComments();
      form.reset();
      status.textContent = "";
      render();
    } catch (error) {
      status.textContent = error.message;
      resetVerification(form);
    } finally {
      if (LOCAL_PREVIEW) submitButton.disabled = false;
    }
  });

  loadMore.addEventListener("click", () => {
    if (REMOTE_MODE) loadRemoteComments();
    else {
      visibleRootCount += PAGE_SIZE;
      render();
    }
  });

  if (REMOTE_MODE) {
    if (verification) verification.hidden = false;
    if (previewNote) previewNote.hidden = true;
    mountVerification(form, verification, submitButton).catch((error) => {
      status.textContent = error.message;
    });
    loadRemoteComments({ reset: true });
    return;
  }

  comments = readPreviewComments();
  rootTotal = comments.filter((comment) => !comment.parentId).length;
  if (LOCAL_PREVIEW) {
    submitButton.disabled = false;
    if (previewNote) previewNote.hidden = false;
  } else {
    form.querySelectorAll("input, textarea, button").forEach((control) => { control.disabled = true; });
    status.textContent = "Comments will open when the moderated service is connected.";
  }
  render();
})();
